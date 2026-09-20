/**
 * PrivScan vertical ruleset — GDPR / PII / consent readiness.
 * Deterministic checks run BEFORE the model so the verdict is explainable
 * and not dependent on LLM output alone.
 */
export const RULESET_VERSION = 'privacyscan@2026-07-21'

export type PrivRule = {
  id: string
  title: string
  severity: 'low' | 'medium' | 'high'
  check: (ctx: { url: string; practices: string; region: string }) => boolean
  remediation: string
  ref?: string
}

export const PRIV_RULES: PrivRule[] = [
  {
    id: 'PRIV-001',
    title: 'PII detection in collected data',
    severity: 'high',
    check: (ctx) => /email|phone|name|payment|card|pii|cookie|address|location|health|biometric/i.test(ctx.practices + ' ' + ctx.url),
    remediation:
      'If you process personal data (esp. special-category data), identify a lawful basis (Art. 6) and document it per processing activity.',
  },
  {
    id: 'PRIV-002',
    title: 'Cross-border transfer (Chapter V)',
    severity: 'high',
    check: (ctx) => /global/i.test(ctx.region) || /transfer|third country|outside eu|outside eea|united states|\bus\b/i.test(ctx.practices),
    remediation:
      'Transfers outside the EEA need a Chapter V mechanism (Adequacy Decision, SCCs, or BCRs). Map every sub-processor and its hosting region.',
  },
  {
    id: 'PRIV-003',
    title: 'Consent mechanism (Art. 7)',
    severity: 'high',
    check: (ctx) => !/consent|opt-in|opt in|gdpr|cookie banner|granular|preferences/i.test(ctx.practices),
    remediation:
      'Where consent is the lawful basis, implement granular, unbundled, opt-in consent with easy withdrawal (Art. 7). Avoid pre-ticked boxes.',
  },
  {
    id: 'PRIV-004',
    title: 'Cookie / tracker inventory (ePrivacy)',
    severity: 'medium',
    check: (ctx) => /cookie|tracker|analytics|pixel|tag manager|gtm/i.test(ctx.practices),
    remediation:
      'Maintain a cookie/tracker inventory. Block non-essential cookies until consent; disclose each purpose and provider.',
  },
  {
    id: 'PRIV-005',
    title: 'DPO requirement (Art. 37)',
    severity: 'medium',
    check: (ctx) => /eu/i.test(ctx.region) && /special category|health|biometric|large scale|regular monitoring|children|minors/i.test(ctx.practices),
    remediation:
      'Core activities involving large-scale special-category data or regular monitoring likely require a Data Protection Officer (Art. 37). Assess and publish their contact.',
  },
  {
    id: 'PRIV-006',
    title: 'Data-subject rights pathway (Art. 12–22)',
    severity: 'high',
    check: (ctx) => !/data subject|right to|access|erasure|delete account|opt-out|unsubscribe|rectif/i.test(ctx.practices),
    remediation:
      'Provide a clear pathway for access, rectification, erasure, and objection (Art. 15–22). Honor requests within one month.',
    ref: 'https://gdpr-info.eu/art-12-gdpr/',
  },
  {
    id: 'PRIV-007',
    title: 'Accountability & principles (Art. 5)',
    severity: 'medium',
    check: (ctx) => !/purpose|minimis|retention|lawful|transparen|accountab/i.test(ctx.practices),
    remediation:
      'Document the Art. 5 principles: lawfulness, purpose limitation, data minimisation, accuracy, storage limitation, integrity/confidentiality, accountability.',
    ref: 'https://gdpr-info.eu/art-5-gdpr/',
  },
  {
    id: 'PRIV-008',
    title: 'Security of processing (Art. 32)',
    severity: 'high',
    check: (ctx) => !/encrypt|pseudonym|secure|tls|backup|access control|2fa|mfa/i.test(ctx.practices + ' ' + ctx.url),
    remediation:
      'Implement Art. 32 technical/organisational measures: encryption, pseudonymisation, resilience, regular testing. Assess risk-appropriate controls.',
    ref: 'https://gdpr-info.eu/art-32-gdpr/',
  },
  {
    id: 'PRIV-009',
    title: 'CCPA/CPRA (California) disclosure & opt-out',
    severity: 'medium',
    check: (ctx) => !/california|ccpa|cpra|do not sell|opt.?out of sale|consumer privacy/i.test(ctx.practices + ' ' + ctx.region),
    remediation:
      'For CA residents, provide a "Do Not Sell or Share" link, notice at collection, and honor deletion/opt-out rights (CCPA/CPRA).',
    ref: 'https://oag.ca.gov/privacy/ccpa',
  },
  {
    id: 'PRIV-010',
    title: 'Cookie consent symmetry (no dark patterns)',
    severity: 'medium',
    check: (ctx) => !/reject all|decline|equal weight|granular|accept and reject/i.test(ctx.practices),
    remediation:
      'ePrivacy/GDPR: reject must be as easy as accept; no pre-ticked boxes or dark-pattern nudges (2025 consent guidance).',
    ref: 'https://gdpr.eu/cookies/',
  },
  {
    id: 'PRIV-011',
    title: 'No compliance-efficacy overclaim',
    severity: 'low',
    check: (ctx) => /(guarantee|guaranteed|100%|fully compliant|legally bulletproof)/i.test(ctx.practices),
    remediation:
      'This tool is decision-support, not a guarantee of compliance. Avoid language promising absolute/guaranteed legal compliance.',
    ref: 'https://gdpr-info.eu/',
  },
  {
    id: 'PRIV-012',
    title: 'Data Protection Impact Assessment (Art. 35)',
    severity: 'high',
    check: (ctx) =>
      /high risk|large scale|systematic monitoring|special category|biometric|profiling|score|vulnerable/i.test(ctx.practices) &&
      !/dpia|impact assessment|art\.? 35|risk assessment/i.test(ctx.practices),
    remediation:
      'High-risk processing (large-scale special-category data, systematic monitoring, profiling) requires a DPIA (Art. 35) before launch. Document risks, measures, and residual impact; consult the DPO / supervisory authority if unclear.',
    ref: 'https://gdpr-info.eu/art-35-gdpr/',
  },
  {
    id: 'PRIV-013',
    title: 'Personal data breach notification (Art. 33)',
    severity: 'high',
    check: (ctx) => !/breach|72 ?h|notification|incident response|supervisory authority/i.test(ctx.practices + ' ' + ctx.url),
    remediation:
      'A personal data breach must be notified to the supervisory authority within 72 hours of becoming aware (Art. 33), and to data subjects without undue delay where high risk (Art. 34). Define an incident-response runbook.',
    ref: 'https://gdpr-info.eu/art-33-gdpr/',
  },
]

export function runDeterministicChecks(inputs: Record<string, string>) {
  const url = String(inputs.website_url || inputs.url || '')
  const practices = String(inputs.data_practices || inputs.practices || '')
  const region = String(inputs.user_region || inputs.region || 'EU only')
  const ctx = { url, practices, region }
  const hits = PRIV_RULES.filter((r) => r.check(ctx)).map((r) => ({
    id: r.id,
    title: r.title,
    severity: r.severity,
    remediation: r.remediation,
    source: 'Rule-based' as const,
  }))
  return { rulesetVersion: RULESET_VERSION, hits }
}
