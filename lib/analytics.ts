// Umami analytics helpers for the R11 launch (replaces the old GA4 gtag layer).
// Env-driven and build-safe: reads NEXT_PUBLIC_UMAMI_URL / NEXT_PUBLIC_UMAMI_ID
// at compile time. Every function NO-OPs gracefully when Umami is not configured
// (UMAMI_ID undefined) so the app never crashes without analytics.

export const UMAMI_ID = process.env.NEXT_PUBLIC_UMAMI_ID
export const UMAMI_URL = (process.env.NEXT_PUBLIC_UMAMI_URL || '').replace(/\/$/, '')

// Browser-side event push. Safe no-op during SSR or when the Umami script
// hasn't loaded yet (window.umami missing). Mirrors the official umami.track().
export function umamiTrack(event: string, payload: Record<string, any> = {}) {
  if (typeof window === 'undefined') return
  const umami = (window as any).umami
  if (!umami || typeof umami.track !== 'function') return
  umami.track(event, payload)
}

// generate_lead and begin_checkout both fire on the primary checkout CTA click
// (the early-bird / waitlist button that links to the Waffo checkout).
export function trackCheckoutCta(p: {
  itemId: string
  itemName: string
  price: number
  value: number
  currency?: string
}) {
  const currency = p.currency || 'USD'
  umamiTrack('generate_lead', {
    currency,
    value: p.value,
    item_id: p.itemId,
    item_name: p.itemName,
  })
  umamiTrack('begin_checkout', {
    currency,
    value: p.price,
    item_id: p.itemId,
    item_name: p.itemName,
  })
}

// tool_used fires after a successful /api/tool response.
export function trackToolUsed(itemId: string, success: boolean, llmReal: boolean) {
  umamiTrack('tool_used', {
    item_id: itemId,
    success,
    llm_real: llmReal,
  })
}

// purchase is fired SERVER-SIDE by pages/api/waffo-webhook.ts (NOT from the
// browser). The webhook verifies the Waffo signature and forwards a `purchase`
// event to Umami's public /api/send endpoint using the website UUID — the same
// ID the browser script uses. No client-side purchase code should exist.
