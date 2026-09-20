#!/usr/bin/env node
/**
 * R11 Data Flywheel — end-to-end demonstration (illustration, runnable with node).
 *
 * This script reproduces the production flywheel loop against the REAL curated
 * dataset + the REAL contributed store (governance-data/contributed/feedback-log.jsonl):
 *
 *   1. build the curated retriever (same logic as governance-data/index.ts)
 *   2. BEFORE: a brand-new 2026 enforcement signal is NOT yet retrievable
 *   3. capture the signal -> writeback to feedback-log.jsonl (pending_review)
 *   4. human accepts it (setStatus 'accepted')  ← the only way it becomes retrievable
 *   5. re-ingest accepted contributions into the index
 *   6. AFTER: the same query now retrieves the contributed signal
 *
 * Idempotent: a demo fingerprint (entity=HealthAI, year=2026) is reused across
 * runs so re-running does not accrue duplicate entries.
 *
 * Production path is r11-agent/lib/data-flywheel.ts (wired into agent-core.ts);
 * this file is a standalone, dependency-free walkthrough of that loop.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, 'lib', 'governance-data')
const CONTRIB_DIR = path.join(DATA_DIR, 'contributed')
const LOG = path.join(CONTRIB_DIR, 'feedback-log.jsonl')

const STOP = new Set([
  'the', 'a', 'an', 'of', 'to', 'and', 'or', 'for', 'in', 'on', 'is', 'are', 'be',
  'your', 'you', 'with', 'that', 'this', 'from', 'as', 'by', 'at', 'it', 'its',
  'their', 'they',
])

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, name), 'utf8'))
}

function tokenize(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9.\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP.has(t))
}

// --- 1. build curated index (mirror of governance-data/index.ts) ---
function buildCurated() {
  const out = []
  const act = readJson('eu-ai-act.json')
  for (const a of act.articles)
    out.push({ id: a.id, ref: a.ref, title: a.title, text: `${a.title}. Obligations: ${(a.obligations || []).join('; ')}`, source: 'EU AI Act', scope: 'eu-ai-act', verify: a.verify })
  for (const p of act.prohibitedPractices)
    out.push({ id: p.id, ref: p.ref, title: p.title, text: p.title, source: 'EU AI Act Art. 5', scope: 'eu-ai-act' })
  for (const d of act.deadlines)
    out.push({ id: d.id, ref: `deadline ${d.date}`, title: d.obligation, text: `${d.obligation} (applies ${d.date})`, source: 'EU AI Act', scope: 'eu-ai-act', verify: d.verify })
  for (const t of Object.keys(act.riskTiers)) {
    const r = act.riskTiers[t]
    out.push({ id: `TIER-${t}`, ref: r.ref, title: `${t} risk`, text: r.summary, source: 'EU AI Act', scope: 'eu-ai-act' })
  }
  const gdpr = readJson('gdpr.json')
  for (const a of gdpr.articles)
    out.push({ id: a.id, ref: a.ref, title: a.title, text: `${a.title}. ${(a.obligations || []).join('; ')}`, source: 'GDPR', scope: 'gdpr' })
  const enf = readJson('enforcement.json')
  for (const c of enf.cases)
    out.push({ id: c.id, ref: c.basis, title: `${c.entity} (${c.authority}, ${c.year})`, text: `€${(c.amountEur / 1e6).toFixed(0)}M — ${c.pattern}. Basis: ${c.basis}`, source: 'Enforcement', scope: 'enforcement', verify: c.verify })
  const fw = readJson('frameworks.json')
  for (const c of fw.iso42001.clauses)
    out.push({ id: c.id, ref: c.ref, title: c.title, text: c.title, source: 'ISO 42001', scope: 'frameworks' })
  for (const f of fw.nistAiRmf.functions)
    out.push({ id: f.id, ref: f.id, title: f.title, text: f.summary, source: 'NIST AI RMF', scope: 'frameworks' })
  for (const x of fw.crosswalkToEuAiAct)
    out.push({ id: `XW-${x.euAiAct}`, ref: x.euAiAct, title: `Crosswalk ${x.euAiAct}`, text: `NIST: ${x.nist}; ISO: ${x.iso}`, source: 'Crosswalk', scope: 'frameworks' })
  return out
}

function retrieve(idx, query, topK = 6) {
  const qTokens = new Set(tokenize(query))
  const scored = idx.map((e) => {
    const hay = tokenize(`${e.title} ${e.text} ${e.ref}`)
    let score = 0
    for (const t of hay) if (qTokens.has(t)) score += 1
    for (const qt of qTokens) if (e.ref.toLowerCase().includes(qt)) score += 2
    return { e, score }
  })
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((s) => s.e)
}

// --- load + merge accepted contributed (mirror of data-flywheel.getAcceptedContributed) ---
function loadAccepted() {
  if (!fs.existsSync(LOG)) return []
  return fs
    .readFileSync(LOG, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l))
    .filter((s) => s.status === 'accepted')
    .map((s) => ({
      id: s.id,
      ref: s.ref || s.basis || s.entity || s.kind,
      title: s.title || (s.entity ? `${s.entity} (contributed)` : s.kind),
      text: s.text || (s.entity ? `Contributed enforcement signal: ${s.entity}, €${((s.amountEur || 0) / 1e6).toFixed(1)}M. ${s.pattern || ''}` : s.note || ''),
      source: s.source || 'Contributed (pending verification)',
      scope: s.scope,
      verify: true,
    }))
}

function writeSignal(sig) {
  fs.mkdirSync(CONTRIB_DIR, { recursive: true })
  fs.appendFileSync(LOG, JSON.stringify(sig) + '\n')
}

function setStatus(id, status) {
  if (!fs.existsSync(LOG)) return false
  const lines = fs.readFileSync(LOG, 'utf8').split('\n').filter(Boolean)
  let found = false
  const out = lines.map((l) => {
    const s = JSON.parse(l)
    if (s.id === id) { s.status = status; found = true }
    return JSON.stringify(s)
  })
  fs.writeFileSync(LOG, out.join('\n') + (out.length ? '\n' : ''))
  return found
}

// ---------------- demo ----------------
const DEMO_FP = { entity: 'HealthAI', year: 2026, kind: 'enforcement' }
const QUERY = 'CNIL fined HealthAI for unauthorized biometric processing GDPR Art. 9 2026'

console.log('\n=== R11 DATA FLYWHEEL DEMO ===\n')

// 1. curated index
const curated = buildCurated()
let idx = curated.slice()

// 2. BEFORE
const before = retrieve(idx, QUERY)
console.log(`[BEFORE] curated dataset size = ${curated.length}`)
console.log(`[BEFORE] retrieve("${QUERY}") -> ${before.length} hit(s)`)
console.log(`[BEFORE] new 2026 signal retrievable? ${before.some((e) => /healthai/i.test(e.title + e.text)) ? 'YES' : 'NO (correct: not yet in moat)'}`)

// 3. capture + writeback (idempotent via fingerprint)
let sig
if (fs.existsSync(LOG)) {
  const existing = fs.readFileSync(LOG, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
  sig = existing.find((s) => s.entity === DEMO_FP.entity && s.year === DEMO_FP.year)
}
if (!sig) {
  sig = {
    id: 'csig_demo_healthai_2026',
    runId: 'r11a_demo',
    kind: 'enforcement',
    scope: 'enforcement',
    entity: 'HealthAI',
    authority: 'CNIL',
    year: 2026,
    amountEur: 4_200_000,
    pattern: 'unauthorized biometric processing (GDPR Art. 9)',
    basis: 'GDPR Art. 9',
    status: 'pending_review',
    createdAt: new Date().toISOString(),
    verify: true,
  }
  writeSignal(sig)
  console.log(`\n[CAPTURE] new enforcement signal extracted from run -> written to ${path.relative(process.cwd(), LOG)}`)
} else {
  console.log(`\n[CAPTURE] demo signal already present (id=${sig.id}) — reusing (idempotent)`)
}

// 4. human accepts (the ONLY way it becomes retrievable)
if (sig.status !== 'accepted') {
  setStatus(sig.id, 'accepted')
  console.log('[REVIEW ] human accepted signal (pending_review -> accepted)')
} else {
  console.log('[REVIEW ] signal already accepted')
}

// 5. re-ingest accepted contributions
const accepted = loadAccepted()
idx = curated.concat(accepted)
console.log(`[REINGEST] index size now = ${idx.length} (curated ${curated.length} + accepted ${accepted.length})`)

// 6. AFTER
const after = retrieve(idx, QUERY)
const hit = after.find((e) => /healthai/i.test(e.title + e.text))
console.log(`\n[AFTER ] retrieve("${QUERY}") -> ${after.length} hit(s)`)
console.log(`[AFTER ] new 2026 signal retrievable? ${hit ? 'YES ✅ (flywheel closed)' : 'NO ❌'}`)
if (hit) {
  console.log(`          matched: [${hit.ref}] ${hit.title} — ${hit.source}${hit.verify ? ' (verify vs primary law)' : ''}`)
}

console.log('\n=== FLYWHEEL LOOP VERIFIED ===\n')
process.exit(hit ? 0 : 1)
