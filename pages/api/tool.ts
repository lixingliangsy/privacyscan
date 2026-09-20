import type { NextApiRequest, NextApiResponse } from 'next'
import { PRODUCT } from '../../lib/product'
import { AI_QUOTAS, checkAndConsumeQuota, defaultModel, resolvePlan, chatWithFallback} from '../../lib/aiGateway'
import { getByokKey } from '../../lib/byokStore'
import { STEP_LABELS, STEP_ORDER, advance, createRun, type StepId } from '../../lib/pipeline'
import { saveRun, loadRun } from '../../lib/runStore'
import { appendAudit } from '../../lib/auditLog'
import { runDeterministicChecks } from '../../lib/rules/privacyscan'
import { validateAnalyzePayload } from '../../lib/schema'

function formatReport(state: {
  runId: string
  rulesetVersion?: string
  artifacts: Record<string, unknown>
  inputs: Record<string, string>
}) {
  const checks = state.artifacts.ruleHits as
    | { rulesetVersion: string; hits: Array<{ id: string; title: string; severity: string; remediation: string; source: string }> }
    | undefined
  const modelText = String(state.artifacts.modelText || '')
  const url = String(state.inputs.website_url || '').slice(0, 160)
  const practices = String(state.inputs.data_practices || '').slice(0, 160)
  const region = String(state.inputs.user_region || 'EU only')
  const lines: string[] = []
  lines.push(`GDPR READINESS SCAN · run ${state.runId}`)
  lines.push(`Site: ${url || '(not provided)'}`)
  lines.push(`Data practices: ${practices || '(not provided)'}`)
  lines.push(`Region: ${region}`)
  lines.push(`Ruleset: ${state.rulesetVersion || checks?.rulesetVersion || 'n/a'}`)
  lines.push('')
  lines.push('=== Rule-based findings (GDPR / ePrivacy) ===')
  const hits = checks?.hits || []
  if (!hits.length) lines.push('(none triggered — review manually)')
  else {
    for (const h of hits) {
      lines.push(`- [${h.severity}] ${h.id} ${h.title}`)
      lines.push(`  remediation: ${h.remediation}`)
    }
  }
  lines.push('')
  lines.push('=== Model-assisted audit ===')
  lines.push(modelText || '(demo / unavailable)')
  lines.push('')
  lines.push('---')
  lines.push('Sources: Rule-based checklist (privacyscan@2026-07-19) + Model-assisted audit. This is decision-support, not legal advice.')
  return lines.join('\n')
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  let inputs: Record<string, string> = {}
  try {
    const body = (req.body || {}) as {
      inputs?: Record<string, string>
      useMock?: boolean
      useByok?: boolean
      plan?: 'free' | 'pro' | 'enterprise'
      step?: StepId
      runId?: string
      action?: 'start' | 'advance' | 'status'
      agent?: string
    }
    inputs = body.inputs || {}
    const useMock = !!body.useMock
    const plan = resolvePlan(req) // trust boundary: never read body.plan
    const slug = String((PRODUCT as any).slug || 'product')
    const pipelineId = String((PRODUCT as any).pipelineId || 'pipeline-v1')
    const wantByok = plan === 'enterprise'
    const byokKey = wantByok ? getByokKey(slug) : null
    const platformKey = process.env.OPENAI_API_KEY || ''
    const apiKey = byokKey || platformKey
    const hasKey = !!apiKey
    const mockFn = typeof (PRODUCT as any).mock === 'function' ? (PRODUCT as any).mock : null

    if (body.action === 'status' && body.runId) {
      const existing = loadRun(body.runId)
      if (!existing) return res.status(404).json({ error: 'Run not found', code: 'RUN_NOT_FOUND' })
      return res.status(200).json({
        runId: existing.runId,
        step: existing.step,
        stepLabel: STEP_LABELS[existing.step],
        status: existing.status,
        artifacts: existing.artifacts,
        demo: false,
      })
    }

    // Explicit Demo only — never silent mock on failure
    if (useMock) {
      const state = createRun(inputs, pipelineId)
      const checks = runDeterministicChecks(inputs)
      state.artifacts.ruleHits = checks
      state.rulesetVersion = checks.rulesetVersion
      state.step = 'report'
      state.status = 'done'
      state.artifacts.modelText = mockFn ? String(mockFn(inputs)) : 'Demo preview'
      const result = formatReport(state)
      saveRun(state)
      appendAudit(slug, {
        ts: new Date().toISOString(),
        runId: state.runId,
        step: 'report',
        event: 'demo_complete',
        detail: 'explicit useMock',
      })
      return res.status(200).json({
        result,
        demo: true,
        mock: true,
        runId: state.runId,
        step: 'report',
        stepLabel: STEP_LABELS.report,
        steps: STEP_ORDER.map((s) => ({ id: s, label: STEP_LABELS[s] })),
        rulesetVersion: checks.rulesetVersion,
        ruleHits: checks.hits,
      })
    }

    if (!hasKey) {
      return res.status(503).json({
        error: 'AI is not configured. Add OPENAI_API_KEY or enable Demo mode.',
        code: 'AI_NOT_CONFIGURED',
        configured: false,
        degraded: true,
        demo: false,
      })
    }

    const quota = checkAndConsumeQuota(slug, plan)
    if (!quota.ok) {
      return res.status(429).json({
        error: 'Fair use limit reached. Upgrade or wait for reset.',
        code: 'QUOTA_EXCEEDED',
        degraded: true,
        demo: false,
        quota: {
          plan: quota.plan,
          daily: quota.daily,
          monthly: quota.monthly,
          dailyLimit: quota.dailyLimit,
          monthlyLimit: quota.monthlyLimit,
        },
      })
    }

    // === Vertical AI Governance Agent mode (R11 upgrade) ===
    if (body.agent && !useMock) {
      const { runGovernanceAgent } = await import('../../r11-agent/lib/agent-core')
      const agentRes = await runGovernanceAgent(inputs, {
        apiKey,
        base: process.env.OPENAI_BASE_URL || 'https://integrate.api.nvidia.com/v1',
        model: process.env.OPENAI_MODEL || defaultModel(),
        systemPrompt: (PRODUCT as any).systemPrompt,
        scope: 'gdpr',
        maxTokens: 900,
      })
      if (agentRes.status === 'failed') {
        return res.status(502).json({ error: agentRes.error || 'Agent run failed', code: 'AI_UPSTREAM_FAILED', degraded: true, demo: false })
      }
      return res.status(200).json({
        result: agentRes.report, demo: false, mock: false, source: 'Agent-assisted', agent: true,
        runId: agentRes.runId, steps: agentRes.steps, citations: agentRes.citations,
        redlineNote: agentRes.redlineNote, model: agentRes.model,
      })
    }

    let state = body.runId ? loadRun(body.runId) : null
    if (!state) {
      state = createRun(inputs, pipelineId)
    } else if (Object.keys(inputs).length) {
      state.inputs = { ...state.inputs, ...inputs }
    }

    const requested = (body.step || 'collect') as StepId
    if (!STEP_ORDER.includes(requested)) {
      return res.status(400).json({ error: 'Unknown step', code: 'INVALID_STEP' })
    }

    if (body.runId) {
      if (requested !== state.step && requested !== STEP_ORDER[STEP_ORDER.indexOf(state.step) + 1]) {
        return res.status(400).json({
          error: `Invalid step transition: ${state.step} → ${requested}`,
          code: 'INVALID_TRANSITION',
        })
      }
      if (requested !== state.step) {
        try {
          state = advance(state, requested)
        } catch (e: any) {
          return res.status(400).json({ error: e?.message || 'Invalid transition', code: 'INVALID_TRANSITION' })
        }
      }
    } else if (requested !== 'collect') {
      return res.status(400).json({
        error: 'New runs must start at collect',
        code: 'INVALID_TRANSITION',
      })
    }

    if (state.step === 'collect') {
      state.artifacts.ingestedAt = new Date().toISOString()
      state.artifacts.inputKeys = Object.keys(state.inputs)
      appendAudit(slug, {
        ts: new Date().toISOString(),
        runId: state.runId,
        step: 'collect',
        event: 'ingest_ok',
        quota: { plan: quota.plan, daily: quota.daily, monthly: quota.monthly },
      })
      state = advance(state, 'detect')
    }

    if (state.step === 'detect') {
      const checks = runDeterministicChecks(state.inputs)
      state.artifacts.ruleHits = checks
      state.rulesetVersion = checks.rulesetVersion
      appendAudit(slug, {
        ts: new Date().toISOString(),
        runId: state.runId,
        step: 'detect',
        event: 'rules_ok',
        quota: { plan: quota.plan },
      })
      state = advance(state, 'classify')
    }

    if (state.step === 'classify') {
      const inputText = (PRODUCT.inputs || [])
        .map((f: any) => `${f.label}: ${state!.inputs[f.key] || '(not provided)'}`)
        .join('\n')
      const base = process.env.OPENAI_BASE_URL || 'https://integrate.api.nvidia.com/v1'
      const model = process.env.OPENAI_MODEL || defaultModel()

          const text = await chatWithFallback(apiKey, base, [
      { role: 'system', content: PRODUCT.systemPrompt },
      { role: 'user', content: inputText },
    ], { model, temperature: 0.7, maxTokens: AI_QUOTAS[plan].maxTokens })

      if (!text.trim()) {
        state.status = 'failed'
        saveRun(state)
        return res.status(502).json({
          error: 'AI service call failed: Empty AI response',
          code: 'AI_UPSTREAM_FAILED',
          degraded: true,
          demo: false,
          runId: state.runId,
        })
      }
      state.artifacts.modelText = text
      const soft = validateAnalyzePayload({
        findings: ((state.artifacts.ruleHits as any)?.hits || []).map((h: any) => ({
          title: h.title,
          severity: h.severity,
          evidence: h.id,
          remediation: h.remediation,
          source: 'Rule-based',
        })),
        summary: text.slice(0, 400),
      })
      if (soft.ok) state.artifacts.analyze = soft.data
      appendAudit(slug, {
        ts: new Date().toISOString(),
        runId: state.runId,
        step: 'classify',
        model,
        event: 'classify_ok',
        quota: { plan: quota.plan },
      })
      state = advance(state, 'report')
    }

    if (state.step === 'report') {
      state.status = 'done'
      const result = formatReport(state)
      state.artifacts.report = result
      saveRun(state)
      appendAudit(slug, {
        ts: new Date().toISOString(),
        runId: state.runId,
        step: 'report',
        event: 'report_ok',
      })
      return res.status(200).json({
        result,
        demo: false,
        mock: false,
        source: 'Model-assisted',
        runId: state.runId,
        step: 'report',
        stepLabel: STEP_LABELS.report,
        steps: STEP_ORDER.map((s) => ({ id: s, label: STEP_LABELS[s] })),
        rulesetVersion: state.rulesetVersion,
        model: process.env.OPENAI_MODEL || defaultModel(),
      })
    }

    saveRun(state)
    return res.status(200).json({
      runId: state.runId,
      step: state.step,
      stepLabel: STEP_LABELS[state.step],
      status: state.status,
      demo: false,
    })
  } catch (e: any) {
    return res.status(502).json({
      error: 'AI service call failed: ' + (e?.message || 'unknown error'),
      code: 'AI_UPSTREAM_FAILED',
      degraded: true,
      demo: false,
    })
  }
}
