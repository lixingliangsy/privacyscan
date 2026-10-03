import type { AppProps } from 'next/app'
import NextApp from 'next/app'
import Head from 'next/head'
import Script from 'next/script'
import '../styles/globals.css'
import ChatWidget from '../components/ChatWidget'
import FeedbackWidget from '../components/FeedbackWidget'
import InlineFeedback from '../components/InlineFeedback'
import { SUPPORT } from '../lib/support.config'
import { I18nProvider } from '../lib/i18n/provider'
import { Lang, SITE_URL } from '../lib/i18n/config'
import { detectLocaleFromReq, detectLocaleFromBrowser } from '../lib/i18n/detect'
import { createTranslator } from '../lib/i18n'
import { useRouter } from 'next/router';

const UMAMI_ID = process.env.NEXT_PUBLIC_UMAMI_ID
const UMAMI_URL = (process.env.NEXT_PUBLIC_UMAMI_URL || 'https://analytics.umami.is').replace(/\/$/, '')

export default function App({ Component, pageProps, locale }: AppProps & { locale: Lang }) {
  const router = useRouter();
  const __canonPath = (() => { const p = (router.asPath || '/').split('#')[0].split('?')[0] || '/'; const lm = (router.asPath || '').match(/[?&]lang=([^&#]*)/); return p === '/' ? '/' : p + (lm ? '?lang=' + lm[1] : ''); })();
  const tr = createTranslator(locale)
  const TITLE = tr.t('meta.title')
  const DESC = tr.t('meta.description')

  return (
    <>
      <Head>
        <title>{TITLE}</title>
        <meta property="og:type" content="website" />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESC} />
        <meta property="og:url" content={'https://privacyscan.lxsaihub.com' + __canonPath} />
{!router.pathname.includes('[') && router.pathname !== '/404' && router.pathname !== '/500' && (
        <link rel="canonical" href={'https://privacyscan.lxsaihub.com' + __canonPath} />
        )}
        <meta property="og:image" content={SITE_URL + '/og.png'} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={TITLE} />
        <meta name="twitter:description" content={DESC} />
        <meta name="twitter:image" content={SITE_URL + '/og.png'} />
        {/* JSON-LD SSR-only (P0) — keep dangerouslySetInnerHTML, never useEffect */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: 'PrivScan',
              alternateName: ['PrivScan by LX AI', 'PrivScan by LX AI Micro-SaaS Factory'],
              url: SITE_URL + '/',
              description: DESC,
              inLanguage: locale,
              applicationCategory: 'BusinessApplication',
              operatingSystem: 'Web',
              offers: {
                '@type': 'Offer',
                priceCurrency: 'USD',
                price: '29',
                availability: 'https://schema.org/OnlineOnly',
              },
              publisher: {
                '@type': 'Organization',
                '@id': 'https://lxsaihub.com/#organization',
                name: 'LX AI Micro-SaaS Factory',
                url: 'https://lxsaihub.com/',
                email: 'lixingliangsy@163.com',
              },
              creator: {
                '@type': 'Organization',
                name: 'LX AI Micro-SaaS Factory',
                url: 'https://lxsaihub.com/',
              },
              isPartOf: {
                '@type': 'WebSite',
                name: 'LX AI Micro-SaaS Directory',
                url: 'https://lxsaihub.com/',
              },
              sameAs: ['https://lxsaihub.com/tools/privacyscan.html', 'https://lxsaihub.com/'],
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              '@id': SITE_URL + '/#publisher',
              name: 'LX AI Micro-SaaS Factory',
              alternateName: ['LX AI', 'lxsaihub', 'LX Micro-SaaS Factory', 'PrivScan by LX AI'],
              url: 'https://lxsaihub.com/',
              email: 'lixingliangsy@163.com',
              sameAs: ['https://github.com/lixingliangsy/lxsaihub', SITE_URL + '/'],
              brand: { '@type': 'Brand', name: 'PrivScan' },
            }),
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html:
              '(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window, document, "clarity", "script", "ylcqozjwcx");',
          }}
        />
      </Head>
      {UMAMI_ID && (
        <Script
          async
          src={`${UMAMI_URL}/script.js`}
          data-website-id={UMAMI_ID}
          strategy="afterInteractive"
        />
      )}
      <I18nProvider initialLocale={locale}>
        <Component {...pageProps} />
        <ChatWidget
          productName={SUPPORT.productName}
          brandColor={SUPPORT.brandColor}
          sessionKeyPrefix={SUPPORT.productSlug}
        />
        <InlineFeedback />
        <FeedbackWidget />
      </I18nProvider>
    </>
  )
}

App.getInitialProps = async (appCtx: any) => {
  const appProps = await NextApp.getInitialProps(appCtx)
  const locale = appCtx.ctx.req ? detectLocaleFromReq(appCtx.ctx.req) : detectLocaleFromBrowser()
  return { ...appProps, locale }
}
