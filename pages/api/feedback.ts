import type { NextApiRequest, NextApiResponse } from 'next'
import fs from 'fs'
import path from 'path'
import { PRODUCT } from '../../lib/product'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const body = (req.body || {}) as {
    runId?: string
    thumbs?: 'up' | 'down'
    correction?: string
  }
  const slug = String((PRODUCT as any).slug || 'product')
  const dir = path.join(process.cwd(), '.data', 'feedback')
  try { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }) } catch { /* read-only FS (serverless): best effort */ }
  const row = {
    ts: new Date().toISOString(),
    runId: String(body.runId || ''),
    thumbs: body.thumbs || null,
    correction: String(body.correction || '').slice(0, 2000),
  }
  try { fs.appendFileSync(path.join(dir, `${slug}.jsonl`), JSON.stringify(row) + '\n', 'utf8')
 } catch { /* read-only FS (serverless): best effort */ }
  return res.status(200).json({ ok: true })
}
