import type { GovEntry } from './governance-data/index'

/**
 * Honest guardrails for the vertical AI governance agent (R11 upgrade).
 * Aligned to OPC asset guardrails G1–G5 (see docs/r11-agent-upgrade-plan.md §7.3).
 *
 * These validators run AFTER the grounded model call returns, BEFORE the
 * report is assembled and emitted. A failing validator refuses emission —
 * matching the existing "no citation → refuse" red line.
 *
 *   G1 — analysis is decision-support, not legal advice / compliance certificate
 *   G2 — no "replace your legal team" / "guarantee no breach" / "guarantee compliance"
 *   G3 — penalty ceilings (GDPR €20M/4%, EU AI Act €35M/7%) are public reference
 *        points, never a promise the tool will keep the user under them
 *   G4 — English B2B positioning (enforced at content/design layer, not runtime)
 *   G5 — governance mapping/roadmap is analysis aid; must not claim certified/compliant
 */

export interface GuardrailResult {
  ok: boolean
  violations: string[]
  note: string
  needsHumanReview: boolean
}

const DECISION_SUPPORT_FOOTER =
  '\n\n— Decision-support only. Not legal advice. Verify against primary law before action. ' +
  'This is a good-faith effort record you can stand behind, not a compliance certification.'

const UNCERTAINTY_FOOTER =
  '\n\n⚠️ Open uncertainties detected — confirm with qualified counsel before action.' + DECISION_SUPPORT_FOOTER

// G2 / G5 — prohibited absolute-assurance phrases. Anchored to avoid false
// positives on mentions of standards (e.g. "ISO 42001 certification" as a topic).
const PROHIBITED_PHRASES: Array<{ re: RegExp; code: string }> = [
  { re: /\bguarantee[ds]?\b[^.]{0,40}\b(compliance|compliant|no breach|no violation|conformity)\b/i, code: 'G2_GUARANTEE_COMPLIANCE' },
  { re: /\byou (are|will be|have been) compliant\b/i, code: 'G5_YOU_ARE_COMPLIANT' },
  { re: /\b(this|we|it) (certifies?|certify) (your|the system|you|compliance)\b/i, code: 'G5_CERTIFIED' },
  { re: /\breplace (your )?(legal|compliance) (team|counsel)\b/i, code: 'G2_REPLACE_TEAM' },
  { re: /\bguarantee[ds]? (no breach|100%|eliminate all risk|zero risk)\b/i, code: 'G2_GUARANTEE_NO_BREACH' },
  { re: /\b(ensures?|guarantees?) (your )?(full |eu ai act )?(compliance|conformity)\b/i, code: 'G5_ENSURE_COMPLIANCE' },
]

// G3 — penalty ceilings must be framed as public reference points, never as a
// promise that the tool will keep the user under them.
const PENALTY_PROMISE: RegExp =
  /\b(we |this (tool|report) |the agent )(will|can|guarantees?) (keep|ensure|get) (you|your (org|company)) (under|below|within) .*(€|\$)\s?\d/i

// G1 — the report must be grounded in a cited provision.
const CITATION_MARKER = /Art\.|Cl\.|Annex|A\d|NIST|ISO|GDPR|Rec\.|para\.|§/i

const UNCERTAINTY_MARKER =
  /\b(uncertain|not certain|may not (be|apply)|verify with|consult (a|your)|should confirm|depends on|open (question|issue)|needs? (human|legal) review|cannot (determine|confirm)|out of scope)\b/i

/** G1 — report is grounded in at least one cited provision from the dataset. */
export function checkCitationGrounded(report: string, citations: GovEntry[]): boolean {
  return citations.length > 0 && CITATION_MARKER.test(report)
}

/** G2 / G5 — scan for prohibited absolute-assurance phrasing. */
export function checkNoGuarantee(text: string): string[] {
  const hits: string[] = []
  for (const p of PROHIBITED_PHRASES) {
    if (p.re.test(text)) hits.push(p.code)
  }
  if (PENALTY_PROMISE.test(text)) hits.push('G3_PENALTY_PROMISE')
  return hits
}

/** Uncertainty detector — drives the "confirm with counsel" flag (G1/G5). */
export function detectUncertainty(text: string): boolean {
  return UNCERTAINTY_MARKER.test(text)
}

/** Main entry — returns whether the report may be emitted, plus the redline note. */
export function applyGuardrails(report: string, citations: GovEntry[]): GuardrailResult {
  const violations: string[] = []

  if (!checkCitationGrounded(report, citations)) {
    violations.push('G1_NO_CITATION')
  }
  violations.push(...checkNoGuarantee(report))

  const needsHumanReview = detectUncertainty(report)
  const ok = violations.length === 0

  let note = DECISION_SUPPORT_FOOTER
  if (needsHumanReview) {
    note = UNCERTAINTY_FOOTER
  }

  return { ok, violations, note, needsHumanReview }
}
