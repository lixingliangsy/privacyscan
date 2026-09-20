import React from 'react'
import Head from 'next/head'
import Layout from '../components/Layout'
import { PRODUCT } from '../lib/product'

const segments = [
  {
    name: "SaaS / web apps",
    pain: "Cookie banners and trackers drift after marketing launches.",
    how: "Scan practices, map likely Art. 6/7 gaps, export a remediation checklist.",
  },
  {
    name: "Agencies",
    pain: "Client sites need a repeatable privacy readiness pass.",
    how: "Run per-URL checks with article-referenced issues.",
  },
  {
    name: "EU / UK market entry",
    pain: "Founders lack a concrete gap list before DPO review.",
    how: "Privacy readiness score + prioritized fixes.",
  },
  {
    name: "Mobile / hybrid",
    pain: "SDKs add trackers without product awareness.",
    how: "Describe data practices; get consent and collection flags.",
  },
]

export default function UseCasesPage() {
  return (
    <Layout>
      <Head>
        <title>{`${PRODUCT.name} — Use Cases`}</title>
        <meta name="description" content={`How ${PRODUCT.name} helps ${PRODUCT.tagline}`} />
      </Head>
      <div className="max-w-4xl">
        <div className="text-xs font-bold tracking-widest uppercase text-indigo-600 mb-3">Use Cases</div>
        <h1 className="text-4xl font-extrabold tracking-tight mb-4">Built for privacy, legal, and product teams</h1>
        <p className="text-lg text-slate-600 mb-10">Pick your segment to see the workflows that matter most.</p>

        <div className="space-y-5">
          {segments.map((s) => (
            <div key={s.name} className="rounded-2xl border border-slate-200 p-6 bg-white">
              <h2 className="text-xl font-bold mb-2 text-slate-900">{s.name}</h2>
              <p className="text-sm text-slate-600 mb-2"><span className="font-semibold text-slate-900">Pain: </span>{s.pain}</p>
              <p className="text-sm text-slate-600"><span className="font-semibold text-slate-900">How {PRODUCT.name} helps: </span>{s.how}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-8">refs: GDPR Art. 6 (lawfulness) · GDPR Art. 7 (consent) · GDPR Art. 32 (security of processing)</p>
      </div>
    </Layout>
  )
}
