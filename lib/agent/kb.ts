import type { KbEntry } from "../support-kit/types";
export type { KbEntry };

export const KB: KbEntry[] = [
  {
    id: "what",
    title: "What PrivScan does",
    keywords: ["PrivScan", "privacyscan", "what", "product", "about", "Catch GDPR gaps on your site before regulators do."],
    body: "Catch GDPR gaps on your site before regulators do.. PrivScan automatically scans your website or app for GDPR and consumer-privacy gaps - cookies, consent, trackers, and data collection - then hands your team a prioritized remediation checklist.",
    source: "PrivScan product definition",
    tags: [],
  },
  {
    id: "features",
    title: "PrivScan features",
    keywords: ["features", "feature", "can", "does", "Scan your site for common GDPR compliance gaps", "Review cookie, consent, and data-collection practices", "Get a privacy readiness score with article references", "Receive a remediation checklist"],
    body: "PrivScan includes: Scan your site for common GDPR compliance gaps; Review cookie, consent, and data-collection practices; Get a privacy readiness score with article references; Receive a remediation checklist. It does not add capabilities that are not listed here.",
    source: "PrivScan feature list",
    tags: [],
  },
  {
    id: "pricing",
    title: "PrivScan pricing",
    keywords: ["price", "pricing", "plan", "cost", "billing", "subscription", "monthly", "yearly"],
    body: "Listed prices for PrivScan: $29/month and $290/year. Checkout uses the in-app checkout route. This assistant cannot change a subscription or issue a refund.",
    source: "PrivScan pricing fields",
    tags: [],
  },
  {
    id: "howto",
    title: "How to use PrivScan",
    keywords: ["how", "start", "use", "tool", "run", "GDPR Compliance Scan"],
    body: "Open PrivScan and use GDPR Compliance Scan. The form asks for: Website or App URL; How You Collect User Data; Primary User Region.",
    source: "PrivScan tool fields",
    tags: [],
  },
  {
    id: "faq-1",
    title: "What does PrivScan check?",
    keywords: ["What", "does", "PrivScan", "check?"],
    body: "It scans your site for common GDPR gaps - cookie-consent granularity (Art. 7), lawful-basis statements (Art. 6), and data-retention notices (Art. 13/14) - then scores readiness from 0 to 100.",
    source: "PrivScan FAQ",
    tags: ["compliance"],
  },
  {
    id: "faq-2",
    title: "Is PrivScan a replacement for a DPO?",
    keywords: ["Is", "PrivScan", "a", "replacement", "for", "a"],
    body: "No. It is decision-support that flags likely gaps; final assessments should be confirmed with a qualified privacy professional.",
    source: "PrivScan FAQ",
    tags: [],
  },
  {
    id: "faq-3",
    title: "Which regions does it cover?",
    keywords: ["Which", "regions", "does", "it", "cover?"],
    body: "EU GDPR by default, with UK GDPR and global guidance selectable in the input.",
    source: "PrivScan FAQ",
    tags: ["compliance"],
  },
  {
    id: "honesty",
    title: "What this assistant will not claim",
    keywords: ["legal", "advice", "guarantee", "demo", "human", "refund", "support"],
    body: "Answers about PrivScan are decision support only, not legal, tax, accessibility-certification, or compliance sign-off. This assistant does not invent integrations, SSO, CSV export, or Slack connections unless they are already in the product description. If live AI is unavailable, the product must not pretend a demo result is live. Say you want a human and leave an email if you need a person.",
    source: "PrivScan support policy",
    tags: ["compliance"],
  },
];

function normalize(s: string): string {
  return (s || "").toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ");
}
function toWords(s: string): string[] {
  return normalize(s).split(/\s+/).map((w) => w.trim()).filter(Boolean);
}
function cjkBigrams(s: string): string[] {
  const grams: string[] = [];
  const han = /[\u4e00-\u9fff]/;
  for (const w of toWords(s)) {
    if (han.test(w) && w.length >= 2) {
      for (let i = 0; i < w.length - 1; i++) grams.push(w.slice(i, i + 2));
    }
  }
  return grams;
}
function scoreEntry(entry: KbEntry, query: string): number {
  const q = normalize(query);
  const qWords = new Set(toWords(q));
  const qGrams = new Set(cjkBigrams(q));
  let s = 0;
  for (const kw of entry.keywords) {
    const k = kw.toLowerCase();
    if (q.includes(k)) s += 3;
  }
  for (const tw of toWords(entry.title)) {
    if (qWords.has(tw)) s += 2;
  }
  const idx = normalize(entry.keywords.join(" ") + " " + entry.title + " " + entry.body.slice(0, 400));
  for (const g of qGrams) if (idx.includes(g)) s += 0.5;
  return s;
}

export interface RetrieveResult {
  entries: KbEntry[];
  topScore: number;
}

export function retrieve(query: string, topK = 4, entries: KbEntry[] = KB): RetrieveResult {
  const scored = entries
    .map((e) => ({ e, s: scoreEntry(e, query) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, topK);
  return { entries: scored.map((x) => x.e), topScore: scored.length ? scored[0].s : 0 };
}

export function isComplianceRelated(entries: KbEntry[]): boolean {
  return entries.some((e) => e.tags.includes("compliance"));
}
