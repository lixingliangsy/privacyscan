import type { NextApiRequest, NextApiResponse } from 'next'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

export const config = { api: { bodyParser: false } }

// Per-app slug — used as the Umami `hostname` / `item_id` fallback. The Waffo
// Pancake webhook payload carries NO product slug, so revenue is attributed to
// the app itself.
const APP_SLUG = 'privacyscan'

const UMAMI_URL = (process.env.NEXT_PUBLIC_UMAMI_URL || '').replace(/\/$/, '')
const UMAMI_ID = process.env.NEXT_PUBLIC_UMAMI_ID

// --- Dual-mode webhook verification ---
// Waffo may sign webhooks with EITHER:
//   (A) HMAC-SHA256 shared secret  -> set WAFFO_WEBHOOK_SECRET
//   (B) RSA-SHA256 (private key signs, you hold the public key) -> set
//       WAFFO_WEBHO_PUBLIC_KEY (PEM) or drop waffo-webhook-public.pem in root.
// The user only has an RSA public key from the Waffo dashboard, so we support
// both. If NO key is configured we forward UNVERIFIED (best-effort) so revenue
// tracking never silently breaks.
const WAFFO_WEBHOOK_SECRET = process.env.WAFFO_WEBHOOK_SECRET
const WAFFO_WEBHO_PUBLIC_KEY = loadPublicKey()

// Revenue events that must be forwarded to Umami as a `purchase`.
const PURCHASE_EVENTS = new Set([
  'order.completed',
  'subscription.activated',
  'subscription.payment_succeeded',
  // Defensive: SDK WebhookEventType enum spellings, in case Waffo emits them.
  'OrderCompleted',
  'SubscriptionActivated',
  'SubscriptionPaymentSucceeded',
])

// Refund events: log only, never forward revenue to Umami.
const REFUND_EVENTS = new Set([
  'refund.succeeded',
  'refund.failed',
  'RefundSucceeded',
  'RefundFailed',
])

// Read the raw body (Pages Router requires bodyParser:false so we can verify
// the exact bytes against the HMAC signature).
function readRaw(req: NextApiRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (c: Buffer) => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

function getSignature(req: NextApiRequest): string | null {
  return (
    (req.headers['x-waffo-signature'] as string) ||
    (req.headers['waffo-signature'] as string) ||
    null
  )
}

// HMAC-SHA256 verification, per docs.waffo.ai/zh/features/integrations.
// The Waffo signature header may be raw hex, `t=<ts>,v1=<sig>`, or `sha256=<sig>`.
function hmacVerify(payload: string, signatureHeader: string | null, secret: string): boolean {
  if (!signatureHeader || !secret) return false

  // Extract the signature portion (strip t= / v1= / sha256= prefixes).
  let sig = signatureHeader.trim()
  const v1 = /(?:^|,)v1=([^,\s]+)/i.exec(sig)
  if (v1) sig = v1[1].trim()
  else {
    const sha = /sha256=([^,\s]+)/i.exec(sig)
    if (sha) sig = sha[1].trim()
    else sig = sig.replace(/^t=\d+,?/i, '').trim()
  }
  if (!sig) return false

  const expectedHex = crypto.createHmac('sha256', secret).update(payload).digest('hex')
  const expectedB64 = crypto.createHmac('sha256', secret).update(payload).digest('base64')

  for (const expected of [expectedHex, expectedB64]) {
    try {
      if (
        sig.length === expected.length &&
        crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
      ) {
        return true
      }
    } catch {
      /* try next encoding */
    }
    try {
      const sb = Buffer.from(sig, 'base64')
      const eb = Buffer.from(expected, 'base64')
      if (sb.length && eb.length && sb.length === eb.length && crypto.timingSafeEqual(sb, eb)) {
        return true
      }
    } catch {
      /* try next encoding */
    }
  }
  return false
}

// Load the RSA public key used to verify Waffo's RSA-SHA256 webhook signature.
// Priority: env WAFFO_WEBHO_PUBLIC_KEY (PEM) -> fallback waffo-webhook-public.pem
// in the app root.
function loadPublicKey(): string | null {
  const envKey = process.env.WAFFO_WEBHO_PUBLIC_KEY
  if (envKey) return envKey
  try {
    return fs.readFileSync(path.join(process.cwd(), 'waffo-webhook-public.pem'), 'utf8')
  } catch {
    return null
  }
}

// RSA-SHA256 verification. Waffo signs the raw body with its private key; the
// signature (base64 or hex) is carried in the x-waffo-signature header.
function rsaVerify(payload: string, signatureHeader: string | null, pubKey: string): boolean {
  if (!signatureHeader || !pubKey) return false
  let sig = signatureHeader.trim()
  const v1 = /(?:^|,)v1=([^,\s]+)/i.exec(sig)
  if (v1) sig = v1[1].trim()
  else {
    const sha = /sha256=([^,\s]+)/i.exec(sig)
    if (sha) sig = sha[1].trim()
    else sig = sig.replace(/^t=\d+,?/i, '').trim()
  }
  if (!sig) return false
  let sigBuf: Buffer
  try {
    sigBuf = Buffer.from(sig, 'base64')
    if (sigBuf.length === 0) sigBuf = Buffer.from(sig, 'hex')
  } catch {
    sigBuf = Buffer.from(sig, 'hex')
  }
  try {
    return crypto.verify(
      'sha256',
      Buffer.from(payload),
      { key: pubKey, padding: crypto.constants.RSA_PKCS1_PADDING },
      sigBuf,
    )
  } catch {
    return false
  }
}

// Best-effort in-memory dedup on the delivery id (Waffo retries on failure).
const seen = new Set<string>()
function dedupe(id: string): boolean {
  if (!id) return true // no id present → don't block
  if (seen.has(id)) return false
  seen.add(id)
  if (seen.size > 5000) seen.clear() // crude cap to avoid unbounded growth
  return true
}

async function forwardToUmami(p: {
  currency: string
  value: string
  transaction_id: string
  item_id: string
  item_name: string
}) {
  if (!UMAMI_ID || !UMAMI_URL) {
    console.warn('[waffo-webhook] UMAMI env not set; skipping purchase forward (no crash)')
    return
  }
  const body = {
    payload: {
      website: UMAMI_ID,
      name: 'purchase',
      data: {
        currency: p.currency,
        value: p.value,
        transaction_id: p.transaction_id,
        item_id: p.item_id,
        item_name: p.item_name,
      },
      url: '/waffo-webhook',
      hostname: APP_SLUG,
    },
  }
  try {
    const res = await fetch(`${UMAMI_URL}/api/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      console.error(`[waffo-webhook] Umami send failed: ${res.status}`)
    }
  } catch (e) {
    console.error('[waffo-webhook] Umami send error', e)
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const raw = (await readRaw(req)).toString('utf8')

  // --- Signature verification (dual-mode: HMAC secret OR RSA public key) ---
  // Verify when a key is available, but NEVER drop a revenue event on
  // verification failure: forward it UNVERIFIED and log a prominent ERROR so
  // the operator can spot the mismatch. For a solo founder's analytics board,
  // not losing real revenue events outweighs strict forgery rejection.
  // SECURITY (consistent with aiactradar hardening, 2026-07-25): fail-closed.
  // Reject (401) when no key is configured OR when signature verification fails.
  // Before deploying, inject WAFFO_WEBHOOK_PROD_PUBLIC_KEY / WAFFO_WEBHOOK_TEST_PUBLIC_KEY
  // (or WAFFO_WEBHOOK_SECRET) via Vercel env — otherwise EVERY event 401s
  // (visible in function logs; never silent). This closes the old
  // "forward UNVERIFIED" data-integrity gap.
  let verified = false
  let verifyMode = 'none'
  if (WAFFO_WEBHOOK_SECRET) {
    verifyMode = 'hmac'
    verified = hmacVerify(raw, getSignature(req), WAFFO_WEBHOOK_SECRET)
  } else if (WAFFO_WEBHO_PUBLIC_KEY) {
    verifyMode = 'rsa'
    verified = rsaVerify(raw, getSignature(req), WAFFO_WEBHO_PUBLIC_KEY)
  }
  if (verifyMode === 'none') {
    console.error('[waffo-webhook] SECURITY: no webhook key configured; failing closed (401). Inject WAFFO_WEBHOOK_*_PUBLIC_KEY or WAFFO_WEBHOOK_SECRET before deploy.')
    return res.status(401).json({ error: 'Webhook verification not configured' })
  }
  if (!verified) {
    console.error(`[waffo-webhook] ${verifyMode} signature verification FAILED; rejecting (401, fail-closed).`)
    return res.status(401).json({ error: 'Invalid signature' })
  }

  // --- Parse payload ---
  let event: any
  try {
    event = JSON.parse(raw)
  } catch (e) {
    console.error('[waffo-webhook] bad JSON body; still 200')
    return res.status(200).json({ received: true, verified })
  }

  const eventType: string = event?.eventType || event?.type || ''
  const data: any = event?.data || {}

  // Refunds: log only, never forward revenue.
  if (REFUND_EVENTS.has(eventType)) {
    console.log(`[waffo-webhook] refund event (not forwarded): ${eventType}`, {
      orderId: data.orderId,
      eventId: event?.eventId,
    })
    return res.status(200).json({ received: true, verified, kind: 'refund' })
  }

  // Revenue events → forward a `purchase` event to Umami.
  if (PURCHASE_EVENTS.has(eventType)) {
    const dedupKey = event?.id || event?.eventId || `${eventType}:${data?.orderId}`
    if (!dedupe(dedupKey)) {
      console.log('[waffo-webhook] duplicate delivery; skipping')
      return res.status(200).json({ received: true, verified, dup: true })
    }
    const currency = String(data?.currency || 'USD').toUpperCase()
    const value = String(data?.amount ?? 0) // amount is a NUMBER per spec → coerce to string
    const transaction_id = data?.orderId || event?.eventId || `waffo_${Date.now()}`
    const item_name = data?.productName || APP_SLUG
    const item_id = APP_SLUG // no product slug in the payload
    await forwardToUmami({ currency, value, transaction_id, item_id, item_name })
  }

  // Always 200 so Waffo does not retry-loop.
  return res.status(200).json({ received: true, verified })
}
