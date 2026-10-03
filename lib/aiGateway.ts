/**
 * Platform-paid LLM with Fair Use quotas (cost control).
 * - Default model: gpt-4o-mini (cheap)
 * - Soft/hard monthly + daily caps per product slug
 * - On exceed: caller should degrade to mock (ChatGPT-style)
 *
 * Trust boundary: plan is NEVER taken from client body/headers alone.
 * Elevation only via AI_PLAN_OVERRIDE (server env) or signed x-ai-entitlement.
 */
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

export type AiPlan = 'free' | 'pro' | 'enterprise'

export const AI_QUOTAS: Record<AiPlan, { daily: number; monthly: number; maxTokens: number }> = {
  free: { daily: 10, monthly: 50, maxTokens: 600 },
  pro: { daily: 40, monthly: 300, maxTokens: 1000 },
  enterprise: { daily: 200, monthly: 3000, maxTokens: 1500 },
}

type UsageFile = {
  monthKey: string
  dayKey: string
  monthly: number
  daily: number
}

function usagePath(slug: string): string {
  const dir = path.join(process.cwd(), '.data')
  try { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }) } catch (e) { /* read-only FS (serverless): best effort */ }
  return path.join(dir, `ai-usage-${slug}.json`)
}

function keys() {
  const now = new Date()
  const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
  const dayKey = `${monthKey}-${String(now.getUTCDate()).padStart(2, '0')}`
  return { monthKey, dayKey }
}

function load(slug: string): UsageFile {
  const { monthKey, dayKey } = keys()
  const p = usagePath(slug)
  try {
    const raw = JSON.parse(fs.readFileSync(p, 'utf8')) as UsageFile
    if (raw.monthKey !== monthKey) return { monthKey, dayKey, monthly: 0, daily: 0 }
    if (raw.dayKey !== dayKey) return { monthKey, dayKey, monthly: raw.monthly, daily: 0 }
    return raw
  } catch {
    return { monthKey, dayKey, monthly: 0, daily: 0 }
  }
}

function save(slug: string, u: UsageFile) {
  try { fs.writeFileSync(usagePath(slug), JSON.stringify(u), 'utf8') } catch (e) { /* read-only FS (serverless): best effort */ }
}

function parsePlan(raw: string): AiPlan | null {
  const v = raw.toLowerCase().trim()
  if (v === 'free' || v === 'pro' || v === 'enterprise') return v
  return null
}

/**
 * Optional signed entitlement: header `x-ai-entitlement` = `plan:expMs:hexHmac`
 * HMAC-SHA256(secret, `${plan}:${expMs}`) where secret = AI_ENTITLEMENT_SECRET.
 * Client cannot forge without the server secret.
 */
function verifySignedEntitlement(
  req?: { headers?: Record<string, string | string[] | undefined>; cookies?: Record<string, string | undefined> }
): AiPlan | null {
  const secret = process.env.AI_ENTITLEMENT_SECRET
  if (!secret || !req) return null
  let raw = ''
  if (req.headers) {
    const h = req.headers
    const rawVal = h['x-ai-entitlement'] ?? h['X-Ai-Entitlement']
    raw = String(Array.isArray(rawVal) ? rawVal[0] : rawVal || '')
  }
  // owner-unlock 签发的签名 cookie（浏览器会话），与 x-ai-entitlement 头二选一
  if (!raw && req.cookies) {
    raw = String(req.cookies['ai_entitlement'] || '')
  }
  const parts = raw.split(':')
  if (parts.length !== 3) return null
  const [planRaw, expStr, sig] = parts as [string, string, string]
  const plan = parsePlan(planRaw)
  if (!plan) return null
  const exp = Number(expStr)
  if (!Number.isFinite(exp) || Date.now() > exp) return null
  const payload = `${plan}:${expStr}`
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex')
  try {
    const a = Buffer.from(expected, 'utf8')
    const b = Buffer.from(String(sig), 'utf8')
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
  } catch {
    return null
  }
  return plan
}

/**
 * Resolve Fair Use plan from server-trusted sources only.
 * - Does NOT read body.plan
 * - Does NOT trust bare x-ai-plan (client-spoofable)
 * - Default: free (conservative until session/billing exists)
 */
export function resolvePlan(req?: { headers?: Record<string, string | string[] | undefined> }): AiPlan {
  const envPlan = parsePlan(String(process.env.AI_PLAN_OVERRIDE || ''))
  if (envPlan) return envPlan
  const signed = verifySignedEntitlement(req)
  if (signed) return signed
  return 'free'
}

export type QuotaCheck = {
  ok: boolean
  plan: AiPlan
  daily: number
  monthly: number
  dailyLimit: number
  monthlyLimit: number
  maxTokens: number
  reason?: string
}

/** Returns ok=false when fair-use quota exceeded (degrade to mock). */
export function checkAndConsumeQuota(slug: string, plan: AiPlan = 'free'): QuotaCheck {
  const q = AI_QUOTAS[plan] || AI_QUOTAS.free
  const u = load(slug)
  if (u.daily >= q.daily) {
    return {
      ok: false,
      plan,
      daily: u.daily,
      monthly: u.monthly,
      dailyLimit: q.daily,
      monthlyLimit: q.monthly,
      maxTokens: q.maxTokens,
      reason: 'daily_fair_use_exceeded',
    }
  }
  if (u.monthly >= q.monthly) {
    return {
      ok: false,
      plan,
      daily: u.daily,
      monthly: u.monthly,
      dailyLimit: q.daily,
      monthlyLimit: q.monthly,
      maxTokens: q.maxTokens,
      reason: 'monthly_fair_use_exceeded',
    }
  }
  u.daily += 1
  u.monthly += 1
  save(slug, u)
  return {
    ok: true,
    plan,
    daily: u.daily,
    monthly: u.monthly,
    dailyLimit: q.daily,
    monthlyLimit: q.monthly,
    maxTokens: q.maxTokens,
  }
}

export function defaultModel(): string {
  return process.env.OPENAI_MODEL || 'gpt-4o-mini'
}


// ---- model fallback (P0, 2026-09-18) ----
// Primary model (OPENAI_MODEL) with automatic fail-over to BACKUP_MODEL on
// 5xx / 429 / network error / empty completion. 4xx (bad request / auth) fails fast.
// Does NOT depend on defaultModel() so it compiles in every product's aiGateway.
export const BACKUP_MODEL = process.env.OPENAI_MODEL_FALLBACK || 'llama-3.1-8b-instant'

// ---- multi-provider fallback (MULTI_PROVIDER_v1, 2026-09-21) ----
// Set LLM_PROVIDERS='[{"base":"https://api.siliconflow.cn/v1","key":"sk-..","model":"Qwen/Qwen3-8B"}, ...]'
// to spread load across vendors. Providers are tried in order BEFORE the legacy
// NVIDIA path; 429 / 5xx / network error / empty completion -> next provider.
// 4xx (bad request / auth) still fails fast. Unset LLM_PROVIDERS = unchanged behaviour.
export type LlmProvider = { base: string; key?: string; keyEnv?: string; model: string }

function llmPoolFromEnv(): LlmProvider[] {
  const raw = process.env.LLM_PROVIDERS
  if (!raw) return []
  try {
    const arr = JSON.parse(raw) as LlmProvider[]
    if (!Array.isArray(arr)) return []
    return arr
      .filter((p): p is LlmProvider => !!p && !!p.base && !!p.model)
      .map((p) => {
        const resolvedKey = p.key || (p.keyEnv ? (process.env[p.keyEnv] || '') : '')
        return { base: p.base, key: resolvedKey, model: p.model }
      })
      .filter((p) => !!p.key)
  } catch (e) {
    return []
  }
}

export async function chatWithFallback(
  apiKey: string,
  base: string,
  messages: { role: string; content: string }[],
  opts: { model?: string; temperature?: number; maxTokens?: number; backupModel?: string } = {},
): Promise<string> {
  const primary = opts.model || process.env.OPENAI_MODEL || 'llama-3.3-70b-versatile'
  const backup = opts.backupModel || BACKUP_MODEL
  const legacyKey = apiKey || process.env.OPENAI_API_KEY || ''
  const legacyBase = base || process.env.OPENAI_BASE_URL || 'https://api.groq.com/openai/v1'
  const legacy: LlmProvider[] = legacyKey
    ? [
        { base: legacyBase, key: legacyKey, model: primary },
        { base: legacyBase, key: legacyKey, model: backup },
      ]
    : []
  const pool = llmPoolFromEnv()
  const order: LlmProvider[] = pool.length ? pool.concat(legacy) : legacy
  if (!order.length) throw new Error('No LLM provider configured')
  let lastErr = 'unknown'
  for (let i = 0; i < order.length; i++) {
    const p = order[i]
    try {
      const r = await fetch(`${p.base}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${p.key}` },
        body: JSON.stringify({
          model: p.model,
          messages,
          temperature: opts.temperature ?? 0.7,
          max_tokens: opts.maxTokens ?? 1000,
        }),
      })
      if (!r.ok) {
        const t = await r.text().catch(() => '')
        if (r.status >= 500 || r.status === 429) {
          lastErr = `provider ${p.base} model ${p.model} HTTP ${r.status}`
          if (i < order.length - 1) continue
          throw new Error('AI request failed: ' + lastErr.slice(0, 160))
        }
        throw new Error('AI request failed: ' + t.slice(0, 160))
      }
      const data = await r.json()
      const text = data?.choices?.[0]?.message?.content || ''
      if (!text.trim()) {
        lastErr = `provider ${p.base} model ${p.model} empty response`
        if (i < order.length - 1) continue
        throw new Error('Empty AI response')
      }
      return text
    } catch (e: any) {
      if (i >= order.length - 1) throw new Error('AI service call failed: ' + (e?.message || lastErr))
      lastErr = e?.message || lastErr
      continue
    }
  }
  throw new Error('AI service call failed: ' + lastErr)
}
