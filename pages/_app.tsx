import type { AppProps } from 'next/app'
import Head from 'next/head'
import Script from 'next/script'
import '../styles/globals.css'
import { UMAMI_ID, UMAMI_URL } from '../lib/analytics'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <script src="https://cdn.tailwindcss.com" />
        <script
          dangerouslySetInnerHTML={{
            __html:
              "tailwind.config={theme:{extend:{colors:{brand:'#4f46e5'}}}}",
          }}
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Umami analytics loader (replaces the GA4 gtag loader).
          Emits the Umami script ONLY when NEXT_PUBLIC_UMAMI_ID is set, so a
          build with no env vars stays clean (no broken /script.js reference). */}
      {UMAMI_ID ? (
        <Script
          src={`${UMAMI_URL}/script.js`}
          data-website-id={UMAMI_ID}
          strategy="afterInteractive"
        />
      ) : null}

      <Component {...pageProps} />
    </>
  )
}
