import Head from 'next/head'
import Layout from '../components/Layout'
import { useT } from '../lib/i18n/provider'

const SITE = 'https://privacyscan.lxsaihub.com'

export default function SecurityPage() {
  const { t, locale } = useT()
  const title = t('pages.secTitle')
  const desc = t('pages.secDesc')
  const data = [1, 2, 3].map((n) => t(`pages.secData${n}`))
  const posture = [1, 2].map((n) => t(`pages.secPosture${n}`))
  const subs = [1, 2].map((n) => t(`pages.secSub${n}`))
  const ld = { '@context': 'https://schema.org', '@type': 'WebPage', name: title, url: SITE + '/security', description: desc, inLanguage: locale }
  return (
    <Layout>
      <Head>
        <title>{title}</title>
        <meta name="description" content={desc} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      </Head>
      <div className="max-w-3xl">
        <div className="text-xs font-bold tracking-widest uppercase text-indigo-600 mb-3">{t('pages.secEyebrow')}</div>
        <h1 className="text-4xl font-extrabold tracking-tight mb-4">{t('pages.secH1')}</h1>
        <p className="text-lg text-slate-600 mb-10">{t('pages.secIntro')}</p>
        <section className="mb-10">
          <h2 className="text-2xl font-extrabold mb-3 text-slate-900">{t('pages.secHandleH2')}</h2>
          <p className="text-slate-600">{t('pages.secHandleBody')}</p>
        </section>
        <section className="mb-10">
          <h2 className="text-2xl font-extrabold mb-3 text-slate-900">{t('pages.secDataH2')}</h2>
          <ul className="list-disc pl-5 space-y-1 text-slate-600">{data.map((x, i) => <li key={i}>{x}</li>)}</ul>
        </section>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 mb-10 text-sm text-amber-900">{t('pages.secHonesty')}</div>
        <section className="mb-10">
          <h2 className="text-2xl font-extrabold mb-3 text-slate-900">{t('pages.secPostureH2')}</h2>
          <ul className="list-disc pl-5 space-y-1 text-slate-600">{posture.map((x, i) => <li key={i}>{x}</li>)}</ul>
        </section>
        <section className="mb-10">
          <h2 className="text-2xl font-extrabold mb-3 text-slate-900">{t('pages.secSubH2')}</h2>
          <ul className="list-disc pl-5 space-y-1 text-slate-600">{subs.map((x, i) => <li key={i}>{x}</li>)}</ul>
        </section>
        <p className="text-xs text-slate-400 mt-8">{t('pages.secRefs')}</p>
      </div>
    </Layout>
  )
}
