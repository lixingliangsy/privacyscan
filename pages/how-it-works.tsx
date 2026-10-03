import Head from 'next/head'
import Layout from '../components/Layout'
import { useT } from '../lib/i18n/provider'

const SITE = 'https://privacyscan.lxsaihub.com'

export default function HowItWorksPage() {
  const { t, locale } = useT()
  const title = t('pages.howTitle')
  const desc = t('pages.howDesc')
  const steps = [1, 2, 3].map((n) => ({ title: t(`pages.how${n}Title`), body: t(`pages.how${n}Body`) }))
  const ld = { '@context': 'https://schema.org', '@type': 'WebPage', name: title, url: SITE + '/how-it-works', description: desc, inLanguage: locale }
  return (
    <Layout>
      <Head>
        <title>{title}</title>
        <meta name="description" content={desc} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      </Head>
      <div className="max-w-4xl">
        <div className="text-xs font-bold tracking-widest uppercase text-indigo-600 mb-3">{t('pages.howEyebrow')}</div>
        <h1 className="text-4xl font-extrabold tracking-tight mb-4">{t('pages.howH1')}</h1>
        <div className="grid md:grid-cols-3 gap-6 mt-8">
          {steps.map((s, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="w-10 h-10 rounded-full bg-indigo-600 text-white grid place-items-center font-black mb-4">{i + 1}</div>
              <h3 className="font-bold text-lg mb-2 text-slate-900">{s.title}</h3>
              <p className="text-slate-600 text-sm">{s.body}</p>
            </div>
          ))}
        </div>
        <div className="text-center mt-10">
          <a href="/#signup" className="px-6 py-3 rounded-full bg-indigo-600 text-white font-bold inline-block">{t('pages.subscribe')}</a>
        </div>
      </div>
    </Layout>
  )
}
