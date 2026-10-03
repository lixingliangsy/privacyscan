import NextDocument, { Html, Head, Main, NextScript } from 'next/document'
import { Lang, LOCALES, LOCALE_META, SITE_URL } from '../lib/i18n/config'
import { detectLocaleFromReq } from '../lib/i18n/detect'

export default function Document(props: { locale: Lang }) {
  const locale = props.locale || 'en'
  return (
    <Html lang={locale} dir={LOCALE_META[locale].dir}>
      <Head>
        <link rel="alternate" hrefLang="x-default" href={SITE_URL + '/'} />
        {LOCALES.map((l) => (
          <link key={l} rel="alternate" hrefLang={LOCALE_META[l].hrefLang} href={SITE_URL + '/'} />
        ))}
        <link
          rel="icon"
          href="data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20viewBox%3D%270%200%2064%2064%27%3E%3Crect%20width%3D%2764%27%20height%3D%2764%27%20rx%3D%2714%27%20fill%3D%27%231B63FF%27%2F%3E%3Ctext%20x%3D%2750%25%27%20y%3D%2754%25%27%20text-anchor%3D%27middle%27%20font-family%3D%27Arial%2CHelvetica%2Csans-serif%27%20font-size%3D%2736%27%20font-weight%3D%27700%27%20fill%3D%27%23ffffff%27%3EA%3C%2Ftext%3E%3C%2Fsvg%3E"
        />
        <meta name="msvalidate.01" content="67A87A31F2E91BD24E208E507247B782" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}

Document.getInitialProps = async (ctx: any) => {
  const initialProps = await NextDocument.getInitialProps(ctx)
  const locale = detectLocaleFromReq(ctx.req)
  return { ...initialProps, locale }
}
