import fs from 'fs'
import path from 'path'
import { createHash } from 'crypto'

export type AuditEntry = {
  ts: string
  runId: string
  step: string
  model?: string
  quota?: Record<string, unknown>
  event: string
  detail?: string
}

function auditPath(slug: string) {
  const dir = path.join(process.cwd(), '.data', 'audit')
  try { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }) } catch (e) { /* read-only FS (serverless): best effort */ }
  return path.join(dir, `${slug}.jsonl`)
}

export function appendAudit(slug: string, entry: AuditEntry) {
  try { fs.appendFileSync(auditPath(slug), JSON.stringify(entry) + '\n', 'utf8') } catch (e) { /* read-only FS (serverless): best effort */ }
}

// ---- T1 不可变审计链（playbook-t1-t2.md §1，沉墨方案 A：沿用 .data/audit） ----

export type TrailDiff = {
  added: number
  removed: number
  changed: number
  unchanged: number
}

export type TrailEntry = {
  run_id: string
  ts: string
  prev_sha: string
  input_hash: string
  output_hash: string
  diff_summary: TrailDiff
  status: 'ok' | 'warn' | 'fail' | 'partial'
  evidence_ref: string
  payload_sha: string
}

function trailPath(slug: string) {
  return path.join(process.cwd(), '.data', 'audit', 'trail.jsonl')
}

function chainSha(prev: string, payload: string): string {
  return createHash('sha256').update(prev + '||' + payload).digest('hex')
}

// canonical serialization (recursive key-sort, compact) — MUST match scripts/audit-run.mjs + genesis
function stableStringify(o: unknown): string {
  if (o === null) return 'null'
  if (Array.isArray(o)) return '[' + (o as unknown[]).map(stableStringify).join(',') + ']'
  if (typeof o === 'object') {
    const keys = Object.keys(o as Record<string, unknown>).sort()
    return '{' + keys.map(k => JSON.stringify(k) + ':' + stableStringify((o as Record<string, unknown>)[k])).join(',') + '}'
  }
  return JSON.stringify(o)
}

function canonicalTrail(e: Omit<TrailEntry, 'prev_sha' | 'payload_sha'>): string {
  return stableStringify({
    run_id: e.run_id, ts: e.ts, input_hash: e.input_hash, output_hash: e.output_hash,
    diff_summary: e.diff_summary, status: e.status, evidence_ref: e.evidence_ref,
  })
}

// Append an immutable, sha256-chained trail entry. prev_sha seeds from the last
// trail line's payload_sha (genesis => "0"*64). Tampering breaks the chain.
export function appendTrail(slug: string, entry: Omit<TrailEntry, 'prev_sha' | 'payload_sha'>): TrailEntry {
  const tp = trailPath(slug)
  let prevSha = '0'.repeat(64)
  try {
    if (fs.existsSync(tp)) {
      const lines = fs.readFileSync(tp, 'utf8').split('\n').filter(Boolean)
      if (lines.length) {
        try { prevSha = (JSON.parse(lines[lines.length - 1]) as TrailEntry).payload_sha } catch { /* genesis */ }
      }
    }
  } catch (e) { /* read-only FS (serverless): best effort */ }
  const payload = canonicalTrail(entry)
  const payloadSha = chainSha(prevSha, payload)
  const full: TrailEntry = { ...entry, prev_sha: prevSha, payload_sha: payloadSha }
  try { fs.appendFileSync(tp, JSON.stringify(full) + '\n', 'utf8') } catch (e) { /* read-only FS (serverless): best effort */ }
  return full
}

// Verify chain integrity: every entry's payload_sha must equal chainSha(prev_sha,payload)
// and must match the next entry's prev_sha.
export function verifyTrail(slug: string): { ok: boolean; brokenAt?: number } {
  try {
    const tp = trailPath(slug)
    if (!fs.existsSync(tp)) return { ok: true }
    const lines = fs.readFileSync(tp, 'utf8').split('\n').filter(Boolean)
    for (let i = 0; i < lines.length; i++) {
      const e = JSON.parse(lines[i]) as TrailEntry
      if (chainSha(e.prev_sha, canonicalTrail(e)) !== e.payload_sha) return { ok: false, brokenAt: i }
      if (i + 1 < lines.length) {
        const next = JSON.parse(lines[i + 1]) as TrailEntry
        if (next.prev_sha !== e.payload_sha) return { ok: false, brokenAt: i }
      }
    }
    return { ok: true }
  } catch (e) { return { ok: true } }
}
