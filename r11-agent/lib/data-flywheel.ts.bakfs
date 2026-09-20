import fs from 'fs'
import path from 'path'

/**
 * R11 Data Flywheel — writeback layer for the vertical AI governance agent.
 *
 * The curated regulatory dataset (eu-ai-act / gdpr / enforcement / frameworks)
 * is a static, vetted moat. The flywheel makes it *grow* over time: each agent
 * run emits candidate signals (new enforcement actions, uncertainty flags,
 * citation gaps, user feedback). These are written back to an append-only
 * contributed store, reviewed by a human, and — once accepted — merged into the
 * retrievable index on the next cold load.
 *
 * RED LINE (aligned to guardrails G1–G5): contributed entries ALWAYS carry
 * `verify: true` and start as `pending_review`. They are NEVER silently merged
 * into the curated dataset, and NEVER presented as vetted law.
 */

export type SignalKind = 'enforcement' | 'uncertainty' | 'citation_gap' | 'correction' | 'feedback'
export type SignalStatus = 'pending_review' | 'accepted' | 'rejected'

export interface ContributedSignal {
  id: string
  runId: string
  kind: SignalKind
  scope: 'eu-ai-act' | 'gdpr' | 'enforcement' | 'frameworks'
  // enforcement-shaped
  entity?: string
  authority?: string
  year?: number
  amountEur?: number
  pattern?: string
  basis?: string
  // generic
  ref?: string
  title?: string
  text?: string
  source?: string
  note?: string
  rating?: number
  status: SignalStatus
  createdAt: string
  verify: true
}

const CONTRIB_DIR = path.join(__dirname, 'governance-data', 'contributed')
const LOG = path.join(CONTRIB_DIR, 'feedback-log.jsonl')

function ensureDir(): void {
  if (!fs.existsSync(CONTRIB_DIR)) fs.mkdirSync(CONTRIB_DIR, { recursive: true })
}

function genId(): string {
  return 'csig_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}

export function loadContributed(status?: SignalStatus): ContributedSignal[] {
  if (!fs.existsSync(LOG)) return []
  const all = fs
    .readFileSync(LOG, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l) as ContributedSignal)
  return status ? all.filter((s) => s.status === status) : all
}

export function writeback(signals: ContributedSignal[]): { written: number; path: string } {
  if (!signals.length) return { written: 0, path: LOG }
  ensureDir()
  fs.appendFileSync(LOG, signals.map((s) => JSON.stringify(s)).join('\n') + '\n')
  return { written: signals.length, path: LOG }
}

/** Human-in-the-loop state transition (the only way a signal becomes retrievable). */
export function setStatus(id: string, status: SignalStatus): boolean {
  if (!fs.existsSync(LOG)) return false
  const lines = fs.readFileSync(LOG, 'utf8').split('\n').filter(Boolean)
  let found = false
  const out = lines.map((l) => {
    const s = JSON.parse(l)
    if (s.id === id) {
      s.status = status
      found = true
    }
    return JSON.stringify(s)
  })
  fs.writeFileSync(LOG, out.join('\n') + (out.length ? '\n' : ''))
  return found
}

/**
 * Accepted contributed entries, reshaped into the GovEntry shape the index
 * retrieves. Always carries verify:true and curated:false — they are surfaced
 * as decision-support signals, never as vetted law.
 */
export function getAcceptedContributed(): Array<{
  id: string
  ref: string
  title: string
  text: string
  source: string
  scope: 'eu-ai-act' | 'gdpr' | 'enforcement' | 'frameworks'
  verify: true
  curated: false
}> {
  return loadContributed('accepted').map((s) => ({
    id: s.id,
    ref: s.ref || s.basis || s.entity || s.kind,
    title: s.title || (s.entity ? `${s.entity} (contributed)` : s.kind),
    text:
      s.text ||
      (s.entity
        ? `Contributed enforcement signal: ${s.entity}, €${((s.amountEur || 0) / 1e6).toFixed(1)}M. ${s.pattern || ''}`
        : s.note || ''),
    source: s.source || 'Contributed (pending verification)',
    scope: s.scope,
    verify: true,
    curated: false,
  }))
}

const ENF_RE =
  /([A-Z][A-Za-z0-9 .&'-]{2,40}?)\s+(?:was\s+)?(?:fined|penalized|sanctioned|issued\s+a\s+fine|imposed)\s+.*?(?:€|EUR|euro)\s?([\d.]+)\s?(M|million|k|thousand)?/i
const UNCERTAINTY_RE =
  /\b(uncertain|not certain|verify with|consult (?:a|your)|depends on|open (?:question|issue)|cannot (?:determine|confirm)|out of scope)\b/i
const REF_RE =
  /\b(Art\.?\s*\d+|Cl\.?\s*\d+|Annex\s*[IVX]+|NIST\s*[\w.-]+|ISO\s*[\w.-]+|GDPR\s*Art\.?\s*\d+|Rec\.?\s*\d+)\b/gi

export interface RunSignalInput {
  runId: string
  query: string
  modelText?: string
  citations?: Array<{ ref: string; title: string }>
  rating?: number
}

/**
 * Heuristically extract candidate signals from a completed agent run.
 * Best-effort and side-effect free — callers must not depend on it throwing.
 */
export function captureRunSignals(run: RunSignalInput): ContributedSignal[] {
  const out: ContributedSignal[] = []
  const hay = `${run.query} ${run.modelText || ''}`

  const m = ENF_RE.exec(hay)
  if (m) {
    const num = parseFloat(m[2])
    const mult = /m|million/i.test(m[3] || '') ? 1e6 : /k|thousand/i.test(m[3] || '') ? 1e3 : 1
    out.push({
      id: genId(),
      runId: run.runId,
      kind: 'enforcement',
      scope: 'enforcement',
      entity: m[1].trim(),
      amountEur: num * mult,
      year: new Date().getFullYear(),
      pattern: 'auto-extracted from agent run; PENDING human verification',
      basis: 'pending',
      status: 'pending_review',
      createdAt: new Date().toISOString(),
      verify: true,
    })
  }

  if (run.modelText && UNCERTAINTY_RE.test(run.modelText)) {
    out.push({
      id: genId(),
      runId: run.runId,
      kind: 'uncertainty',
      scope: 'frameworks',
      title: 'Open uncertainty flagged in run',
      text: 'Model output contained unresolved compliance uncertainty requiring qualified-counsel confirmation.',
      source: 'agent-run',
      status: 'pending_review',
      createdAt: new Date().toISOString(),
      verify: true,
    })
  }

  // citation gap: refs the model cited but that are absent from the curated dataset
  if (run.modelText && run.citations && run.citations.length) {
    const known = new Set(run.citations.map((c) => c.ref.toLowerCase()))
    const cited = (run.modelText.match(REF_RE) || []).map((r) => r.toLowerCase())
    const gaps = Array.from(new Set(cited.filter((r) => !known.has(r))))
    if (gaps.length) {
      out.push({
        id: genId(),
        runId: run.runId,
        kind: 'citation_gap',
        scope: 'frameworks',
        ref: gaps[0],
        title: `Citation gap: ${gaps[0]}`,
        text: `Model cited ${gaps.join(', ')} not present in curated dataset; verify against primary law before accepting.`,
        source: 'agent-run',
        status: 'pending_review',
        createdAt: new Date().toISOString(),
        verify: true,
      })
    }
  }

  if (typeof run.rating === 'number') {
    out.push({
      id: genId(),
      runId: run.runId,
      kind: 'feedback',
      scope: 'frameworks',
      rating: run.rating,
      status: 'pending_review',
      createdAt: new Date().toISOString(),
      verify: true,
    })
  }

  return out
}
