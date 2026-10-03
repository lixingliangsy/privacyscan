import Head from 'next/head'
import Layout from '../components/Layout'
import { useT } from '../lib/i18n/provider'

const SITE = 'https://privacyscan.lxsaihub.com'

export default function IntegrationsPage() {
  const { t, locale } = useT()
  const title = t('pages.intTitle')
  const desc = t('pages.intDesc')
  const rows = [1, 2, 3, 4].map((n) => ({ title: t(`pages.int${n}Title`), body: t(`pages.int${n}Body`) }))
  const ld = { '@context': 'https://schema.org', '@type': 'WebPage', name: title, url: SITE + '/integrations', description: desc, inLanguage: locale }
  return (
    <Layout>
      <Head>
        <title>{title}</title>
        <meta name="description" content={desc} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      </Head>
      <div className="max-w-4xl">
        <div className="text-xs font-bold tracking-widest uppercase text-indigo-600 mb-3">{t('pages.intEyebrow')}</div>
        <h1 className="text-4xl font-extrabold tracking-tight mb-4">{t('pages.intH1')}</h1>
        <p className="text-lg text-slate-600 mb-10">{t('pages.intIntro')}</p>
        <div className="grid md:grid-cols-2 gap-5">
          {rows.map((r) => (
            <div key={r.title} className="rounded-2xl border border-slate-200 p-6 bg-white">
              <h2 className="text-lg font-bold mb-2 text-slate-900">{r.title}</h2>
              <p className="text-sm text-slate-600">{r.body}</p>
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 mt-6 text-sm text-amber-900">
          <strong>{t('pages.intHonesty')}</strong>
        </div>
      </div>
    </Layout>
  )
}
