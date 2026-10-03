import React, { FormEvent, useEffect, useMemo, useState } from 'react'
import Head from 'next/head'
import { PRODUCT } from '../lib/product'
import { buildProductJsonLd } from '../lib/schema'
import { useT } from '../lib/i18n/provider'
import LanguageSwitcher from '../components/LanguageSwitcher'

type Lead = {
  id: string
  email: string
  plan: string
  source: string
  note?: string
  createdAt: string
}

const Check = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6 9 17l-5-5" />
  </svg>
)

type DemoStep = { title: string; detail: string; preview?: string }

/** Product-specific tour — copy from i18n (home.demo*). */
function buildDemoSteps(
  t: (path: string, vars?: Record<string, string | number>) => string,
  name: string,
  preview?: string,
): DemoStep[] {
  return [
    { title: t('home.demo1Title', { name }), detail: t('home.demo1Detail', { name }) },
    { title: t('home.demo2Title'), detail: t('home.demo2Detail') },
    { title: t('home.demo3Title'), detail: t('home.demo3Detail') },
    {
      title: t('home.demo4Title'),
      detail: preview ? t('home.demo4Detail') : t('home.demo4DetailEmpty'),
      preview: preview || undefined,
    },
    { title: t('home.demo5Title'), detail: t('home.demo5Detail', { name }) },
  ]
}



export default function Home() {
  const { t, catalog, locale } = useT()
  const faqItems = ((catalog as any)?.faq?.items || []) as Array<{ q: string; a: string }>
  const geoFaqItems = ((catalog as any)?.faq?.geoItems || []) as Array<{ q: string; a: string }>
  const faqLd = geoFaqItems.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "@id": ((PRODUCT as any).slug || "") + ".lxsaihub.com/#faq-geo",
        inLanguage: locale,
        mainEntity: geoFaqItems.map((x) => ({
          "@type": "Question",
          name: x.q,
          acceptedAnswer: { "@type": "Answer", text: x.a }
        }))
      }
    : null;
  const [menuOpen, setMenuOpen] = useState(false)
  const [toast, setToast] = useState('')
  const [email, setEmail] = useState('')
  const [signupBusy, setSignupBusy] = useState(false)
  const [signupMsg, setSignupMsg] = useState('')
  const [topic, setTopic] = useState('Quick demo for ' + PRODUCT.name)
  const [result, setResult] = useState('')
  const [toolBusy, setToolBusy] = useState(false)
  const [toolStatus, setToolStatus] = useState('')
  const [runId, setRunId] = useState('')
  const [pipelineLabel, setPipelineLabel] = useState('')
  const [useDemoMode, setUseDemoMode] = useState(true)
  const [demoMode, setDemoMode] = useState(false)
  const [leads, setLeads] = useState<Lead[]>([])
  const [leadFilter, setLeadFilter] = useState('')
  const [planFilter, setPlanFilter] = useState('')
  const [demoOpen, setDemoOpen] = useState(false)
  const [demoStep, setDemoStep] = useState(0)
  const [demoPlaying, setDemoPlaying] = useState(false)
  const price = (PRODUCT as any).priceMonthly ?? 29
  const priceYearly = (PRODUCT as any).priceYearly ?? Math.round(price * 10)
  const priceYearlyMonthly = Math.round(priceYearly / 12)
  const features: string[] = (PRODUCT as any).features || []
  const mark = (PRODUCT.name || 'A').trim().charAt(0).toUpperCase()
    const demoPreview = useMemo(() => {
    const p = PRODUCT as any
    const inputs: Array<{ key: string; label: string; type?: string; placeholder?: string; options?: string[] }> = Array.isArray(p.inputs) ? p.inputs : []
    const sampleInputs: Record<string, string> = {}
    for (const f of inputs) {
      const ph = String(f.placeholder || '').replace(/^e\.g\.\s*/i, '')
      if (f.type === 'select' && f.options && f.options.length) sampleInputs[f.key] = String(f.options[0])
      else if (ph) sampleInputs[f.key] = ph
      else sampleInputs[f.key] = `Sample ${f.label}`
    }
    try {
      if (typeof p.mock === 'function') return String(p.mock(sampleInputs)).replace(/\\n/g, '\n').slice(0, 360)
    } catch { /* ignore */ }
    return ''
  }, [])
  const demoSteps = useMemo(
    () => buildDemoSteps(t, String((PRODUCT as any).name || 'Product'), demoPreview),
    [t, locale, demoPreview],
  )

  function showToast(msg: string) {
    setToast(msg)
    window.setTimeout(() => setToast(''), 2600)
  }

  function openDemo(e?: React.MouseEvent) {
    e?.preventDefault()
    setDemoOpen(true)
    setDemoPlaying(true)
    setDemoStep(0)
  }

  useEffect(() => {
    if (!demoOpen || !demoPlaying) return
    if (demoStep >= demoSteps.length - 1) {
      setDemoPlaying(false)
      return
    }
    const t = window.setTimeout(() => setDemoStep((s) => s + 1), 1100)
    return () => window.clearTimeout(t)
  }, [demoOpen, demoPlaying, demoStep, demoSteps.length])

  async function loadLeads() {
    try {
      const qs = new URLSearchParams()
      if (planFilter) qs.set('plan', planFilter)
      if (leadFilter.trim()) qs.set('q', leadFilter.trim())
      const r = await fetch('/api/leads?' + qs.toString())
      const data = await r.json()
      if (r.ok && data.ok) setLeads(data.leads || [])
    } catch {
      /* optional */
    }
  }

  useEffect(() => {
    loadLeads()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planFilter, leadFilter])

  useEffect(() => {
    const accs = Array.from(document.querySelectorAll<HTMLDetailsElement>('details.acc'))
    const onToggle = (ev: Event) => {
      const t = ev.currentTarget as HTMLDetailsElement
      if (t.open) accs.forEach((o) => {
        if (o !== t) o.open = false
      })
    }
    accs.forEach((a) => a.addEventListener('toggle', onToggle))
    return () => accs.forEach((a) => a.removeEventListener('toggle', onToggle))
  }, [])


  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search)
      const err = q.get('checkout_error')
      if (err) {
        showToast(
          err === 'missing_product_id'
            ? 'Checkout is not configured for this plan yet. Please contact support.'
            : 'Checkout temporarily unavailable. Please try again in a moment.'
        )
        const url = new URL(window.location.href)
        url.searchParams.delete('checkout_error')
        window.history.replaceState({}, '', url.pathname + url.search + url.hash)
      }
    } catch {
      /* ignore */
    }
  }, [])

  async function submitLead(plan: 'free' | 'pro' | 'enterprise' | 'sales', source: string, note?: string) {
    const value = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setSignupMsg('Please enter a valid email.')
      return null
    }
    setSignupBusy(true)
    setSignupMsg('')
    try {
      const r = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: value, plan, source, note }),
      })
      const data = await r.json()
      if (!r.ok || !data.ok) throw new Error(data.error || 'Signup failed')
      if (plan === 'free') {
        window.location.href = '/api/checkout'
        return data.lead as Lead
      }
      setSignupMsg("You're in — opening the studio…")
      showToast('Lead saved: ' + value)
      await loadLeads()
      document.getElementById('studio')?.scrollIntoView({ behavior: 'smooth' })
      return data.lead as Lead
    } catch (e: any) {
      setSignupMsg(e?.message || 'Signup failed')
      return null
    } finally {
      setSignupBusy(false)
    }
  }

  async function onSignup(e: FormEvent) {
    e.preventDefault()
    await submitLead('free', 'final_cta')
  }

  async function runStudio(e?: FormEvent) {
    e?.preventDefault()
    setToolBusy(true)
    setToolStatus('')
    setDemoMode(false)
    try {
      const inputMap: Record<string, string> = { topic }
      const fields = Array.isArray((PRODUCT as any).inputs) ? (PRODUCT as any).inputs : []
      if (fields[0]?.key) inputMap[fields[0].key] = topic
      for (const k of ['text', 'code', 'url', 'pattern', 'schema', 'instance', 'commits', 'notes']) {
        if (!inputMap[k]) inputMap[k] = topic
      }
      const r = await fetch('/api/tool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ useMock: useDemoMode, inputs: inputMap, action: 'start' }),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) {
        setResult(String(data.error || 'Request failed'))
        setToolStatus(`Error ${r.status}`)
        setDemoMode(false)
        return
      }
      setResult(String(data.result || JSON.stringify(data, null, 2)).replace(/\\n/g, '\n'))
      setRunId(String(data.runId || ''))
      setPipelineLabel(String(data.stepLabel || ''))
      setDemoMode(!!data.demo)
      setToolStatus(data.demo ? 'Demo mode — not live AI' : 'Live workflow')
    } catch (err: any) {
      setResult(String(err?.message || 'Network error'))
      setToolStatus('Error')
      setDemoMode(false)
    } finally {
      setToolBusy(false)
    }
  }

  async function deleteLeadRow(id: string) {
    try {
      const r = await fetch('/api/leads?id=' + encodeURIComponent(id), { method: 'DELETE' })
      const data = await r.json()
      if (!r.ok || !data.ok) throw new Error(data.error || 'Delete failed')
      showToast('Lead deleted')
      await loadLeads()
    } catch (e: any) {
      showToast(e?.message || 'Delete failed')
    }
  }

  function goCheckout(path: string, e?: React.MouseEvent) {
    e?.preventDefault()
    window.location.href = path
  }

  const filteredHint = useMemo(() => {
    if (!planFilter && !leadFilter) return t('home.leadsCount', { n: String(leads.length) })
    return t('home.leadsFiltered', { n: String(leads.length) })
  }, [leads, planFilter, leadFilter, t, locale])

  const featCards = [t('home.feat1'), t('home.feat2'), t('home.feat3'), t('home.feat4')]

  return (
    <>
      <Head>
        {/* title via _app meta */}<title>{t('meta.title')}</title>
        <meta name="description" content={PRODUCT.description} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="alternate" type="text/plain" href="https://privacyscan.lxsaihub.com/llms.txt" title="LLM manifest" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
        "@context": "https://schema.org",
        "@graph": [
                {
                        "@type": "Organization",
                        "@id": "https://privacyscan.lxsaihub.com/#organization",
                        "name": "PrivScan",
			"parentOrganization": {"@type":"Organization","@id":"https://lxsaihub.com/#organization","name":"LX AI Micro-SaaS Factory","url":"https://lxsaihub.com/","email":"lixingliangsy@163.com"},
                        "alternateName": "PrivScan by LX AI Micro-SaaS Factory",
                        "url": "https://privacyscan.lxsaihub.com/",
                        "logo": "https://privacyscan.lxsaihub.com/og-cover.svg",
                        "sameAs": [
                                "https://lxsaihub.com/tools/privacyscan.html",
                                "https://lxsaihub.com/"
                        ]
                },
                {
                        "@type": "WebSite",
                        "@id": "https://privacyscan.lxsaihub.com/#website",
                        "url": "https://privacyscan.lxsaihub.com/",
                        "name": "PrivScan",
                        "publisher": {
                                "@id": "https://privacyscan.lxsaihub.com/#organization"
                        },
                        "inLanguage": "en",
                        "potentialAction": {
                                "@type": "SearchAction",
                                "target": {
                                        "@type": "EntryPoint",
                                        "urlTemplate": "https://privacyscan.lxsaihub.com/?q={search_term_string}"
                                },
                                "query-input": "required name=search_term_string"
                        }
                },
                {
                        "@type": "SoftwareApplication",
                        "name": "PrivScan",
                        "dateModified": "2026-09-11",
                        "alternateName": "PrivScan by LX AI Micro-SaaS Factory",
                        "sameAs": [
                                "https://lxsaihub.com/tools/privacyscan.html"
                        ],
                        "url": "https://privacyscan.lxsaihub.com/",
                        "applicationCategory": "DeveloperApplication",
                        "operatingSystem": "Web",
                        "offers": [
                                {
                                        "@type": "Offer",
                                        "name": "Free",
                                        "price": "0",
                                        "priceCurrency": "USD"
                                },
                                {
                                        "@type": "Offer",
                                        "name": "Pro",
                                        "price": "29",
                                        "priceCurrency": "USD"
                                },
                                {
                                        "@type": "Offer",
                                        "name": "Team",
                                        "price": "79",
                                        "priceCurrency": "USD"
                                }
                        ],
                        "creator": {
                                "@id": "https://privacyscan.lxsaihub.com/#organization"
                        }
                },
                {
                        "@type": "FAQPage",
                        "@id": "https://privacyscan.lxsaihub.com/#faq",
                        "inLanguage": "en",
                        "mainEntity": [
                                {
                                        "@type": "Question",
                                        "name": "What is PrivScan?",
                                        "acceptedAnswer": {
                                                "@type": "Answer",
                                                "text": "PrivScan turns natural-language company policies — security, data handling, acceptable use, AI governance — into machine-enforceable rules that guard your AI agents."
                                        }
                                },
                                {
                                        "@type": "Question",
                                        "name": "How does it work?",
                                        "acceptedAnswer": {
                                                "@type": "Answer",
                                                "text": "You describe a policy in plain language; PrivScan's policy-to-rules engine produces enforceable checks, a compliance checklist, and an EU AI Act mapping, all exportable as configuration."
                                        }
                                },
                                {
                                        "@type": "Question",
                                        "name": "Which policies can I encode?",
                                        "acceptedAnswer": {
                                                "@type": "Answer",
                                                "text": "Security boundaries, data-handling rules, acceptable-use policies, and EU AI Act obligations — anything your agents must obey at runtime."
                                        }
                                },
                                {
                                        "@type": "Question",
                                        "name": "What are the pricing tiers?",
                                        "acceptedAnswer": {
                                                "@type": "Answer",
                                                "text": "Free ($0) includes core policy-to-rules. Pro is $29/mo. Team is $79/mo and adds shared rule libraries and audit exports."
                                        }
                                },
                                {
                                        "@type": "Question",
                                        "name": "Can I export rules to my own stack?",
                                        "acceptedAnswer": {
                                                "@type": "Answer",
                                                "text": "Yes. Generated rules export as configuration/JSON you can wire into your agent runtime or a guardrails layer."
                                        }
                                },
                                {
                                        "@type": "Question",
                                        "name": "Does it map to the EU AI Act?",
                                        "acceptedAnswer": {
                                                "@type": "Answer",
                                                "text": "Yes. PrivScan maps obligations such as Art. 9 (risk management), Art. 11 (technical documentation), and Art. 14 (human oversight) to enforceable checks."
                                        }
                                },
                                {
                                        "@type": "Question",
                                        "name": "Does PrivScan enforce at runtime, or just generate rules?",
                                        "acceptedAnswer": {
                                                "@type": "Answer",
                                                "text": "It generates and validates the rules; enforcement plugs into your existing agent runtime or guardrails middleware."
                                        }
                                },
                                {
                                        "@type": "Question",
                                        "name": "Who is PrivScan for?",
                                        "acceptedAnswer": {
                                                "@type": "Answer",
                                                "text": "AI platform teams, compliance and ops leads, and startups shipping autonomous or semi-autonomous agents."
                                        }
                                },
                                {
                                        "@type": "Question",
                                        "name": "Is it self-hosted or cloud?",
                                        "acceptedAnswer": {
                                                "@type": "Answer",
                                                "text": "PrivScan is a cloud SaaS; subscriptions are handled through Waffo (merchant of record)."
                                        }
                                },
                                {
                                        "@type": "Question",
                                        "name": "Does the free tier have limits?",
                                        "acceptedAnswer": {
                                                "@type": "Answer",
                                                "text": "Free includes the core policy-to-rules engine and checklist; higher-volume and team features require Pro or Team."
                                        }
                                }
                        ]
                }
        ]
})
          }}
        />
              <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(buildProductJsonLd(PRODUCT, "https://privacyscan.lxsaihub.com")) }}
        />
              <link rel="alternate" hrefLang="en" href="https://privacyscan.lxsaihub.com/" />
        <link rel="alternate" hrefLang="x-default" href="https://privacyscan.lxsaihub.com/" />
                      {faqLd && (
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
        )}
</Head>

      <div className="min-h-screen bg-white text-slate-900">
        <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-slate-200">
      <a href="https://lxsaihub.com" data-back-to-hub="1" style={{display:"inline-flex",alignItems:"center",gap:"4px",marginRight:"12px",fontWeight:600,color:"inherit",textDecoration:"none"}}>← {t('nav.backToHub')}</a>
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            <a href="#top" className="flex items-center gap-2 font-extrabold text-lg">
              <span className="w-9 h-9 rounded-xl bg-indigo-600 text-white grid place-items-center">{mark}</span>
              {PRODUCT.name}
            </a>
            <nav className="hidden md:flex gap-5 text-sm font-semibold text-slate-500 items-center">
              <a href="#features" className="hover:text-slate-900">{t('nav.features')}</a>
              <a href="/use-cases" className="hover:text-slate-900">{t('nav.useCases')}</a>
              <a href="/integrations" className="hover:text-slate-900">{t('nav.integrations')}</a>
              <a href="#how" className="hover:text-slate-900">{t('nav.howItWorks')}</a>
              <a href="/security" className="hover:text-slate-900">{t('nav.security')}</a>
              <a href="#pricing" className="hover:text-slate-900">{t('nav.pricing')}</a>
              <a href="/blog" className="hover:text-slate-900">{t('nav.blog')}</a>
              <a href="#faq" className="hover:text-slate-900">{t('nav.faq')}</a>
              <a href="/feedback" className="hover:text-slate-900">{t('nav.feedback')}</a>
              <LanguageSwitcher />
            </nav>
            <div className="hidden md:flex gap-3 items-center">
              <a href="#signup" className="px-4 py-2 rounded-full border border-slate-200 font-semibold text-sm">{t('nav.signIn')}</a>
              <a href="#signup" className="px-4 py-2 rounded-full bg-indigo-600 text-white font-semibold text-sm">{t('nav.subscribe')}</a>
            </div>
            <button type="button" className="md:hidden p-2" aria-label={t('common.menu')} onClick={() => setMenuOpen((v) => !v)}>
              <span className="block w-6 h-0.5 bg-slate-900 mb-1" />
              <span className="block w-6 h-0.5 bg-slate-900 mb-1" />
              <span className="block w-6 h-0.5 bg-slate-900" />
            </button>
          </div>
          <div className="md:hidden px-6 py-2 flex justify-end border-b border-slate-100">
            <LanguageSwitcher />
          </div>
          {menuOpen ? (
            <div className="md:hidden px-6 pb-4 flex flex-col gap-2 border-b border-slate-200">
              {[
                ['features', t('nav.features')],
                ['how', t('nav.howItWorks')],
                ['studio', t('nav.studio')],
                ['pricing', t('nav.pricing')],
                ['faq', t('nav.faq')],
                ['signup', t('nav.subscribe')],
              ].map(([id, label]) => (
                <a key={id} href={`#${id}`} onClick={() => setMenuOpen(false)} className="py-2 font-semibold text-slate-600">
                  {label}
                </a>
              ))}
              <a href="/feedback" onClick={() => setMenuOpen(false)} className="py-2 font-semibold text-slate-600">{t('nav.feedback')}</a>
              <a href="/blog" onClick={() => setMenuOpen(false)} className="py-2 font-semibold text-slate-600">{t('nav.blog')}</a>
            </div>
          ) : null}
        </header>

        <section id="top" className="py-16 bg-gradient-to-br from-indigo-50 via-white to-violet-50">
          <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-10 items-center">
            <div>
              <div className="text-xs font-bold tracking-widest uppercase text-indigo-600 mb-3">{t('hero.badge')}</div>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">{t('hero.title')}</h1>
              <div className="mt-6 bg-white border border-slate-200 rounded-xl p-5 max-w-2xl" data-geo="key-takeaways">
                <p className="text-sm font-bold text-indigo-900 uppercase tracking-wide mb-2">{t('hero.keyTakeaways')}</p>
                <ul className="list-disc pl-5 space-y-1 text-slate-700 text-[15px] leading-relaxed">
                        <li>{t('hero.takeaway1')}</li>
                        <li>{t('hero.takeaway2')}</li>
                        <li>{t('hero.takeaway3')}</li>
                </ul>
              </div>
              <p className="text-lg text-slate-600 mb-6">{t('hero.subtitle')}</p>
              <div className="flex flex-wrap gap-3">
                <a href="#signup" className="px-6 py-3 rounded-full bg-indigo-600 text-white font-bold">{t('hero.ctaPrimary')}</a>
                <a href="#studio" className="px-6 py-3 rounded-full border border-indigo-200 text-indigo-700 font-bold bg-white">
                  {t('benchmark.ctaStudio')}
                </a>
                <button type="button" onClick={openDemo} className="px-6 py-3 rounded-full border border-slate-200 font-bold bg-white">
                  ▶ {t('hero.ctaSecondary')}
                </button>
              </div>
              <p className="mt-4 text-sm text-slate-500">{t('hero.note')}</p>
            </div>
            <button type="button" onClick={openDemo} className="text-left rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden group cursor-pointer">
              <div className="flex gap-2 px-4 py-3 bg-slate-50 border-b border-slate-200 items-center justify-between">
                <div className="flex gap-2">
                  <i className="w-3 h-3 rounded-full bg-red-400 block" />
                  <i className="w-3 h-3 rounded-full bg-amber-400 block" />
                  <i className="w-3 h-3 rounded-full bg-emerald-400 block" />
                </div>
                <span className="text-xs font-bold text-indigo-600 group-hover:underline">{t('hero.playDemo')}</span>
              </div>
              <div className="p-6 space-y-3 relative min-h-[180px]">
                <div className="h-3 bg-slate-100 rounded w-4/5 animate-pulse" />
                <div className="h-3 bg-slate-100 rounded w-3/5 animate-pulse" />
                <div className="h-3 bg-slate-100 rounded w-2/5" />
                <div className="mt-4 text-sm font-semibold text-indigo-600">{PRODUCT.name} · {t('hero.walkthrough')}</div>
              </div>
            </button>
          </div>
        </section>

        {/* Honest framework chips — replaces fabricated customer/uptime stats (honesty rule). */}
        <section id="frameworks" className="bg-slate-950 text-white py-12">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-8">
              <div className="text-xs font-bold tracking-widest uppercase text-indigo-300 mb-2">{t('benchmark.frameworksEyebrow')}</div>
              <h2 className="text-2xl md:text-3xl font-extrabold">{t('benchmark.frameworksTitle')}</h2>
              <p className="text-slate-400 text-sm mt-2 max-w-2xl mx-auto">{t('benchmark.frameworksNote')}</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              {[t('benchmark.fw1'), t('benchmark.fw2'), t('benchmark.fw3'), t('benchmark.fw4')].map((label) => (
                <div key={label} className="rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-4">
                  <div className="text-sm font-bold text-indigo-200">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="definition" className="py-20 bg-slate-50">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-xs font-bold tracking-widest uppercase text-indigo-600 mb-3">{t('legal.whatItIs')}</div>
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4">{t('legal.definitionTitle')}</h2>
            <p className="text-lg text-slate-600 max-w-3xl">{(PRODUCT as any).definitionLead}</p>
            <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 max-w-3xl">
              <h3 className="font-bold text-amber-900 mb-2">{t('legal.whatNotTitle')}</h3>
              <ul className="list-disc pl-5 space-y-1 text-sm text-amber-900/90">
                <li>{t('legal.whatNot1')}</li>
                <li>{t('legal.whatNot2')}</li>
                <li>{t('legal.whatNot3')}</li>
              </ul>
              <p className="mt-3 text-sm text-amber-800">
                <span className="font-semibold">{t('legal.controller')}</span>
                {' / '}
                <span className="font-semibold">{t('legal.processor')}</span>
                {' — '}
                {t('legal.rolesHint')}
              </p>
            </div>
          </div>
        </section>

        <section id="pain" className="py-16">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-10">
              <div className="text-xs font-bold tracking-widest uppercase text-indigo-600 mb-2">{t('benchmark.painEyebrow')}</div>
              <h2 className="text-3xl md:text-4xl font-extrabold">{t('benchmark.painTitle')}</h2>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                [t('benchmark.pain1Title'), t('benchmark.pain1Body')],
                [t('benchmark.pain2Title'), t('benchmark.pain2Body')],
                [t('benchmark.pain3Title'), t('benchmark.pain3Body')],
                [t('benchmark.pain4Title'), t('benchmark.pain4Body')],
              ].map(([title, body]) => (
                <div key={title} className="rounded-2xl border border-slate-200 p-5 bg-white">
                  <h3 className="font-bold mb-2">{title}</h3>
                  <p className="text-sm text-slate-600">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="what-you-get" className="py-16 bg-indigo-50/40">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-10">
              <div className="text-xs font-bold tracking-widest uppercase text-indigo-600 mb-2">{t('benchmark.getEyebrow')}</div>
              <h2 className="text-3xl md:text-4xl font-extrabold mb-3">{t('benchmark.getTitle')}</h2>
              <p className="text-slate-600 max-w-2xl mx-auto">{t('benchmark.getLead')}</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                [t('benchmark.get1Title'), t('benchmark.get1Body')],
                [t('benchmark.get2Title'), t('benchmark.get2Body')],
                [t('benchmark.get3Title'), t('benchmark.get3Body')],
                [t('benchmark.get4Title'), t('benchmark.get4Body')],
              ].map(([title, body]) => (
                <div key={title} className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm">
                  <h3 className="font-bold mb-2">{title}</h3>
                  <p className="text-sm text-slate-600">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="py-20">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-12">
              <div className="text-xs font-bold tracking-widest uppercase text-indigo-600 mb-3">{t('benchmark.featuresEyebrow')}</div>
              <h2 className="text-3xl md:text-4xl font-extrabold mb-3">{t('benchmark.featuresTitle')}</h2>
              <p className="text-slate-600 max-w-2xl mx-auto">{t('benchmark.featuresBlurb')}</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
              {featCards.map((f) => (
                <div key={f} className="rounded-2xl border border-slate-200 p-6 shadow-sm hover:-translate-y-1 transition bg-white">
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 grid place-items-center font-black mb-4">✦</div>
                  <h3 className="font-bold mb-2">{f}</h3>
                  <p className="text-sm text-slate-600">{t('benchmark.featuresBlurb')}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="how" className="py-20 bg-slate-50">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-extrabold">{t('benchmark.howTitle')}</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                ['1', t('benchmark.how1Title'), t('benchmark.how1Body')],
                ['2', t('benchmark.how2Title'), t('benchmark.how2Body')],
                ['3', t('benchmark.how3Title'), t('benchmark.how3Body')],
              ].map(([n, title, body]) => (
                <div key={n} className="bg-white rounded-2xl border border-slate-200 p-6">
                  <div className="w-10 h-10 rounded-full bg-indigo-600 text-white grid place-items-center font-black mb-4">{n}</div>
                  <h3 className="font-bold text-lg mb-2">{title}</h3>
                  <p className="text-slate-600 text-sm">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="studio" className="py-20">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-12">
              <div className="text-xs font-bold tracking-widest uppercase text-indigo-600 mb-3">{t('home.studioEyebrow')}</div>
              <h2 className="text-3xl md:text-4xl font-extrabold">{t('home.studioHeading')}</h2>
              <p className="text-slate-600 mt-2">
                <button type="button" className="text-indigo-600 font-bold underline" onClick={openDemo}>{t('home.studioWatchDemo')}</button>
                {' '}or generate below.
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <form onSubmit={runStudio} className="rounded-2xl border border-slate-200 p-6 bg-white shadow-sm">
                <h3 className="font-bold mb-4">Controls</h3>
                <label className="block text-sm font-semibold mb-2">Topic / input</label>
                <textarea className="w-full border border-slate-200 rounded-xl p-3 min-h-[140px]" value={topic} onChange={(e) => setTopic(e.target.value)} />
                <label className="mt-3 flex items-center gap-2 text-sm text-slate-600">
                  <input type="checkbox" checked={useDemoMode} onChange={(e) => setUseDemoMode(e.target.checked)} />
                  Demo mode (no live AI)
                </label>
                <button type="submit" disabled={toolBusy} className="mt-4 w-full py-3 rounded-full bg-indigo-600 text-white font-bold disabled:opacity-60">
                  {toolBusy ? 'Generating…' : 'Generate'}
                </button>
                {pipelineLabel ? <p className="mt-2 text-xs font-semibold text-indigo-600">{pipelineLabel}</p> : null}
                {runId ? <p className="mt-1 text-xs text-slate-400">runId: {runId}</p> : null}
                {toolStatus ? <p className="mt-3 text-sm text-emerald-600">{toolStatus}{demoMode ? ' · demo' : ''}</p> : null}
              </form>
              <div className="rounded-2xl border border-slate-200 p-6 bg-white shadow-sm">
                <h3 className="font-bold mb-4">Result</h3>
                <pre className="whitespace-pre-wrap text-sm bg-slate-50 border border-slate-200 rounded-xl p-4 min-h-[180px]">{result || 'Your output will appear here.'}</pre>
                <div className="flex flex-wrap gap-3 mt-4">
                  <button
                    type="button"
                    className="px-4 py-2 rounded-full border border-slate-200 font-semibold"
                    onClick={() => {
                      if (result) {
                        navigator.clipboard?.writeText(result)
                        showToast('Copied')
                      }
                    }}
                  >
                    Copy
                  </button>
                  <a href="/api/checkout" onClick={(e) => goCheckout('/api/checkout', e)} className="px-4 py-2 rounded-full bg-indigo-600 text-white font-semibold">
                    ${price}/mo — Upgrade
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

                <section id="testimonials" className="py-20 bg-slate-50">
          <div className="max-w-6xl mx-auto px-6">
            <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-4">{t('home.socialHeading')}</h2>
            <p className="text-center text-slate-600 mb-12 max-w-2xl mx-auto">
              {t('home.socialNote')}
            </p>
            <div className="grid md:grid-cols-3 gap-5">
              {[
                ['Role', 'Security / privacy lead', 'PENDING REAL QUOTE — replace with a consented customer quote.'],
                ['Role', 'Engineering manager', 'PENDING REAL QUOTE — outcome metric as template only ([X]+ hours saved).'],
                ['Role', 'Founder', 'PENDING REAL QUOTE — no fabricated names or logos.'],
              ].map(([eyebrow, role, q]) => (
                <div key={role} className="bg-white rounded-2xl border border-slate-200 p-6">
                  <div className="text-xs font-bold tracking-widest uppercase text-slate-400 mb-2">{eyebrow}</div>
                  <p className="text-slate-700 mb-4">&ldquo;{q}&rdquo;</p>
                  <div className="font-bold text-sm text-slate-900">{role}</div>
                  <div className="text-xs text-slate-500">Template · see content-modules/social-proof.md</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="honesty" className="py-12 bg-white border-y border-slate-100">
          <div className="max-w-3xl mx-auto px-6 text-center">
            <h2 className="text-2xl font-extrabold mb-3">{t('benchmark.honestyTitle')}</h2>
            <p className="text-slate-600 text-sm">{t('benchmark.honestyLead')}</p>
          </div>
        </section>

        <section id="pricing" className="py-20">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-extrabold">{t('pricing.heading')}</h2>
            </div>
            <div className="mb-10 rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <h3 className="font-bold text-center mb-4">{t('benchmark.allPlansTitle')}</h3>
              <ul className="grid sm:grid-cols-2 gap-2 text-sm text-slate-700 max-w-3xl mx-auto">
                {[t('benchmark.allPlans1'), t('benchmark.allPlans2'), t('benchmark.allPlans3'), t('benchmark.allPlans4')].map((item) => (
                  <li key={item} className="flex gap-2 items-start">
                    <Check />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="rounded-2xl border border-slate-200 p-6">
                <div className="font-bold text-lg">Free</div>
                <div className="text-4xl font-black my-3">$0</div>
                <ul className="space-y-2 text-sm text-slate-600 mb-6">
                  <li className="flex gap-2"><Check /> {t('pricing.freeFeat1')}</li>
                  <li className="flex gap-2"><Check /> {t('pricing.freeFeat2')}</li>
                </ul>
                <button type="button" className="w-full py-3 rounded-full border border-slate-200 font-bold" onClick={() => document.getElementById('studio')?.scrollIntoView({ behavior: 'smooth' })}>
                  {t('pricing.getStarted')}
                </button>
              </div>
              <div className="rounded-2xl border-2 border-indigo-600 p-6 relative shadow-lg">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold bg-indigo-600 text-white px-3 py-1 rounded-full">{t('pricing.mostPopular')}</div>
                <div className="font-bold text-lg">Pro</div>
                <div className="text-4xl font-black my-3">
                  ${price}
                  <span className="text-base font-semibold text-slate-500">/mo</span>
                </div>
                <ul className="space-y-2 text-sm text-slate-600 mb-6">
                  <li className="flex gap-2"><Check /> {t('pricing.proFeat1')}</li>
                  <li className="flex gap-2"><Check /> {t('pricing.proFeat2')}</li>
                  <li className="flex gap-2"><Check /> {t('pricing.proFeat3')}</li>
                </ul>
                <a href="/api/checkout" onClick={(e) => goCheckout('/api/checkout', e)} className="block text-center w-full py-3 rounded-full bg-indigo-600 text-white font-bold">
                  {t('pricing.getPro')}
                </a>
                <a href="/api/checkout?cycle=yearly" onClick={(e) => goCheckout('/api/checkout?cycle=yearly', e)} className="block text-center mt-3 text-sm font-semibold text-indigo-600">
                  {t('pricing.orYearly', { amount: String(priceYearlyMonthly) })}
                </a>
              </div>
              <div className="rounded-2xl border border-slate-200 p-6">
                <div className="font-bold text-lg">Enterprise</div>
                <div className="text-4xl font-black my-3">{t('pricing.custom')}</div>
                <ul className="space-y-2 text-sm text-slate-600 mb-6">
                  <li className="flex gap-2"><Check /> {t('pricing.entFeat1')}</li>
                  <li className="flex gap-2"><Check /> {t('pricing.entFeat2')}</li>
                </ul>
                <button
                  type="button"
                  className="w-full py-3 rounded-full border border-slate-200 font-bold"
                  onClick={async () => {
                    await submitLead('sales', 'pricing_contact', 'enterprise')
                  }}
                >
                  {t('pricing.contactSales')}
                </button>
                <a href="/settings" className="block text-center mt-3 text-sm font-semibold text-indigo-600">
                  {t('pricing.configureByok')}
                </a>
              </div>
            </div>
          </div>
        </section>

        
        <section id="geo-faq" className="py-16 bg-white">
          <div className="max-w-6xl mx-auto px-6">
            <h2 className="text-3xl font-extrabold mb-8">{t('faq.geoTitle')}</h2>
            <div className="space-y-3">
              {(geoFaqItems || []).map((f: { q?: string; a?: string }) => (
                <details key={f.q} className="rounded-xl border border-slate-200 p-4">
                  <summary className="font-semibold cursor-pointer">{f.q}</summary>
                  <p className="mt-2 text-slate-600 text-sm">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section id="faq" className="py-20 bg-slate-50">
          <div className="max-w-3xl mx-auto px-6">
            <h2 className="text-3xl font-extrabold text-center mb-10">{t('faq.title')}</h2>
            <div className="space-y-3">
              {faqItems.map((item) => (
                <details key={item.q} className="acc bg-white border border-slate-200 rounded-xl p-4">
                  <summary className="font-bold cursor-pointer">{item.q}</summary>
                  <p className="mt-2 text-slate-600 text-sm">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        
          {(() => {
  const qa = [1,2,3,4,5].map((i) => t(`home.geoQa${i}` as any)).filter((s) => s && !s.startsWith('home.geoQa'))
  const lt = [1,2,3,4,5].map((i) => t(`home.geoLt${i}` as any)).filter((s) => s && !s.startsWith('home.geoLt'))
  const cmpRows = [1,2,3,4].map((i) => [t(`home.geoCmp${i}Dim` as any), t(`home.geoCmp${i}Manual` as any), t(`home.geoCmp${i}Tool` as any)])
  const whenNot = t('home.geoWhenNot')
  if (!qa.length && !cmpRows.length && !lt.length) return null
  return (
    <div data-geo-render="v1" className="mt-10">
      {qa.length > 0 && (
        <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl mb-6">
          <h3 className="font-bold mb-3">{t('home.quickAnswers')}</h3>
          <ul className="space-y-2 text-sm text-slate-700">
            {qa.map((s: string, i: number) => (<li key={i}>{s}</li>))}
          </ul>
        </div>
      )}
      {cmpRows.length > 0 && (
        <div className="p-5 bg-white border border-slate-200 rounded-xl mb-6">
          <h3 className="font-bold mb-3">{t('home.howCompares')}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left border-b"><th className="py-2 pr-4">{t('home.dimension')}</th><th className="py-2 pr-4">{t('home.manual')}</th><th className="py-2">{PRODUCT.name}</th></tr></thead>
              <tbody>
                {cmpRows.map((r: string[], i: number) => (
                  <tr key={i} className="border-b"><td className="py-2 pr-4 font-medium">{r[0]}</td><td className="py-2 pr-4">{r[1]}</td><td className="py-2">{r[2]}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          {whenNot && (<p className="mt-3 text-sm text-amber-700">{t('home.whenNotToUse')} {whenNot}</p>)}
        </div>
      )}
      {lt.length > 0 && (
        <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl">
          <h3 className="font-bold mb-3">{t('home.peopleAlsoSearch')}</h3>
          <div className="flex flex-wrap gap-2">
            {lt.slice(0, 12).map((w: string, i: number) => (<span key={i} className="text-xs px-2 py-1 bg-white border border-slate-200 rounded-full text-slate-600">{w}</span>))}
          </div>
        </div>
      )}
    </div>
  );
})()}
        </section>

        <section className="py-20">
          <div id="signup" className="max-w-3xl mx-auto px-6 text-center rounded-3xl bg-slate-950 text-white p-10">
            <h2 className="text-3xl font-extrabold mb-3">{t('signup.title')}</h2>
            <p className="text-slate-300 mb-6">{t('signup.subtitle')}</p>
            <form onSubmit={onSignup} className="flex flex-col sm:flex-row gap-3 justify-center">
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('signup.emailPlaceholder')} className="px-4 py-3 rounded-full text-slate-900 min-w-[260px]" />
              <button type="submit" disabled={signupBusy} className="px-6 py-3 rounded-full bg-indigo-500 font-bold disabled:opacity-60">
                {signupBusy ? t('signup.saving') : t('signup.cta')}
              </button>
            </form>
            <p className="text-sm text-slate-400 mt-4">{signupMsg || t('signup.trust')}</p>
          </div>
        </section>

        <section className="pb-16">
          <div className="max-w-6xl mx-auto px-6 rounded-2xl border border-slate-200 p-6">
            <div className="flex flex-wrap gap-3 items-center justify-between mb-4">
              <h3 className="font-bold">{t('home.leadsInbox')}</h3>
              <div className="text-sm text-slate-500">{filteredHint}</div>
            </div>
            <div className="flex flex-wrap gap-3 mb-4">
              <input className="border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder={t('home.filterEmail')} value={leadFilter} onChange={(e) => setLeadFilter(e.target.value)} />
              <select className="border border-slate-200 rounded-lg px-3 py-2 text-sm" value={planFilter} onChange={(e) => setPlanFilter(e.target.value)}>
                <option value="">{t('home.allPlans')}</option>
                <option value="free">free</option>
                <option value="pro">pro</option>
                <option value="enterprise">enterprise</option>
                <option value="sales">sales</option>
              </select>
            </div>
            {leads.length === 0 ? (
              <div className="text-sm text-slate-500">{t('home.noLeads')}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500 border-b">
                      <th className="py-2">{t('home.colEmail')}</th>
                      <th>{t('home.colPlan')}</th>
                      <th>{t('home.colSource')}</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((l) => (
                      <tr key={l.id} className="border-b border-slate-100">
                        <td className="py-2">{l.email}</td>
                        <td>{l.plan}</td>
                        <td>{l.source}</td>
                        <td>
                          <button type="button" className="text-red-600 font-semibold" onClick={() => deleteLeadRow(l.id)}>
                            {t('home.delete')}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <section className="max-w-3xl mx-auto px-6 py-10" data-geo="related-reading">
      <h2 className="text-xl font-bold text-slate-900 mb-3">{t('home.relatedReading')}</h2>
            <ul className="space-y-1 text-[15px]">
      <li><a href="https://lxsaihub.com/blog/ai-wrapper-vs-moat.html" className="text-indigo-700 hover:underline">{t('home.related1Title')}</a> &mdash; {t('home.related1Desc')}</li>
      <li><a href="https://lxsaihub.com/blog/eu-ai-act-compliance-checklist.html" className="text-indigo-700 hover:underline">{t('home.related2Title')}</a> &mdash; {t('home.related2Desc')}</li>
      <li><a href="https://lxsaihub.com/blog/wave1-launch.html" className="text-indigo-700 hover:underline">{t('home.related3Title')}</a> &mdash; {t('home.related3Desc')}</li>
      </ul>
    </section>

<footer className="border-t border-slate-200 py-10">
          <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-4 gap-8 text-sm">
            <div>
              <div className="font-extrabold text-lg mb-2">{PRODUCT.name}</div>
              <p className="text-slate-500">{t('common.tagline')}</p>
            </div>
            <div className="flex flex-col gap-2 text-slate-600">
              <div className="font-bold text-slate-900">{t('footer.product')}</div>
              <a href="#features">{t('nav.features')}</a>
              <a href="/use-cases">{t('nav.useCases')}</a>
              <a href="/integrations">{t('nav.integrations')}</a>
              <a href="/security">{t('nav.security')}</a>
              <a href="/blog">{t('nav.blog')}</a>
              <a href="#pricing">{t('nav.pricing')}</a>
              <a href="#studio">{t('nav.studio')}</a>
              <a href="#faq">{t('nav.faq')}</a>
            </div>
            <div className="flex flex-col gap-2 text-slate-600">
              <div className="font-bold text-slate-900">{t('footer.company')}</div>
              <a href="#top">{t('footer.about')}</a>
              <a href="mailto:lixingliangsy@163.com">{t('footer.contact')}</a>
            </div>
            <div className="flex flex-col gap-2 text-slate-600">
              <div className="font-bold text-slate-900">{t('footer.legal')}</div>
              <a href="/privacy.html">{t('footer.privacy')}</a>
              <a href="/terms.html">{t('footer.terms')}</a>
              <a href="/support.html">{t('footer.support')}</a>
            </div>
          </div>
          <div className="max-w-6xl mx-auto px-6 mt-8 text-slate-400 text-xs">© 2026 {PRODUCT.name}. {t('footer.rights')}</div>
        </footer>

        {toast ? <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-lg font-semibold z-50">{toast}</div> : null}

        {demoOpen ? (
          <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4" role="dialog" aria-modal="true">
            <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50">
                <div>
                  <div className="font-bold">{PRODUCT.name} · {t('home.productTour')}</div>
                  <div className="text-xs text-slate-500">{(PRODUCT as any).tagline || (PRODUCT as any).slug}</div>
                </div>
                <button type="button" className="font-bold text-slate-500" onClick={() => setDemoOpen(false)}>
                  ✕
                </button>
              </div>
              <div className="p-6">
                <div className="rounded-xl border border-slate-200 bg-slate-950 text-white p-5 min-h-[260px]">
                  <div className="text-xs text-slate-400 mb-3">
                    {t('home.productDemo')} · {PRODUCT.slug} · {t('home.stepOf', { n: String(demoStep + 1), total: String(demoSteps.length) })}
                  </div>
                  <div className="text-lg font-bold mb-2">{demoSteps[demoStep]?.title}</div>
                  <div className="text-sm text-slate-300 whitespace-pre-wrap mb-4">{demoSteps[demoStep]?.detail}</div>
                  {demoSteps[demoStep]?.preview ? (
                    <pre className="text-xs bg-slate-900 border border-slate-700 rounded-lg p-3 overflow-auto max-h-36 text-emerald-300 whitespace-pre-wrap">
                      {demoSteps[demoStep].preview}
                    </pre>
                  ) : null}
                  <div className="space-y-2 mt-4">
                    {demoSteps.map((s, i) => (
                      <div
                        key={`${s.title}-${i}`}
                        className={`text-sm px-3 py-2 rounded-lg ${i <= demoStep ? 'bg-indigo-600' : 'bg-slate-800 text-slate-500'}`}
                      >
                        {i + 1}. {s.title}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 mt-5">
                  <button
                    type="button"
                    className="px-4 py-2 rounded-full bg-indigo-600 text-white font-bold"
                    onClick={() => {
                      setDemoPlaying(true)
                      setDemoStep(0)
                    }}
                  >
                    {t('home.replay')}
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 rounded-full border border-slate-200 font-bold"
                    onClick={() => {
                      setDemoOpen(false)
                      document.getElementById('studio')?.scrollIntoView({ behavior: 'smooth' })
                    }}
                  >
                    {t('home.tryStudio')}
                  </button>
                  <a
                    href="#signup"
                    className="px-4 py-2 rounded-full border border-slate-200 font-bold"
                    onClick={() => setDemoOpen(false)}
                  >
                    Create my account
                  </a>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      <section className="mx-auto max-w-3xl px-4 py-10" aria-labelledby="what-not">
        <h2 id="what-not" className="text-xl font-semibold text-gray-900">{t('legal.whatNotTitle')}</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-gray-700">
          <li>{t('legal.whatNot1')}</li>
          <li>{t('legal.whatNot2')}</li>
          <li>{t('legal.whatNot3')}</li>
        </ul>
      </section>

      </div>
    </>
  )
}
