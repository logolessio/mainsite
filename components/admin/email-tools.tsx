'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Check, CheckCircle2, Loader2, Mail, MonitorSmartphone, RefreshCw, Send, Smartphone, XCircle } from 'lucide-react'
import { useState } from 'react'
import { EASE_OUT } from '@/lib/layout'
import { cn } from '@/lib/utils'

async function call<T>(data: unknown): Promise<T & { error?: string }> {
  const res = await fetch('/api/admin/email', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) })
  const j = (await res.json().catch(() => ({}))) as T & { error?: string }
  if (!res.ok) throw new Error(j.error ?? 'Something went wrong.')
  return j
}

export type Preview = { id: string; label: string; hint: string; subject: string; html: string }
type Line = { ok: boolean; text: string }

/**
 * See each email exactly as members get it, switch between phone and desktop width, and send a real test of the one
 * you are looking at. Below that, a full code round trip to your inbox.
 */
export function EmailStudio({ adminEmail, from, previews }: { adminEmail: string; from: string; previews: Preview[] }) {
  const [sel, setSel] = useState(previews[0].id)
  const [phone, setPhone] = useState(false)
  const [to, setTo] = useState(adminEmail)
  const [busy, setBusy] = useState<string | null>(null)
  const [log, setLog] = useState<Line[]>([])
  const [step, setStep] = useState<0 | 1 | 2>(0)
  const [code, setCode] = useState('')
  const [t0, setT0] = useState(0)
  const cur = previews.find((p) => p.id === sel) ?? previews[0]

  const add = (l: Line) => setLog((x) => [l, ...x].slice(0, 6))

  const send = async () => {
    setBusy('send')
    try {
      const r = await call<{ to: string }>({ action: 'send', template: cur.id, to: to.trim() || undefined })
      add({ ok: true, text: `“${cur.label}” sent to ${r.to}. It should arrive in a few seconds. Check spam too.` })
    } catch (e) {
      add({ ok: false, text: `${cur.label}: ${e instanceof Error ? e.message : 'failed'}` })
    } finally {
      setBusy(null)
    }
  }

  const startCode = async () => {
    setBusy('code')
    try {
      await call({ action: 'code-start' })
      setT0(Date.now())
      setStep(1)
      setCode('')
    } catch (e) {
      add({ ok: false, text: `Code test: ${e instanceof Error ? e.message : 'failed'}` })
    } finally {
      setBusy(null)
    }
  }

  const checkCode = async () => {
    setBusy('check')
    try {
      const r = await call<{ ok: boolean }>({ action: 'code-check', code })
      if (r.ok) {
        setStep(2)
        add({ ok: true, text: `Round trip passed. The code arrived and was accepted ${Math.round((Date.now() - t0) / 1000)} seconds after sending, and it can’t be used again.` })
      } else add({ ok: false, text: 'That code was not accepted. Check the 6 digits, or send another (a code dies after 5 wrong tries).' })
    } catch (e) {
      add({ ok: false, text: e instanceof Error ? e.message : 'failed' })
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="grid gap-6">
      <section className="overflow-hidden rounded-[28px] border border-line bg-surface/70">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h2 className="font-display text-2xl">The emails</h2>
            <p className="text-xs text-mute">This is exactly what members receive. Pick one, check it, send yourself a test.</p>
          </div>
          <div className="flex items-center gap-1 rounded-full border border-line p-1" role="group" aria-label="Preview width">
            {[
              { v: false, icon: <MonitorSmartphone className="size-4" />, label: 'Desktop' },
              { v: true, icon: <Smartphone className="size-4" />, label: 'Phone' },
            ].map((o) => (
              <button key={o.label} type="button" onClick={() => setPhone(o.v)} aria-pressed={phone === o.v} className={cn('inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs transition-colors', phone === o.v ? 'bg-paper text-ink' : 'text-mute hover:text-paper')}>
                {o.icon}
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-line px-5 py-3" role="tablist" aria-label="Email type">
          {previews.map((p) => (
            <button key={p.id} type="button" role="tab" aria-selected={sel === p.id} onClick={() => setSel(p.id)} className={cn('h-9 rounded-full border px-4 text-sm transition-colors', sel === p.id ? 'border-paper bg-paper/10' : 'border-line text-mute hover:text-paper')}>
              {p.label}
            </button>
          ))}
        </div>

        <div className="grid gap-0 lg:grid-cols-[1fr_320px]">
          <div className="min-w-0 bg-[#050506] p-4 sm:p-6">
            <div className="mx-auto mb-3 max-w-[560px] rounded-2xl border border-line bg-surface/80 px-4 py-3 text-xs">
              <p className="flex gap-2"><span className="w-12 shrink-0 text-mute">From</span><span className="truncate">{from}</span></p>
              <p className="mt-1 flex gap-2"><span className="w-12 shrink-0 text-mute">Subject</span><span className="truncate">{cur.subject}</span></p>
            </div>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={cur.id + String(phone)} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25, ease: EASE_OUT }} className={cn('mx-auto overflow-hidden rounded-2xl border border-line bg-[#050506] transition-[max-width] duration-300', phone ? 'max-w-[380px]' : 'max-w-[640px]')}>
                {/* sandboxed: the preview can never run scripts or touch this page */}
                <iframe title={`${cur.label} preview`} srcDoc={cur.html} sandbox="" className="block h-[640px] w-full bg-[#050506]" />
              </motion.div>
            </AnimatePresence>
          </div>

          <aside className="border-t border-line p-5 lg:border-t-0 lg:border-l">
            <p className="font-display text-xl leading-tight">{cur.label}</p>
            <p className="mt-1 text-sm text-mute">{cur.hint}</p>
            <label className="mt-5 block font-mono text-xs text-mute" htmlFor="email-to">Send a test to</label>
            <input id="email-to" value={to} onChange={(e) => setTo(e.target.value)} type="email" className="mt-1.5 h-11 w-full rounded-full border border-line-strong bg-ink/80 px-4 text-sm focus:outline-none" />
            <button type="button" disabled={busy !== null} onClick={send} className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-paper text-sm font-medium text-ink transition-colors hover:bg-paper/85 disabled:opacity-50">
              {busy === 'send' ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Send test
            </button>
            <p className="mt-3 text-xs leading-snug text-mute">The test is labelled [TEST], uses a fake code (123456) and creates nothing.</p>
          </aside>
        </div>
      </section>

      <section className="rounded-[28px] border border-line bg-surface/70 p-5">
        <h2 className="font-display text-2xl">Full code round trip</h2>
        <p className="mt-1 text-sm text-mute">Stores a real code (hashed), emails it to {adminEmail}, then checks what you type. It tests the whole path without creating an account.</p>

        <ol className="mt-5 grid gap-3 sm:grid-cols-3">
          {[
            { n: 1, title: 'Send', body: 'We email you a fresh code.' },
            { n: 2, title: 'Type it in', body: 'Open the email and enter the 6 digits.' },
            { n: 3, title: 'Verified', body: 'The code is checked, then used up.' },
          ].map((s, i) => {
            const state = step > i ? 'done' : step === i ? 'now' : 'todo'
            return (
              <li key={s.n} className={cn('rounded-2xl border p-4 transition-colors', state === 'now' ? 'border-paper bg-paper/[0.06]' : state === 'done' ? 'border-emerald-400/40 bg-emerald-400/[0.05]' : 'border-line opacity-60')}>
                <span className={cn('grid size-7 place-items-center rounded-full text-xs font-semibold', state === 'done' ? 'bg-emerald-300 text-ink' : state === 'now' ? 'bg-paper text-ink' : 'bg-line-strong text-mute')}>{state === 'done' ? <Check className="size-4" /> : s.n}</span>
                <p className="mt-3 text-sm">{s.title}</p>
                <p className="text-xs text-mute">{s.body}</p>
              </li>
            )
          })}
        </ol>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button type="button" disabled={busy !== null} onClick={startCode} className="inline-flex h-11 items-center gap-2 rounded-full bg-paper px-6 text-sm font-medium text-ink hover:bg-paper/85 disabled:opacity-50">
            {busy === 'code' ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />} {step === 0 ? 'Send me a code' : 'Start again'}
          </button>
          {step === 1 && (
            <form onSubmit={(e) => { e.preventDefault(); if (code.length === 6) checkCode() }} className="flex items-center gap-2">
              <input autoFocus value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" aria-label="Code from the email" className="h-11 w-40 rounded-full border border-line-strong bg-ink/80 text-center font-mono text-lg tracking-[0.3em] focus:outline-none" />
              <button type="submit" disabled={code.length !== 6 || busy !== null} className="inline-flex h-11 items-center gap-2 rounded-full border border-line-strong px-5 text-sm hover:bg-paper/10 disabled:opacity-50">
                {busy === 'check' && <Loader2 className="size-4 animate-spin" />} Check
              </button>
            </form>
          )}
        </div>
      </section>

      {log.length > 0 && (
        <ul className="grid gap-2" aria-live="polite">
          {log.map((l, i) => (
            <motion.li key={`${i}-${l.text}`} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className={cn('flex items-start gap-2.5 rounded-2xl border px-4 py-3 text-sm', l.ok ? 'border-emerald-400/30 bg-emerald-400/[0.05]' : 'border-signal/40 bg-signal/[0.06] text-signal')}>
              {l.ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-300" /> : <XCircle className="mt-0.5 size-4 shrink-0" />}
              {l.text}
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Press to ask Resend what happened to one email (delivered, bounced...). */
export function StatusButton({ id }: { id: string }) {
  const [state, setState] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  if (!id || id === 'local') return null
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true)
        try {
          const r = await call<{ status: string | null; note?: string }>({ action: 'status', id })
          setState(r.status ?? r.note ?? 'unknown')
        } catch (e) {
          setState(e instanceof Error ? e.message : 'failed')
        } finally {
          setBusy(false)
        }
      }}
      className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-xs text-mute transition-colors hover:text-paper"
    >
      {busy ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
      {state ?? 'Check delivery'}
    </button>
  )
}
