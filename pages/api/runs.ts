import type { NextApiRequest, NextApiResponse } from 'next'
import { listRuns, loadRun } from '../../lib/runStore'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const runId = typeof req.query.runId === 'string' ? req.query.runId : ''
    const exportFmt = typeof req.query.export === 'string' ? req.query.export : ''
    if (runId) {
      const row = loadRun(runId)
      if (!row) return res.status(404).json({ error: 'Run not found' })
      return res.status(200).json(row)
    }
    const rows = listRuns(100)
    if (exportFmt === 'json') {
      res.setHeader('Content-Type', 'application/json')
      res.setHeader('Content-Disposition', 'attachment; filename="privacyscan-runs.json"')
      return res.status(200).send(JSON.stringify(rows, null, 2))
    }
    if (exportFmt === 'csv') {
      const header = 'runId,step,status,createdAt,updatedAt,rulesetVersion'
      const csv = rows
        .map((r) => [r.runId, r.step, r.status, r.createdAt, r.updatedAt, r.rulesetVersion || ''].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
        .join('\n')
      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', 'attachment; filename="privacyscan-runs.csv"')
      return res.status(200).send(header + '\n' + csv)
    }
    return res.status(200).json({ runs: rows.map((r) => ({
      runId: r.runId,
      step: r.step,
      status: r.status,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      rulesetVersion: r.rulesetVersion,
    })) })
  }
  return res.status(405).json({ error: 'Method not allowed' })
}
