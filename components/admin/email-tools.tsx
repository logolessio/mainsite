'use client'

import { CheckCircle2, Loader2, Mail, RefreshCw, Send, XCircle } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

async function call<T>(data: unknown): Promise<T & { error?: string }> {
  const res = await fetch('/api/admin/email', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) })
  const j = (await res.json().catch(() => ({}))) as T & { error?: string }
  if (!res.ok) throw new Error(j.error ?? 'Something went wrong.')
  return j
}

const TEMPLATES = [
  { id: 'signup', label: 'Sign-up code', hint: 'The “confirm your email” message new members get.' },
  { id: 'reset', label: 'Password reset code', hint: 'What “forgot your password” sends.' },
  { id: 'already', label: 'Already a member', hint: 'Sent when someone signs up with an address that has an account.' },
  { id: 'plain', label: 'Plain delivery test', hint: 'A simple message, just to prove sending works.' },
] as const

type Line = { ok: boolean; text: string }

/** Buttons that really send each email, and a full code round-trip. Test messages say [TEST] and carry no real code. */
export function EmailTools({ adminEmail }: { adminEmail: string }) {
  const [to, setTo] = useState(adminEmail)
  const [busy, setBusy] = useState<string | null>(null)
  const [log, setLog] = useState<Line[]>([])
  const [stage, setStage] = useState<'idle' | 'sent' | 'done'>('idle')
  const [code, setCode] = useState('')
  const [t0, setT0] = useState(0)

  const add = (l: Line) => setLog((x) => [l, ...x].slice(0, 12))

  const send = async (template: string, label: string) => {
    setBusy(template)
    try {
      const r = await call<{ to: string }>({ action: 'send', template, to: to.trim() || undefined })
      add({ ok: true, text: `${label} sent to ${r.to}. Check the inbox (and spam).` })
    } catch (e) {
      add({ ok: false, text: `${label}: ${e instanceof Error ? e.message : 'failed'}` })
    } finally {
      setBusy(null)
    }
  }

  const startCode = async () => {
    setBusy('code')
    try {
      await call({ action: 'code-start' })
      setT0(Date.now())
      setStage('sent')
      setCode('')
      add({ ok: true, text: `A real test code was stored and emailed to ${adminEmail}. Type it below.` })
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
        setStage('done')
        add({ ok: true, text: `Round trip passed: the code arrived and was accepted ${Math.round((Date.now() - t0) / 1000)}s after sending. The same code can’t be used twice.` })
      } else add({ ok: false, text: 'That code was not accepted. Check the 6 digits, or start again (a code dies after 5 wrong tries).' })
    } catch (e) {
      add({ ok: false, text: e instanceof Error ? e.message : 'failed' })
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-[24px] border border-line bg-surface/80 p-5">
        <h2 className="font-display text-2xl">Send a test of each email</h2>
        <p className="mt-1 text-sm text-mute">Every message is labelled [TEST] and its code is fake. By default they go to your own address.</p>
        <label className="mt-4 block font-mono text-xs text-mute" htmlFor="to">Send to</label>
        <input id="to" value={to} onChange={(e) => setTo(e.target.value)} type="email" className="mt-1.5 h-11 w-full max-w-md rounded-full border border-line-strong bg-ink/80 px-4 text-sm focus:outline-none" />
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {TEMPLATES.map((t) => (
            <button key={t.id} type="button" disabled={busy !== null} onClick={() => send(t.id, t.label)} className="flex items-start gap-3 rounded-2xl border border-line p-3.5 text-left transition-colors hover:bg-paper/[0.06] disabled:opacity-50">
              <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-paper text-ink">{busy === t.id ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}</span>
              <span>
                <span className="block text-sm">{t.label}</span>
                <span className="block text-xs text-mute">{t.hint}</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-[24px] border border-line bg-surface/80 p-5">
        <h2 className="font-display text-2xl">Full code round trip</h2>
        <p className="mt-1 text-sm text-mute">Stores a real code, emails it to {adminEmail}, then checks what you type. It tests the whole path (hashing, expiry, one-time use) without creating any account.</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button type="button" disabled={busy !== null} onClick={startCode} className="inline-flex h-10 items-center gap-2 rounded-full bg-paper px-5 text-sm font-medium text-ink hover:bg-paper/85 disabled:opacity-50">
            {busy === 'code' ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />} {stage === 'idle' ? 'Send me a code' : 'Send another'}
          </button>
          {stage === 'sent' && (
            <form onSubmit={(e) => { e.preventDefault(); if (code.length === 6) checkCode() }} className="flex items-center gap-2">
              <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" aria-label="Code from the email" className="h-10 w-36 rounded-full border border-line-strong bg-ink/80 text-center font-mono tracking-[0.3em] focus:outline-none" />
              <button type="submit" disabled={code.length !== 6 || busy !== null} className="inline-flex h-10 items-center gap-2 rounded-full border border-line-strong px-4 text-sm hover:bg-paper/10 disabled:opacity-50">
                {busy === 'check' && <Loader2 className="size-4 animate-spin" />} Check
              </button>
            </form>
          )}
        </div>
      </section>

      {log.length > 0 && (
        <ul className="grid gap-2" aria-live="polite">
          {log.map((l, i) => (
            <li key={i} className={cn('flex items-start gap-2.5 rounded-2xl border px-4 py-3 text-sm', l.ok ? 'border-emerald-400/30 bg-emerald-400/[0.05]' : 'border-signal/40 bg-signal/[0.06] text-signal')}>
              {l.ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-300" /> : <XCircle className="mt-0.5 size-4 shrink-0" />}
              {l.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** One row of "recent emails": press to ask Resend what happened to it. */
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
      className="inline-flex items-center gap-1 text-xs text-mute underline underline-offset-4 hover:text-paper"
    >
      {busy ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
      {state ?? 'Check delivery'}
    </button>
  )
}
