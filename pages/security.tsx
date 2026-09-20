import React from 'react'
import Head from 'next/head'
import Layout from '../components/Layout'
import { PRODUCT } from '../lib/product'

const Sec = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-10">
    <h2 className="text-2xl font-extrabold mb-3 text-slate-900">{title}</h2>
    <div className="text-slate-600 leading-relaxed space-y-2">{children}</div>
  </section>
)

export default function SecurityPage() {
  return (
    <Layout>
      <Head>
        <title>{`${PRODUCT.name} — Security & Compliance`}</title>
        <meta name="description" content={`How ${PRODUCT.name} handles your data and its honest compliance posture.`} />
      </Head>
      <div className="max-w-3xl">
        <div className="text-xs font-bold tracking-widest uppercase text-indigo-600 mb-3">Security &amp; Compliance</div>
        <h1 className="text-4xl font-extrabold tracking-tight mb-4">Your data, our posture</h1>
        <p className="text-lg text-slate-600 mb-10">
          PrivScan processes the inputs you submit for analysis. This page states, plainly, what we handle and what we do not claim.
        </p>

        <Sec title="What we handle">
          <p>website/app URLs and data-practice descriptions you submit for GDPR gap screening.</p>
        </Sec>

        <Sec title="Data handling commitments">
          <ul className="list-disc pl-5 space-y-1">
            <li>Submissions run the product pipeline and are retained only as long as needed for your audit log (paid tiers) or until you delete the run.</li>
            <li>We apply access controls consistent with <strong>GDPR Art. 32</strong> (security of processing) where personal data is processed.</li>
            <li>BYOK keys (Enterprise), when offered, are stored <strong>server-side only</strong> and never exposed to the browser.</li>
          </ul>
        </Sec>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 mb-10 text-sm text-amber-900">
          <strong>Honesty rule:</strong> PrivScan is decision-support, not a law firm. We do not guarantee GDPR compliance, 100% coverage of trackers, or that you will never miss a gap. We do <strong>not</strong> claim guarantee / 100% / never miss.
        </div>

        <Sec title="Our compliance posture">
          <ul className="list-disc pl-5 space-y-1">
            <li>PrivScan is <strong>decision-support</strong>, not a law firm, clinic, or certified auditor.</li>
            <li>For binding advice, consult a qualified professional in the relevant domain.</li>
          </ul>
        </Sec>

        <Sec title="Subprocessors &amp; payments">
          <ul className="list-disc pl-5 space-y-1">
            <li>Payments are processed by <strong>Waffo Pancake</strong> (merchant of record).</li>
            <li>See <a className="text-indigo-600 font-semibold underline" href="/privacy.html">Privacy</a> and <a className="text-indigo-600 font-semibold underline" href="/terms.html">Terms</a> for full terms.</li>
          </ul>
        </Sec>

        <p className="text-xs text-slate-400 mt-8">
          refs: GDPR Art. 6 (lawfulness) · GDPR Art. 7 (consent) · GDPR Art. 32 (security of processing)
        </p>
      </div>
    </Layout>
  )
}
