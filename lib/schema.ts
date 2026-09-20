export type Finding = {
  id?: string
  title: string
  severity: 'low' | 'medium' | 'high'
  evidence?: string
  remediation?: string
  source?: 'Rule-based' | 'Model-assisted'
}

export type AnalyzePayload = {
  findings: Finding[]
  summary: string
}

/** Runtime validation of the structured analyze payload (no silent fallback). */
export function validateAnalyzePayload(raw: unknown): { ok: true; data: AnalyzePayload } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, error: 'Analyze payload must be an object' }
  }
  const obj = raw as Record<string, unknown>
  if (!Array.isArray(obj.findings)) {
    return { ok: false, error: 'Analyze payload missing findings[]' }
  }
  if (typeof obj.summary !== 'string' || !obj.summary.trim()) {
    return { ok: false, error: 'Analyze payload missing summary' }
  }
  for (const f of obj.findings) {
    if (!f || typeof f !== 'object') return { ok: false, error: 'Invalid finding entry' }
    const row = f as Record<string, unknown>
    if (typeof row.title !== 'string') return { ok: false, error: 'Finding title required' }
    if (!['low', 'medium', 'high'].includes(String(row.severity))) {
      return { ok: false, error: 'Finding severity must be low|medium|high' }
    }
  }
  return { ok: true, data: obj as unknown as AnalyzePayload }
}

/** Validate required user inputs before a run starts (server-side). */
export function validateInputs(schema: Array<{ key: string; required?: boolean }>, inputs: Record<string, string>): { ok: true } | { ok: false; error: string } {
  for (const f of schema) {
    if (f.required !== false && !String(inputs[f.key] || '').trim()) {
      return { ok: false, error: `Missing required input: ${f.key}` }
    }
  }
  return { ok: true }
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface HowToStep {
  name: string;
  text: string;
}

export function buildFaqJsonLd(items: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": items.map((it) => ({
      "@type": "Question",
      "name": it.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": it.answer,
      },
    })),
  };
}

export function buildHowToJsonLd(name: string, steps: HowToStep[]) {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": name,
    "step": steps.map((s, i) => ({
      "@type": "HowToStep",
      "position": i + 1,
      "name": s.name,
      "text": s.text,
    })),
  };
}
