import React, { FormEvent, useEffect, useMemo, useState } from 'react'
import Head from 'next/head'
import { PRODUCT } from '../lib/product'

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

/** Product-specific tour (short, ungated, personalized by use case). */
function buildDemoSteps(): DemoStep[] {
  const p = PRODUCT as any
  const name = String(p.name || 'Product')
  const tagline = String(p.tagline || p.description || '').trim()
  const toolTitle = String(p.toolTitle || 'Live studio')
  const cta = String(p.ctaLabel || 'Run workflow')
  const resultLabel = String(p.resultLabel || 'Result')
  const feats: string[] = Array.isArray(p.features) ? p.features : []
  const inputs: Array<{ key: string; label: string; type?: string; placeholder?: string; options?: string[] }> = Array.isArray(p.inputs)
    ? p.inputs
    : []

  const sampleInputs: Record<string, string> = {}
  for (const f of inputs) {
    const ph = String(f.placeholder || '').replace(/^e\.g\.\s*/i, '')
    if (f.type === 'select' && f.options && f.options.length) {
      sampleInputs[f.key] = String(f.options[0])
    } else if (ph) {
      sampleInputs[f.key] = ph
    } else {
      sampleInputs[f.key] = `Sample ${f.label}`
    }
  }

  let mockPreview = ''
  try {
    if (typeof p.mock === 'function') {
      mockPreview = String(p.mock(sampleInputs)).replace(/\\n/g, '\n').slice(0, 360)
    }
  } catch {
    /* ignore mock errors in demo */
  }

  const inputLines = inputs.slice(0, 3).map((f) => {
    const v = (sampleInputs[f.key] || '').split('\n')[0]
    return `${f.label}: ${v || '…'}`
  })

  return [
    {
      title: `Welcome to ${name}`,
      detail: tagline || `A 60-second tour of how ${name} delivers value.`,
    },
    {
      title: `Open ${toolTitle}`,
      detail: inputLines.length ? inputLines.join('\n') : `Enter the apps and your child's age in the studio.`,
    },
    {
      title: `Click “${cta}”`,
      detail: feats.length ? `Powered by: ${feats.slice(0, 3).join(' · ')}` : `${name} drafts a structured ${resultLabel.toLowerCase()}.`,
    },
    {
      title: `${resultLabel} preview`,
      detail: mockPreview
        ? 'Sample output from this product’s rule-based pipeline:'
        : feats.slice(0, 3).join(' · ') || `Your ${resultLabel.toLowerCase()} appears here — copy or refine.`,
      preview: mockPreview || undefined,
    },
    {
      title: 'Your turn',
      detail: `Try the live studio, or start free with ${name}.`,
    },
  ]
}

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [toast, setToast] = useState('')
  const [email, setEmail] = useState('')
  const [signupBusy, setSignupBusy] = useState(false)
  const [signupMsg, setSignupMsg] = useState('')
  const [form, setForm] = useState<Record<string, string>>({})
  const [result, setResult] = useState('')
  const [toolBusy, setToolBusy] = useState(false)
  const [toolStatus, setToolStatus] = useState('')
  const [runId, setRunId] = useState('')
  const [demoMode, setDemoMode] = useState(false)
  const [pipelineSteps, setPipelineSteps] = useState<Array<{ id: string; label: string }>>([])
  const [currentStep, setCurrentStep] = useState('')
  const [ruleHits, setRuleHits] = useState<Array<{ id: string; title: string; severity: string }>>([])
  const [useDemoMode, setUseDemoMode] = useState(true)
  const [agentMode, setAgentMode] = useState(false)
  const [citations, setCitations] = useState<Array<{ ref: string; title: string; source: string; verify?: boolean }>>([])
  const [redlineNote, setRedlineNote] = useState('')
  const [agentSource, setAgentSource] = useState('')
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
  const inputsSchema: Array<{ key: string; label: string; type?: string; placeholder?: string; options?: string[] }> = (PRODUCT as any).inputs || []
  const pricing: Array<{ tier: string; price: string; desc: string }> = (PRODUCT as any).pricing || []
  const mark = (PRODUCT.name || 'A').trim().charAt(0).toUpperCase()
  const demoSteps = useMemo(() => buildDemoSteps(), [])

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
      const body: Record<string, unknown> = { inputs: form, action: 'start', step: 'ingest' }
      if (agentMode) {
        body.agent = 1
        body.useMock = false
      } else {
        body.useMock = useDemoMode
      }
      const r = await fetch('/api/tool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) {
        setResult(String(data.error || 'Request failed'))
        setToolStatus(`Error ${r.status}`)
        setDemoMode(false)
        return
      }
      setResult(String(data.result || JSON.stringify(data, null, 2)))
      setRunId(String(data.runId || ''))
      setPipelineSteps(Array.isArray(data.steps) ? data.steps : [])
      setCurrentStep(String(data.step || ''))
      setRuleHits(Array.isArray(data.ruleHits) ? data.ruleHits : [])
      setDemoMode(!!data.demo)
      setAgentMode(!!data.agent)
      setCitations(Array.isArray(data.citations) ? data.citations : [])
      setRedlineNote(String(data.redlineNote || ''))
      setAgentSource(String(data.source || ''))
      setToolStatus(data.agent ? 'Agent mode — multi-step, cited' : (data.demo ? 'Demo mode — not live AI' : 'Live workflow'))
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
    if (!planFilter && !leadFilter) return `${leads.length} leads`
    return `${leads.length} filtered`
  }, [leads, planFilter, leadFilter])

  const featCards = (features.length ? features : ['Fast setup', 'Clear results', 'Export anytime', 'Cancel anytime']).slice(0, 4)
  const proTier = pricing[1] || { tier: 'Pro', price: `$${price}/mo`, desc: 'Full coverage' }
  const entTier = pricing[2] || { tier: 'Enterprise', price: 'Custom', desc: 'Team & BYOK' }

  return (
    <>
      <Head>
        <title>{`${PRODUCT.name} — ${PRODUCT.tagline}`}</title>
        <meta name="description" content={PRODUCT.description} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="canonical" href="https://privacyscan.lxsaihub.com/" />
        <script type="application/ld+json">{`{"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": "What does PrivScan check?", "acceptedAnswer": {"@type": "Answer", "text": "It scans your site for common GDPR gaps - cookie-consent granularity (Art. 7), lawful-basis statements (Art. 6), and data-retention notices (Art. 13/14) - then scores readiness from 0 to 100."}}, {"@type": "Question", "name": "Is PrivScan a replacement for a DPO?", "acceptedAnswer": {"@type": "Answer", "text": "No. It is decision-support that flags likely gaps; final assessments should be confirmed with a qualified privacy professional."}}, {"@type": "Question", "name": "Which regions does it cover?", "acceptedAnswer": {"@type": "Answer", "text": "EU GDPR by default, with UK GDPR and global guidance selectable in the input."}}, {"@type": "Question", "name": "How is the readiness score calculated?", "acceptedAnswer": {"@type": "Answer", "text": "A weighted check of consent, lawful basis, retention, and tracker transparency; the demo returns a sample 54/100 with cited articles."}}, {"@type": "Question", "name": "Can I export the report?", "acceptedAnswer": {"@type": "Answer", "text": "Pro exports the full scan and remediation checklist; Free includes one watermarked run per day."}}, {"@type": "Question", "name": "Does it scan single-page apps?", "acceptedAnswer": {"@type": "Answer", "text": "It analyzes the URL plus your described data practices; deeper SPA crawling is on the roadmap."}}]}`}</script>

      </Head>

      <div className="min-h-screen bg-white text-slate-900">
        <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-slate-200">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            <a href="#top" className="flex items-center gap-2 font-extrabold text-lg">
              <span className="w-9 h-9 rounded-xl bg-indigo-600 text-white grid place-items-center">{mark}</span>
              {PRODUCT.name}
            </a>
            <nav className="hidden md:flex gap-7 text-sm font-semibold text-slate-500">
              <a href="#features" className="hover:text-slate-900">Features</a>
              <a href="/use-cases" className="hover:text-slate-900">Use cases</a>
              <a href="/integrations" className="hover:text-slate-900">Integrations</a>
              <a href="#how" className="hover:text-slate-900">How it works</a>
              <a href="/security" className="hover:text-slate-900">Security</a>
              <a href="#pricing" className="hover:text-slate-900">Pricing</a>
              <a href="/blog" className="hover:text-slate-900">Blog</a>
              <a href="#faq" className="hover:text-slate-900">FAQ</a>
            </nav>
            <div className="hidden md:flex gap-3">
              <a href="#signup" className="px-4 py-2 rounded-full border border-slate-200 font-semibold text-sm">Sign in</a>
              <a href="#signup" className="px-4 py-2 rounded-full bg-indigo-600 text-white font-semibold text-sm">Start free trial</a>
            </div>
            <button type="button" className="md:hidden p-2" aria-label="Menu" onClick={() => setMenuOpen((v) => !v)}>
              <span className="block w-6 h-0.5 bg-slate-900 mb-1" />
              <span className="block w-6 h-0.5 bg-slate-900 mb-1" />
              <span className="block w-6 h-0.5 bg-slate-900" />
            </button>
          </div>
          {menuOpen ? (
            <div className="md:hidden px-6 pb-4 flex flex-col gap-2 border-b border-slate-200">
              {['features', 'how', 'studio', 'pricing', 'faq', 'signup'].map((id) => (
                <a key={id} href={`#${id}`} onClick={() => setMenuOpen(false)} className="py-2 font-semibold text-slate-600 capitalize">
                  {id === 'signup' ? 'Start free trial' : id}
                </a>
              ))}
            </div>
          ) : null}
        </header>

        <section id="top" className="py-16 bg-gradient-to-br from-indigo-50 via-white to-violet-50">
          <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-10 items-center">
            <div>
              <div className="text-xs font-bold tracking-widest uppercase text-indigo-600 mb-3">Micro SaaS</div>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">{PRODUCT.tagline}</h1>
              <p className="text-lg text-slate-600 mb-6">{PRODUCT.description}</p>
              <div className="flex flex-wrap gap-3">
                <a href="#signup" className="px-6 py-3 rounded-full bg-indigo-600 text-white font-bold">Start Free Trial</a>
                <button type="button" onClick={openDemo} className="px-6 py-3 rounded-full border border-slate-200 font-bold bg-white">
                  ▶ Watch Demo
                </button>
              </div>
              <p className="mt-4 text-sm text-slate-500">No credit card required · Cancel anytime</p>
            </div>
            <button type="button" onClick={openDemo} className="text-left rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden group cursor-pointer">
              <div className="flex gap-2 px-4 py-3 bg-slate-50 border-b border-slate-200 items-center justify-between">
                <div className="flex gap-2">
                  <i className="w-3 h-3 rounded-full bg-red-400 block" />
                  <i className="w-3 h-3 rounded-full bg-amber-400 block" />
                  <i className="w-3 h-3 rounded-full bg-emerald-400 block" />
                </div>
                <span className="text-xs font-bold text-indigo-600 group-hover:underline">Play demo ▶</span>
              </div>
              <div className="p-6 space-y-3 relative min-h-[180px]">
                <div className="h-3 bg-slate-100 rounded w-4/5 animate-pulse" />
                <div className="h-3 bg-slate-100 rounded w-3/5 animate-pulse" />
                <div className="h-3 bg-slate-100 rounded w-2/5" />
                <div className="mt-4 text-sm font-semibold text-indigo-600">{PRODUCT.name} · Click to watch walkthrough</div>
              </div>
            </button>
          </div>
        </section>

        <section className="bg-slate-950 text-white py-10">
          <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[['LLM01', 'Injection'], ['RT-006', 'Mapped'], ['6', 'Rule checks'], ['<3 min', 'To report']].map(([n, l]) => (
              <div key={l}>
                <div className="text-3xl font-black text-indigo-300">{n}</div>
                <div className="text-slate-400 text-sm font-semibold mt-1">{l}</div>
              </div>
            ))}
          </div>
        </section>

        <section id="definition" className="py-20 bg-slate-50">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-xs font-bold tracking-widest uppercase text-indigo-600 mb-3">What it is</div>
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4">PrivScan - definition</h2>
            <p className="text-lg text-slate-600 max-w-3xl">{(PRODUCT as any).definitionLead}</p>
          </div>
        </section>

        <section id="features" className="py-20">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-12">
              <div className="text-xs font-bold tracking-widest uppercase text-indigo-600 mb-3">Why {PRODUCT.name}</div>
              <h2 className="text-3xl md:text-4xl font-extrabold mb-3">Everything you need to catch GDPR gaps early</h2>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
              {featCards.map((f) => (
                <div key={f} className="rounded-2xl border border-slate-200 p-6 shadow-sm hover:-translate-y-1 transition bg-white">
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 grid place-items-center font-black mb-4">✦</div>
                  <h3 className="font-bold mb-2">{f}</h3>
                  <p className="text-sm text-slate-600">Built for privacy, legal, and product teams who need a clear remediation checklist without a learning curve.</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="how" className="py-20 bg-slate-50">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-extrabold">From agent description to report in 4 steps</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                ['1', 'Scope', 'Describe your agent, its capabilities, and threat focus.'],
                ['2', 'Attack & analyze', 'Rule-based agent-threat checks, then model-assisted exploitability scoring.'],
                ['3', 'Report', 'Export an exploitability score + hardening checklist with runId.'],
              ].map(([n, t, d]) => (
                <div key={n} className="bg-white rounded-2xl border border-slate-200 p-6">
                  <div className="w-10 h-10 rounded-full bg-indigo-600 text-white grid place-items-center font-black mb-4">{n}</div>
                  <h3 className="font-bold text-lg mb-2">{t}</h3>
                  <p className="text-slate-600 text-sm">{d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="studio" className="py-20">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-12">
              <div className="text-xs font-bold tracking-widest uppercase text-indigo-600 mb-3">Live studio</div>
              <h2 className="text-3xl md:text-4xl font-extrabold">Try it on this page</h2>
              <p className="text-slate-600 mt-2">
                <button type="button" className="text-indigo-600 font-bold underline" onClick={openDemo}>Watch demo</button>
                {' '}or run a check below.
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <form onSubmit={runStudio} className="rounded-2xl border border-slate-200 p-6 bg-white shadow-sm">
                <h3 className="font-bold mb-4">AI agent red-team test</h3>
                {inputsSchema.map((f) => (
                  <div key={f.key} className="mb-4">
                    <label className="block text-sm font-semibold mb-2">{f.label}</label>
                    {f.type === 'select' ? (
                      <select
                        className="w-full border border-slate-200 rounded-xl p-3"
                        value={form[f.key] || ''}
                        onChange={(e) => setForm((v) => ({ ...v, [f.key]: e.target.value }))}
                      >
                        {(f.options || []).map((o) => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    ) : f.type === 'textarea' ? (
                      <textarea
                        className="w-full border border-slate-200 rounded-xl p-3 min-h-[110px]"
                        placeholder={f.placeholder}
                        value={form[f.key] || ''}
                        onChange={(e) => setForm((v) => ({ ...v, [f.key]: e.target.value }))}
                      />
                    ) : (
                      <input
                        className="w-full border border-slate-200 rounded-xl p-3"
                        placeholder={f.placeholder}
                        value={form[f.key] || ''}
                        onChange={(e) => setForm((v) => ({ ...v, [f.key]: e.target.value }))}
                      />
                    )}
                  </div>
                ))}
                <label className="mt-1 flex items-center gap-2 text-sm text-slate-600">
                  <input type="checkbox" checked={useDemoMode} onChange={(e) => setUseDemoMode(e.target.checked)} />
                  Demo mode (not live AI)
                </label>
                <label className="mt-1 flex items-center gap-2 text-sm text-violet-700">
                  <input type="checkbox" checked={agentMode} onChange={(e) => setAgentMode(e.target.checked)} />
                  Agent mode (multi-step, cited) — live AI
                </label>
                {currentStep ? <p className="mt-2 text-xs font-semibold text-indigo-600">{currentStep}</p> : null}
                <button type="submit" disabled={toolBusy} className="mt-4 w-full py-3 rounded-full bg-indigo-600 text-white font-bold disabled:opacity-60">
                  {toolBusy ? 'Running workflow…' : (PRODUCT as any).ctaLabel || 'Run workflow'}
                </button>
                {toolStatus ? <p className="mt-3 text-sm text-emerald-600">{toolStatus}</p> : null}
                {runId ? <p className="mt-1 text-xs text-slate-500">runId: {runId}</p> : null}
              </form>
              <div className="rounded-2xl border border-slate-200 p-6 bg-white shadow-sm">
                <h3 className="font-bold mb-4">Result</h3>
                {demoMode ? (
                  <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 text-sm px-3 py-2 font-semibold">
                    Demo mode — not live AI
                  </div>
                ) : null}
                {agentSource ? (
                  <div className="mb-3 rounded-lg border border-violet-300 bg-violet-50 text-violet-900 text-sm px-3 py-2 font-semibold">
                    {agentSource} · Vertical AI Governance Agent
                  </div>
                ) : null}
                {citations.length ? (
                  <div className="mb-3 rounded-lg border border-indigo-200 bg-indigo-50 p-3">
                    <div className="text-xs font-bold text-indigo-700 mb-1">Sources (curated regulatory dataset)</div>
                    <ul className="text-xs text-slate-700 space-y-1">
                      {citations.map((c, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="font-mono font-bold text-indigo-700">[{c.ref}]</span>
                          <span>{c.title}{c.source ? ` — ${c.source}` : ''}{c.verify ? ' (verify vs primary law)' : ''}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {redlineNote ? (
                  <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 whitespace-pre-wrap">{redlineNote}</div>
                ) : null}
                {pipelineSteps.length ? (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {pipelineSteps.map((s) => (
                      <span
                        key={s.id}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                          s.id === currentStep ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {s.label}
                      </span>
                    ))}
                  </div>
                ) : null}
                {ruleHits.length ? (
                  <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="text-xs font-bold text-slate-700 mb-1">Rule-based findings</div>
                    <ul className="text-xs text-slate-600 space-y-1">
                      {ruleHits.map((h) => (
                        <li key={h.id} className="flex gap-2">
                          <span className="font-mono font-bold">[{h.severity}]</span>
                          <span>{h.id} {h.title}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
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
                  <a href="/api/runs?export=json" className="px-4 py-2 rounded-full border border-slate-200 font-semibold">
                    Export runs (JSON)
                  </a>
                  <a href="/api/runs?export=csv" className="px-4 py-2 rounded-full border border-slate-200 font-semibold">
                    Export runs (CSV)
                  </a>
                  <button
                    type="button"
                    className="px-4 py-2 rounded-full border border-slate-200 font-semibold"
                    onClick={async () => {
                      if (!runId) return showToast('Run a workflow first')
                      await fetch('/api/feedback', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ runId, thumbs: 'up' }),
                      })
                      showToast('Feedback saved')
                    }}
                  >
                    Helpful
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
            <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-4">Trusted by security teams</h2>
            <p className="text-center text-slate-600 mb-12 max-w-2xl mx-auto">
              Social proof uses templates until real, consented testimonials exist. Trusted by <strong>[X]+</strong> security and AI-platform teams.
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

        <section id="pricing" className="py-20">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-extrabold">Simple plans that scale</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="rounded-2xl border border-slate-200 p-6">
                <div className="font-bold text-lg">{pricing[0]?.tier || 'Free'}</div>
                <div className="text-4xl font-black my-3">{pricing[0]?.price || '$0'}</div>
                <ul className="space-y-2 text-sm text-slate-600 mb-6">
                  <li className="flex gap-2"><Check /> {pricing[0]?.desc || '1 check / day'}</li>
                  <li className="flex gap-2"><Check /> Studio demo (no extra LLM fee)</li>
                </ul>
                <button type="button" className="w-full py-3 rounded-full border border-slate-200 font-bold" onClick={() => document.getElementById('signup')?.scrollIntoView({ behavior: 'smooth' })}>
                  Get started free
                </button>
              </div>
              <div className="rounded-2xl border-2 border-indigo-600 p-6 relative shadow-lg">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold bg-indigo-600 text-white px-3 py-1 rounded-full">Most popular</div>
                <div className="font-bold text-lg">{proTier.tier}</div>
                <div className="text-4xl font-black my-3">
                  ${price}
                  <span className="text-base font-semibold text-slate-500">/mo</span>
                </div>
                <ul className="space-y-2 text-sm text-slate-600 mb-6">
                  <li className="flex gap-2"><Check /> {proTier.desc}</li>
                  <li className="flex gap-2"><Check /> Audit log · CSV/JSON export · fair-use cost guard</li>
                  <li className="flex gap-2"><Check /> Priority support · 2 months free with yearly</li>
                </ul>
                <a href="/api/checkout" onClick={(e) => goCheckout('/api/checkout', e)} className="block text-center w-full py-3 rounded-full bg-indigo-600 text-white font-bold">
                  Start free trial
                </a>
                <a href="/api/checkout?cycle=yearly" onClick={(e) => goCheckout('/api/checkout?cycle=yearly', e)} className="block text-center mt-3 text-sm font-semibold text-indigo-600">
                  Or pay yearly — ${priceYearlyMonthly}/mo
                </a>
              </div>
              <div className="rounded-2xl border border-slate-200 p-6">
                <div className="font-bold text-lg">{entTier.tier}</div>
                <div className="text-4xl font-black my-3">Custom</div>
                <ul className="space-y-2 text-sm text-slate-600 mb-6">
                  <li className="flex gap-2"><Check /> {entTier.desc}</li>
                  <li className="flex gap-2"><Check /> Optional BYOK (your OpenAI key)</li>
                </ul>
                <button
                  type="button"
                  className="w-full py-3 rounded-full border border-slate-200 font-bold"
                  onClick={async () => {
                    await submitLead('sales', 'pricing_contact', 'enterprise')
                  }}
                >
                  Contact sales
                </button>
                <a href="/settings" className="block text-center mt-3 text-sm font-semibold text-indigo-600">
                  Configure BYOK
                </a>
              </div>
            </div>
          </div>
        </section>

        <section id="product-faq" className="py-20">
          <div className="max-w-3xl mx-auto px-6">
            <h2 className="text-3xl font-extrabold text-center mb-10">PrivScan - frequently asked questions</h2>
            <div className="space-y-3">
              {((PRODUCT as any).geoFaq || []).map((f: { q: string; a: string }) => (
                <details key={f.q} className="acc bg-white border border-slate-200 rounded-xl p-4">
                  <summary className="font-bold cursor-pointer">{f.q}</summary>
                  <p className="mt-2 text-slate-600 text-sm">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section id="faq" className="py-20 bg-slate-50">
          <div className="max-w-3xl mx-auto px-6">
            <h2 className="text-3xl font-extrabold text-center mb-10">FAQ</h2>
            <div className="space-y-3">
              {[
                ['Can I cancel anytime?', 'Yes. Self-serve plans cancel anytime; access continues until period end.'],
                ['Do I need a credit card for the free trial?', 'No. Start with email signup, then upgrade when ready.'],
                [
                  'Do I need my own ChatGPT / OpenAI subscription?',
                  'No for Free/Pro. AI runs are included in your plan (fair use) via our platform key. Enterprise can optionally bring your own OpenAI key (BYOK) — configure it at /settings (key stays server-side only).',
                ],
                [
                  'What is Fair Use / what if I hit the AI limit?',
                  'Pro includes about 300 workflow runs/month (fair use cost guard on gpt-4o-mini, plus a daily cap). If you hit the fair-use limit, Studio returns HTTP 429 — upgrade, wait for reset, enable Demo mode, or use Enterprise BYOK. We never silently return fake AI success.',
                ],
                ['Is checkout secure?', 'Payments are processed by Waffo Pancake (merchant of record).'],
                ['Is this legal advice?', 'No. PrivScan is decision-support: rule-based GDPR screening plus model-assisted guidance. For binding compliance, consult a qualified privacy professional or DPO.'],
              ].map(([q, a]) => (
                <details key={q} className="acc bg-white border border-slate-200 rounded-xl p-4">
                  <summary className="font-bold cursor-pointer">{q}</summary>
                  <p className="mt-2 text-slate-600 text-sm">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20">
          <div id="signup" className="max-w-3xl mx-auto px-6 text-center rounded-3xl bg-slate-950 text-white p-10">
            <h2 className="text-3xl font-extrabold mb-3">Catch privacy gaps today</h2>
            <p className="text-slate-300 mb-6">Join teams using {PRODUCT.name}. Free to try — no card needed.</p>
            <form onSubmit={onSignup} className="flex flex-col sm:flex-row gap-3 justify-center">
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" className="px-4 py-3 rounded-full text-slate-900 min-w-[260px]" />
              <button type="submit" disabled={signupBusy} className="px-6 py-3 rounded-full bg-indigo-500 font-bold disabled:opacity-60">
                {signupBusy ? 'Saving…' : 'Get started'}
              </button>
            </form>
            <p className="text-sm text-slate-400 mt-4">{signupMsg || 'Trusted · Cancel anytime'}</p>
          </div>
        </section>

        <section className="pb-16">
          <div className="max-w-6xl mx-auto px-6 rounded-2xl border border-slate-200 p-6">
            <div className="flex flex-wrap gap-3 items-center justify-between mb-4">
              <h3 className="font-bold">Leads inbox (demo CRUD)</h3>
              <div className="text-sm text-slate-500">{filteredHint}</div>
            </div>
            <div className="flex flex-wrap gap-3 mb-4">
              <input className="border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="Filter email…" value={leadFilter} onChange={(e) => setLeadFilter(e.target.value)} />
              <select className="border border-slate-200 rounded-lg px-3 py-2 text-sm" value={planFilter} onChange={(e) => setPlanFilter(e.target.value)}>
                <option value="">All plans</option>
                <option value="free">free</option>
                <option value="pro">pro</option>
                <option value="enterprise">enterprise</option>
                <option value="sales">sales</option>
              </select>
            </div>
            {leads.length === 0 ? (
              <div className="text-sm text-slate-500">No leads yet — submit the signup form.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500 border-b">
                      <th className="py-2">Email</th>
                      <th>Plan</th>
                      <th>Source</th>
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
                            Delete
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

        <footer className="border-t border-slate-200 py-10">
          <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-4 gap-8 text-sm">
            <div>
              <div className="font-extrabold text-lg mb-2">{PRODUCT.name}</div>
              <p className="text-slate-500">{PRODUCT.tagline}</p>
            </div>
            <div className="flex flex-col gap-2 text-slate-600">
              <div className="font-bold text-slate-900">Product</div>
              <a href="#features">Features</a>
              <a href="/use-cases">Use cases</a>
              <a href="/integrations">Integrations</a>
              <a href="/security">Security</a>
              <a href="/blog">Blog</a>
              <a href="#pricing">Pricing</a>
              <a href="#studio">Studio</a>
              <a href="#faq">FAQ</a>
            </div>
            <div className="flex flex-col gap-2 text-slate-600">
              <div className="font-bold text-slate-900">Company</div>
              <a href="#signup">About</a>
              <a href="#signup">Contact</a>
            </div>
            <div className="flex flex-col gap-2 text-slate-600">
              <div className="font-bold text-slate-900">Legal</div>
              <a href="/privacy.html">Privacy</a>
              <a href="/terms.html">Terms</a>
              <a href="/support.html">Support</a>
            </div>
          </div>
          <div className="max-w-6xl mx-auto px-6 mt-8 text-slate-400 text-xs">© 2026 {PRODUCT.name}. All rights reserved.</div>
        </footer>

        {toast ? <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-lg font-semibold z-50">{toast}</div> : null}

        {demoOpen ? (
          <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4" role="dialog" aria-modal="true">
            <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50">
                <div>
                  <div className="font-bold">{PRODUCT.name} · Product tour</div>
                  <div className="text-xs text-slate-500">{(PRODUCT as any).tagline || (PRODUCT as any).slug}</div>
                </div>
                <button type="button" className="font-bold text-slate-500" onClick={() => setDemoOpen(false)}>
                  ✕
                </button>
              </div>
              <div className="p-6">
                <div className="rounded-xl border border-slate-200 bg-slate-950 text-white p-5 min-h-[260px]">
                  <div className="text-xs text-slate-400 mb-3">
                    PRODUCT DEMO · {PRODUCT.slug} · step {demoStep + 1}/{demoSteps.length}
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
                    Replay
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 rounded-full border border-slate-200 font-bold"
                    onClick={() => {
                      setDemoOpen(false)
                      document.getElementById('studio')?.scrollIntoView({ behavior: 'smooth' })
                    }}
                  >
                    Try studio
                  </button>
                  <a
                    href="#signup"
                    className="px-4 py-2 rounded-full border border-slate-200 font-bold"
                    onClick={() => setDemoOpen(false)}
                  >
                    Start free
                  </a>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </>
  )
}
