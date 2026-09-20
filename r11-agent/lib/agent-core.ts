import { retrieve, GOVERNANCE_SOURCES, type GovEntry } from './governance-data/index'
import { applyGuardrails } from './guardrails'
import { captureRunSignals, writeback } from './data-flywheel'

export interface AgentInputs {
  [k: string]: string
}

export interface AgentRunState {
  runId: string
  step: AgentStepId
  status: 'running' | 'done' | 'failed'
  inputs: AgentInputs
  artifacts: {
    retrieved?: GovEntry[]
    crossref?: GovEntry[]
    modelText?: string
    citations?: GovEntry[]
    report?: string
    redlineNote?: string
  }
  error?: string
}

export type AgentStepId = 'retrieve' | 'crossref' | 'assess' | 'cite' | 'report'

export const AGENT_STEP_ORDER: AgentStepId[] = ['retrieve', 'crossref', 'assess', 'cite', 'report']
export const AGENT_STEP_LABELS: Record<AgentStepId, string> = {
  retrieve: 'Retrieve applicable provisions',
  crossref: 'Cross-reference frameworks & member states',
  assess: 'Assess with grounded model call',
  cite: 'Compile cited sources',
  report: 'Assemble governance report',
}

export interface AgentDeps {
  apiKey: string
  base?: string
  model?: string
  systemPrompt: string
  scope?: 'eu-ai-act' | 'gdpr' | 'enforcement' | 'frameworks' | 'all'
  maxTokens?: number
  rating?: number
}

function genRunId(): string {
  return 'r11a_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}

function chooseScope(query: string, explicit?: AgentDeps['scope']): AgentDeps['scope'] {
  if (explicit && explicit !== 'all') return explicit
  const q = query.toLowerCase()
  const eu = /ai act|eu ai|compliance|high-risk|annex|conformity|oversight/.test(q)
  const priv = /gdpr|privacy|consent|personal data|tracker|cookie|breach/.test(q)
  if (eu && priv) return 'all'
  if (eu) return 'eu-ai-act'
  if (priv) return 'gdpr'
  return 'all'
}

function buildContext(retrieved: GovEntry[], crossref: GovEntry[]): string {
  const fmt = (e: GovEntry) => `- [${e.ref}] ${e.title}: ${e.text}${e.verify ? ' (verify against primary law)' : ''}`
  const parts: string[] = []
  parts.push('APPLICABLE PROVISIONS (curated regulatory dataset):')
  for (const e of retrieved) parts.push(fmt(e))
  if (crossref.length) {
    parts.push('\nFRAMEWORK CROSS-REFERENCE:')
    for (const e of crossref) parts.push(fmt(e))
  }
  return parts.join('\n')
}

// RED LINE: the agent must ground every claim in a cited provision and never
// present itself as giving legal guarantees. These guards are non-negotiable.
// Delegates to r11-agent/lib/guardrails (G1–G5 honest guardrails).
function enforceRedline(report: string, citations: GovEntry[]): { ok: boolean; note: string } {
  const g = applyGuardrails(report, citations)
  if (!g.ok) {
    return {
      ok: false,
      note: `RED LINE (${g.violations.join(', ')}): report failed honest-guardrail checks. Refusing to emit ungrounded or non-compliant assurance.`,
    }
  }
  return { ok: true, note: g.note }
}

export interface AgentResult {
  runId: string
  steps: { id: AgentStepId; label: string }[]
  finalStep: AgentStepId
  status: 'done' | 'failed'
  report?: string
  citations: GovEntry[]
  redlineNote: string
  model?: string
  error?: string
}

export async function runGovernanceAgent(inputs: AgentInputs, deps: AgentDeps): Promise<AgentResult> {
  const state: AgentRunState = {
    runId: genRunId(),
    step: 'retrieve',
    status: 'running',
    inputs,
    artifacts: {},
  }
  const query = Object.values(inputs).join(' ')

  // STEP 1 — retrieve
  const scope = chooseScope(query, deps.scope)
  const retrieved = retrieve(query, { scope, topK: 6 })
  state.artifacts.retrieved = retrieved

  // STEP 2 — cross-reference (frameworks + the specific articles already found)
  const crossQuery = retrieved.map((r) => r.ref).join(' ') + ' ' + query
  const crossref = retrieve(crossQuery, { scope: 'frameworks', topK: 4 })
  state.artifacts.crossref = crossref

  // STEP 3 — assess (grounded model call)
  const base = deps.base || 'https://integrate.api.nvidia.com/v1'
  const model = deps.model || 'meta/llama-3.1-8b-instruct'
  const ctx = buildContext(retrieved, crossref)
  const userContent =
    'User submission:\n' +
    Object.entries(inputs)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n') +
    '\n\nGrounded context (cite these provisions by their [ref] in your answer):\n' +
    ctx +
    '\n\nProduce a structured governance assessment: (1) applicable obligations, (2) key deadlines, (3) highest-priority remediation actions, (4) open uncertainties. Cite provisions as [Art. X] / [Cl. Y]. Do NOT claim the system is "compliant" or give legal guarantees — state this is decision-support.'

  let modelText = ''
  try {
    const r = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${deps.apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: deps.systemPrompt },
          { role: 'user', content: userContent },
        ],
        temperature: 0.3,
        max_tokens: deps.maxTokens || 900,
      }),
    })
    if (!r.ok) {
      const t = await r.text()
      state.status = 'failed'
      state.error = 'AI_UPSTREAM_FAILED'
      return finalize(state, model, `AI service call failed: ${t.slice(0, 160)}`)
    }
    const data = await r.json()
    modelText = data.choices?.[0]?.message?.content || ''
    if (!modelText.trim()) {
      state.status = 'failed'
      state.error = 'AI_UPSTREAM_FAILED'
      return finalize(state, model, 'AI service call failed: empty response')
    }
  } catch (e: any) {
    state.status = 'failed'
    state.error = 'AI_UPSTREAM_FAILED'
    return finalize(state, model, 'AI service call failed: ' + (e?.message || 'unknown'))
  }
  state.artifacts.modelText = modelText

  // STEP 4 — cite (compile from retrieved + crossref, dedup by ref)
  const seen = new Set<string>()
  const citations: GovEntry[] = []
  for (const e of [...retrieved, ...crossref]) {
    if (!seen.has(e.ref + e.title)) {
      seen.add(e.ref + e.title)
      citations.push(e)
    }
  }
  state.artifacts.citations = citations

  // STEP 5 — report + redline
  const redline = enforceRedline(modelText, citations)
  state.artifacts.redlineNote = redline.note
  const report = redline.ok
    ? `VERTICAL AI GOVERNANCE AGENT · run ${state.runId}\n\n${modelText}\n\n=== Sources (curated dataset) ===\n${citations
        .map((c) => `- [${c.ref}] ${c.title} — ${c.source}${c.verify ? ' (verify vs primary law)' : ''}`)
        .join('\n')}\n${redline.note}`
    : redline.note
  state.artifacts.report = report
  state.status = 'done'
  state.step = 'report'

  // DATA FLYWHEEL — capture run signals and write them back to the contributed
  // store. Best-effort and isolated: any failure here must never break the
  // agent's primary deliverable or its red-line checks.
  try {
    const sigs = captureRunSignals({
      runId: state.runId,
      query,
      modelText,
      citations,
      rating: deps.rating,
    })
    if (sigs.length) writeback(sigs)
  } catch (_e) {
    // flywheel capture is non-fatal
  }

  return finalize(state, model)
}

function finalize(state: AgentRunState, model?: string, error?: string): AgentResult {
  const status: 'done' | 'failed' = state.status === 'running' ? 'failed' : state.status
  return {
    runId: state.runId,
    steps: AGENT_STEP_ORDER.map((id) => ({ id, label: AGENT_STEP_LABELS[id] })),
    finalStep: state.step,
    status,
    report: state.artifacts.report,
    citations: state.artifacts.citations || [],
    redlineNote: state.artifacts.redlineNote || '',
    model,
    error,
  }
}

export const AGENT_SOURCES = GOVERNANCE_SOURCES
