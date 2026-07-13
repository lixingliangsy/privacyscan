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
  checkoutUrl: "https://pancake.waffo.ai/store/lixingliang-ai-tools-6cilbw8v/checkout/cs_0cee3785-8b14-cf75-e632-8d6571099c9e?utm_campaign=r11_launch&utm_content=privacyscan&utm_source=x&utm_medium=organic",
  tagline: "Catch GDPR gaps on your site before regulators do.",
  description: "PrivScan automatically scans your website or app for GDPR and consumer-privacy gaps - cookies, consent, trackers, and data collection - then hands your team a prioritized remediation checklist.",
  toolTitle: "GDPR Compliance Scan",
  resultLabel: "Scan Results",
  ctaLabel: "Scan Now",
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
    "desc": "Quick spot-check"
  },
  {
    "tier": "Pro",
    "price": "$29/mo",
    "desc": "Full scans + export + history"
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
