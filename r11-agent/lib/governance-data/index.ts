import fs from 'fs'
import path from 'path'
import { getAcceptedContributed } from '../data-flywheel'

export interface GovEntry {
  id: string
  ref: string
  title: string
  text: string
  source: string
  scope: GovScope
  verify?: boolean
}

export type GovScope = 'eu-ai-act' | 'gdpr' | 'enforcement' | 'frameworks'

interface FlatEntry {
  id: string
  ref: string
  title: string
  text: string
  source: string
  scope: GovScope
  verify?: boolean
}

const DATA_DIR = __dirname
const STOP = new Set(['the', 'a', 'an', 'of', 'to', 'and', 'or', 'for', 'in', 'on', 'is', 'are', 'be', 'your', 'you', 'with', 'that', 'this', 'from', 'as', 'by', 'at', 'it', 'its', 'their', 'they'])

function readJson(name: string): any {
  const p = path.join(DATA_DIR, name)
  return JSON.parse(fs.readFileSync(p, 'utf8'))
}

let _index: FlatEntry[] | null = null

export function loadGovernanceIndex(): FlatEntry[] {
  if (_index) return _index
  const out: FlatEntry[] = []

  const act = readJson('eu-ai-act.json')
  for (const a of act.articles) {
    out.push({ id: a.id, ref: a.ref, title: a.title, text: `${a.title}. Obligations: ${(a.obligations || []).join('; ')}`, source: 'EU AI Act', scope: 'eu-ai-act', verify: a.verify })
  }
  for (const p of act.prohibitedPractices) {
    out.push({ id: p.id, ref: p.ref, title: p.title, text: p.title, source: 'EU AI Act Art. 5', scope: 'eu-ai-act' })
  }
  for (const d of act.deadlines) {
    out.push({ id: d.id, ref: `deadline ${d.date}`, title: d.obligation, text: `${d.obligation} (applies ${d.date})`, source: 'EU AI Act', scope: 'eu-ai-act', verify: d.verify })
  }
  for (const t of Object.keys(act.riskTiers)) {
    const r = act.riskTiers[t]
    out.push({ id: `TIER-${t}`, ref: r.ref, title: `${t} risk`, text: r.summary, source: 'EU AI Act', scope: 'eu-ai-act' })
  }

  const gdpr = readJson('gdpr.json')
  for (const a of gdpr.articles) {
    out.push({ id: a.id, ref: a.ref, title: a.title, text: `${a.title}. ${(a.obligations || []).join('; ')}`, source: 'GDPR', scope: 'gdpr' })
  }

  const enf = readJson('enforcement.json')
  for (const c of enf.cases) {
    out.push({ id: c.id, ref: c.basis, title: `${c.entity} (${c.authority}, ${c.year})`, text: `€${(c.amountEur / 1e6).toFixed(0)}M — ${c.pattern}. Basis: ${c.basis}`, source: 'Enforcement', scope: 'enforcement', verify: c.verify })
  }

  const fw = readJson('frameworks.json')
  for (const c of fw.iso42001.clauses) {
    out.push({ id: c.id, ref: c.ref, title: c.title, text: c.title, source: 'ISO 42001', scope: 'frameworks' })
  }
  for (const f of fw.nistAiRmf.functions) {
    out.push({ id: f.id, ref: f.id, title: f.title, text: f.summary, source: 'NIST AI RMF', scope: 'frameworks' })
  }
  for (const x of fw.crosswalkToEuAiAct) {
    out.push({ id: `XW-${x.euAiAct}`, ref: x.euAiAct, title: `Crosswalk ${x.euAiAct}`, text: `NIST: ${x.nist}; ISO: ${x.iso}`, source: 'Crosswalk', scope: 'frameworks' })
  }

  // DATA FLYWHEEL — merge human-accepted contributed signals into the
  // retrievable index. Contributed entries always carry verify:true and are
  // never treated as vetted law (see data-flywheel.ts / guardrails G1–G5).
  for (const c of getAcceptedContributed()) {
    out.push({
      id: c.id,
      ref: c.ref,
      title: c.title,
      text: c.text,
      source: c.source,
      scope: c.scope,
      verify: c.verify,
    })
  }

  _index = out
  return out
}

/** Force the next retrieve to rebuild from disk (re-ingest newly accepted signals). */
export function invalidateGovernanceCache(): void {
  _index = null
}

export function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9.\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP.has(t))
}

export interface RetrieveOpts {
  scope?: GovScope | 'all'
  topK?: number
  threshold?: number
}

export function retrieve(query: string, opts: RetrieveOpts = {}): GovEntry[] {
  const idx = loadGovernanceIndex()
  const scope = opts.scope || 'all'
  const topK = opts.topK || 6
  const qTokens = new Set(tokenize(query))
  // also index by ref tokens (Art. 9, A9, human oversight, etc.)
  const scopeFilter = scope === 'all' ? idx : idx.filter((e) => e.scope === scope)

  const scored = scopeFilter.map((e) => {
    const hay = tokenize(`${e.title} ${e.text} ${e.ref}`)
    let score = 0
    for (const t of hay) if (qTokens.has(t)) score += 1
    // ref-match boost
    for (const qt of qTokens) {
      if (e.ref.toLowerCase().includes(qt)) score += 2
    }
    return { e, score }
  })

  return scored
    .filter((s) => s.score > (opts.threshold ?? 0))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((s) => ({ id: s.e.id, ref: s.e.ref, title: s.e.title, text: s.e.text, source: s.e.source, scope: s.e.scope, verify: s.e.verify }))
}

export const GOVERNANCE_SOURCES = ['EU AI Act (Reg. 2024/1689)', 'GDPR (Reg. 2016/679)', 'Enforcement case law', 'NIST AI RMF', 'ISO/IEC 42001:2023']
