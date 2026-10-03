import Head from 'next/head'
import Layout from '../components/Layout'
import { useT } from '../lib/i18n/provider'

const SITE = 'https://privacyscan.lxsaihub.com'
const POSTS = [
  { slug: 'gdpr-readiness-checklist-for-saas-2026', titleKey: 'blog.post1Title', descKey: 'blog.post1Desc', pillar: true },
  { slug: 'privacy-policy-gaps-ai-products-find-first-2026', titleKey: 'blog.post2Title', descKey: 'blog.post2Desc', pillar: true },
]

export default function BlogPage() {
  const { t, locale } = useT()
  const cards = [
    { title: t('blog.card1Title'), body: t('blog.card1Body') },
    { title: t('blog.card2Title'), body: t('blog.card2Body') },
  ]
  const articleScripts = POSTS.map((p) => ({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: t(p.titleKey),
    description: t(p.descKey),
    inLanguage: locale,
    mainEntityOfPage: `${SITE}/blog/read/${p.slug}`,
  }))
  return (
    <Layout>
      <Head>
        <title>{t('blog.metaTitle')}</title>
        <meta name="description" content={t('blog.metaDesc')} />
        {articleScripts.map((ld, i) => (
          <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
        ))}
      </Head>
      <div className="max-w-3xl">
        <section className="mb-10">
          <h2 className="text-xl font-bold text-slate-900">{t('blog.glanceTitle')}</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-700 list-disc pl-5">
            <li>{t('blog.glance1')}</li>
            <li>{t('blog.glance2')}</li>
            <li>{t('blog.glance3')}</li>
          </ul>
        </section>
        <div className="text-xs font-bold tracking-widest uppercase text-indigo-600 mb-3">{t('blog.eyebrow')}</div>
        <h1 className="text-4xl font-extrabold tracking-tight mb-4">{t('blog.h1')}</h1>
        <p className="text-lg text-slate-600 mb-10">{t('blog.lead')}</p>
        <div className="space-y-8">
          {cards.map((c) => (
            <article key={c.title} className="border-b border-slate-200 pb-8">
              <h2 className="text-2xl font-bold mb-2 text-slate-900">{c.title}</h2>
              <p className="text-slate-700 leading-relaxed">{c.body}</p>
            </article>
          ))}
        </div>
        <h2 className="text-2xl font-bold mt-14 mb-2 text-slate-900">{t('blog.guidesTitle')}</h2>
        <p className="text-sm text-slate-500 mb-6">{t('blog.guidesLead')}</p>
        <div className="space-y-5">
          {POSTS.map((p) => (
            <div key={p.slug} className="border-b border-slate-200 pb-5">
              <h3 className="text-xl font-semibold">
                <a href={`/blog/read/${p.slug}`} className="text-indigo-700 hover:underline">{t(p.titleKey)}</a>
              </h3>
              <p className="text-sm text-slate-600 mt-1">{t(p.descKey)}</p>
              <p className="text-xs text-slate-400 mt-2">
                <a href={`/blog/read/${p.slug}`} className="underline">{t('blog.readI18n')}</a>
                {locale === 'en' ? (
                  <>
                    {' · '}
                    <a href={`/blog/${p.slug}.html`} className="underline">{t('blog.readEnHtml')}</a>
                  </>
                ) : null}
              </p>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-8">{t('blog.footerNote')}</p>
      </div>
    </Layout>
  )
}
