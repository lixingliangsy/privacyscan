export interface InputField {
  key: string
  label: string
  type: 'input' | 'textarea' | 'select'
  placeholder?: string
  options?: string[]
}

export const PRODUCT = {
  name: "PrivScan",
  slug: "privacyscan",
  priceMonthly: 29,
  productId: "PROD_4sLNrYm95gsrlmYB68jap0",

  yearlyProductId: "PROD_6RbC1JG6sqsYF6gl7tSJyu",
  priceYearly: 290,

  // R11 Agent-tier upsell (upgrade plan §7.2): vertical AI governance Agent.
  agentProductId: "PROD_3RKdvjjFDCmkKmV89kwzbZ",
  agentPriceMonthly: 49,
  // R11 Agent Suite (all three agents, bundle).
  suiteProductId: "PROD_3NJSmCB7WoYdLNicfcrZyg",
  suitePriceMonthly: 199,

  checkoutUrl: "/api/checkout",
  pipelineId: "privacyscan-gdpr-v1",
  rulesetId: "privacyscan@2026-07-19",
  rulesetVersion: "privacyscan@2026-07-19",
  tagline: "Catch GDPR gaps on your site before regulators do.",
  description: "PrivScan automatically scans your website or app for GDPR and consumer-privacy gaps - cookies, consent, trackers, and data collection - then hands your team a prioritized remediation checklist.",
  toolTitle: "GDPR Compliance Scan",
  resultLabel: "Scan Results",
  ctaLabel: "Scan Now",
  definitionLead: `PrivScan is an automated website and app privacy scanner that checks cookie banners, consent flows, trackers, and data-collection notices against GDPR (Regulation (EU) 2016/679) and returns a prioritized remediation checklist with article references.`,
  geoFaq: [
    { q: "What does PrivScan check?", a: "It scans your site for common GDPR gaps - cookie-consent granularity (Art. 7), lawful-basis statements (Art. 6), and data-retention notices (Art. 13/14) - then scores readiness from 0 to 100." },
    { q: "Is PrivScan a replacement for a DPO?", a: "No. It is decision-support that flags likely gaps; final assessments should be confirmed with a qualified privacy professional." },
    { q: "Which regions does it cover?", a: "EU GDPR by default, with UK GDPR and global guidance selectable in the input." },
    { q: "How is the readiness score calculated?", a: "A weighted check of consent, lawful basis, retention, and tracker transparency; the demo returns a sample 54/100 with cited articles." },
    { q: "Can I export the report?", a: "Pro exports the full scan and remediation checklist; Free includes one watermarked run per day." },
    { q: "Does it scan single-page apps?", a: "It analyzes the URL plus your described data practices; deeper SPA crawling is on the roadmap." }
  ],

  features: [
  "Scan your site for common GDPR compliance gaps",
  "Review cookie, consent, and data-collection practices",
  "Get a privacy readiness score with article references",
  "Receive a remediation checklist"
],
  inputs: [
  {
    "key": "website_url",
    "label": "Website or App URL",
    "type": "text",
    "placeholder": "https://your-app.com"
  },
  {
    "key": "data_practices",
    "label": "How You Collect User Data",
    "type": "textarea",
    "placeholder": "e.g. We collect emails, cookies, and payments"
  },
  {
    "key": "user_region",
    "label": "Primary User Region",
    "type": "select",
    "options": [
      "EU only",
      "EU + UK",
      "Global",
      "Not sure"
    ]
  }
] as InputField[],
  systemPrompt: "You are PrivacyScan, a GDPR compliance auditor. Given a website/app URL, a description of data-collection practices, and the primary user region, evaluate the organization's privacy readiness and surface the most likely GDPR gaps. Always structure your response as: (1) a privacy readiness score from 0-100, (2) the top issues each mapped to a GDPR article (e.g. Art. 6, Art. 7), (3) required fixes, and (4) a remediation checklist. Be concrete and cite the relevant articles. In demo (mock) mode, return a realistic sample audit following exactly this structure.",
  pricing: [
  {
    "tier": "Free",
    "price": "$0",
    "desc": "1 workflow run / day · watermarked export"
  },
  {
    "tier": "Pro",
    "price": "$29/mo",
    "desc": "300 workflow runs / mo · audit log · export"
  },
  {
    "tier": "Enterprise",
    "price": "Custom",
    "desc": "SSO-ready · BYOK · higher caps · shared rulesets"
  },
  {
    "tier": "Agent",
    "price": "$49/mo",
    "desc": "Vertical privacy/GDPR governance agent — multi-step, cited"
  }
],
  mock: (inputs: Record<string, string>): string => {
  const url = (inputs['website_url'] || '').trim()
  const dp = (inputs['data_practices'] || '').trim()
  const region = inputs['user_region'] || 'EU only'
  if (!url && !dp) return 'Enter your website URL and how you collect user data to scan.'
  const score = 54
  let out = 'GDPR COMPLIANCE SCAN - ' + region + '\n\n'
  out += 'Privacy readiness score: ' + score + '/100\n\n'
  out += 'Top issues (mapped to GDPR):\n'
  out += '  - Cookie banner lacks granular consent (Art. 7)\n'
  out += '  - No lawful basis stated for analytics (Art. 6)\n'
  out += '  - Missing data-retention notice (Art. 13/14)\n\n'
  out += 'Required fixes:\n'
  out += '  - Replace "accept all" with granular opt-in\n'
  out += '  - Add lawful-basis statement per purpose\n'
  out += '  - Publish retention periods\n\n'
  out += 'Remediation checklist:\n'
  out += '  - [ ] Cookie consent v2\n'
  out += '  - [ ] Privacy policy refresh\n'
  out += '\n--- (Mock demo. Pro unlocks full-site scans + export.)'
  return out
}
}
