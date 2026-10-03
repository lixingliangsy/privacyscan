import Head from 'next/head'
import Layout from '../components/Layout'
import { useT } from '../lib/i18n/provider'

const SITE = 'https://privacyscan.lxsaihub.com'

export default function UseCasesPage() {
  const { t, locale } = useT()
  const title = t('pages.ucTitle')
  const desc = t('pages.ucDesc')
  const segs = [1, 2, 3, 4].map((n) => ({ name: t(`pages.uc${n}Title`), pain: t(`pages.uc${n}Pain`), help: t(`pages.uc${n}Help`) }))
  const ld = { '@context': 'https://schema.org', '@type': 'WebPage', name: title, url: SITE + '/use-cases', description: desc, inLanguage: locale }
  return (
    <Layout>
      <Head>
        <title>{title}</title>
        <meta name="description" content={desc} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      </Head>
      <div className="max-w-4xl">
        <div className="text-xs font-bold tracking-widest uppercase text-indigo-600 mb-3">{t('pages.ucEyebrow')}</div>
        <h1 className="text-4xl font-extrabold tracking-tight mb-4">{t('pages.ucH1')}</h1>
        <p className="text-lg text-slate-600 mb-10">{t('pages.ucIntro')}</p>
        <div className="space-y-5">
          {segs.map((s) => (
            <div key={s.name} className="rounded-2xl border border-slate-200 p-6 bg-white">
              <h2 className="text-xl font-bold mb-2 text-slate-900">{s.name}</h2>
              <p className="text-sm text-slate-600 mb-2"><span className="font-semibold text-slate-900">{t('pages.painLabel')} </span>{s.pain}</p>
              <p className="text-sm text-slate-600"><span className="font-semibold text-slate-900">{t('pages.helpLabel')} </span>{s.help}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-8">{t('pages.ucRefs')}</p>
      </div>
    </Layout>
  )
}
