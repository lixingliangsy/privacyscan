// pages/api/checkout.ts — Server-side Waffo checkout redirect.
// Follows the official Waffo Pancake integration guide: mint a fresh session with
// client.checkout.createSession(), then 302-redirect. Never expose the private key to the browser.
import type { NextApiRequest, NextApiResponse } from 'next'
import { PRODUCT } from '../../lib/product'
import { createCheckout } from '../../lib/waffo'

function withUtm(url: string): string {
  try {
    const u = new URL(url)
    u.searchParams.set('utm_campaign', 'opc_launch')
    u.searchParams.set('utm_content', PRODUCT.slug)
    u.searchParams.set('utm_source', 'product_site')
    u.searchParams.set('utm_medium', 'checkout_cta')
    return u.toString()
  } catch {
    return url
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Which billing cycle? Default monthly; use yearly only if the product defines one.
  const cycle =
    req.query && req.query.cycle === 'yearly' && PRODUCT.yearlyProductId ? 'yearly' : 'monthly'
  const productId = cycle === 'yearly' ? PRODUCT.yearlyProductId : PRODUCT.productId

  if (productId) {
    try {
      const session = await createCheckout(productId, {
        slug: PRODUCT.slug,
        successUrl: `https://lxsaihub.com/success.html?session_id={SESSION_ID}&slug=${PRODUCT.slug}&cycle=${cycle}`,
      })
      if (session?.checkoutUrl) {
        return res.redirect(302, withUtm(session.checkoutUrl))
      }
    } catch (e: any) {
      console.error('[checkout] mint failed:', e?.message || e)
    }
  } else {
    console.warn('[checkout] missing productId for', PRODUCT.slug)
  }

  // Graceful fallback: stable Waffo store product page when configured.
  const storeBase = process.env.WAFFO_STORE_URL || ''
  if (storeBase) {
    const target = storeBase.endsWith('/') ? storeBase + PRODUCT.slug : storeBase + '/' + PRODUCT.slug
    return res.redirect(302, target)
  }

  // Fail closed with a visible signal — never redirect to /api/checkout (self-loop)
  // and never bounce silently to #pricing without checkout_error.
  const wantsJson =
    (typeof req.headers.accept === 'string' && req.headers.accept.includes('application/json')) ||
    req.query?.format === 'json'
  const reason = !productId ? 'missing_product_id' : 'mint_failed'
  const message =
    'Payment checkout is temporarily unavailable. Please try again later or contact support.'
  if (wantsJson) {
    return res.status(503).json({
      ok: false,
      error: 'CHECKOUT_NOT_CONFIGURED',
      reason,
      message,
    })
  }
  const fallbackUrl = String((PRODUCT as any).checkoutUrl || '')
  if (/^https?:\/\//i.test(fallbackUrl) && !/\/api\/checkout/i.test(fallbackUrl)) {
    return res.redirect(302, fallbackUrl)
  }
  return res.redirect(302, `/?checkout_error=${encodeURIComponent(reason)}#pricing`)
}
