import React from 'react'
import Head from 'next/head'
import Layout from '../components/Layout'
import { PRODUCT } from '../lib/product'

const Row = ({ title, body }: { title: string; body: string }) => (
  <div className="rounded-2xl border border-slate-200 p-6 bg-white">
    <h2 className="text-lg font-bold mb-2 text-slate-900">{title}</h2>
    <p className="text-sm text-slate-600">{body}</p>
  </div>
)

const rows = [
  { title: "CSV export", body: "Gap lists via /api/runs?export=csv." },
  { title: "JSON export", body: "Machine-readable exports via /api/runs?export=json." },
  { title: "API & webhooks", body: "Programmatic scans for site fleets (Enterprise)." },
  { title: "Bring Your Own Key (BYOK)", body: "Enterprise OpenAI key stays server-side only." },
]

export default function IntegrationsPage() {
  return (
    <Layout>
      <Head>
        <title>{`${PRODUCT.name} — Integrations`}</title>
        <meta name="description" content={`${PRODUCT.name} export targets, API, and BYOK options.`} />
      </Head>
      <div className="max-w-4xl">
        <div className="text-xs font-bold tracking-widest uppercase text-indigo-600 mb-3">Integrations</div>
        <h1 className="text-4xl font-extrabold tracking-tight mb-4">Plug into your stack</h1>
        <p className="text-lg text-slate-600 mb-10">Only honest integrations are listed. We do not advertise connectors that are not yet shipped.</p>

        <div className="grid md:grid-cols-2 gap-5">
          {rows.map((r) => (
            <Row key={r.title} title={r.title} body={r.body} />
          ))}
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 mt-6 text-sm text-amber-900">
          <strong>Honesty note:</strong> Live DOM crawler depth varies by plan. We do not advertise connectors that are not shipped.
        </div>
      </div>
    </Layout>
  )
}
