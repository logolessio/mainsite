'use client'

import { Check, Copy, Loader2, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useFeature } from '@/components/shell/features-provider'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'

type State = { on: boolean; available: boolean; backupLeft: number }
type Setup = { secret: string; url: string }

async function call<T>(action: string, extra: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch('/api/me/two-step', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action, ...extra }) })
  const j = (await res.json().catch(() => ({}))) as T & { error?: string }
  if (!res.ok) throw new Error(j.error ?? 'That did not work.')
  return j
}

/**
 * Two-step sign-in, in Settings: turn it on with an authenticator app (the secret to type or open in the app, then a code to prove it works),
 * keep the eight backup codes shown once, and turn it off again with the password and a code. Not shown to people who sign in with Google or Discord.
 */
export function TwoStepCard() {
  const on = useFeature('two-step-sign-in')
  const [st, setSt] = useState<State | null>(null)
  const [setup, setSetup] = useState<Setup | null>(null)
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [codes, setCodes] = useState<string[] | null>(null)
  const [mode, setMode] = useState<'idle' | 'off'>('idle')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!on) return
    fetch('/api/me/two-step', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: State | null) => setSt(j))
      .catch(() => {})
  }, [on])
  if (!on || !st || !st.available) return null

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setError('')
    try {
      await fn()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That did not work.')
    } finally {
      setBusy(false)
    }
  }
  const copy = (t: string) => navigator.clipboard?.writeText(t).then(() => toast.ok('Copied')).catch(() => {})

  return (
    <section id="two-step" className="rounded-card border border-line bg-black/45 p-6">
      <div className="flex items-start gap-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-pill bg-white/[0.07]">
          <ShieldCheck aria-hidden="true" className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-normal">Two-step sign-in</h2>
          <p className="mt-1 text-sm leading-relaxed text-mute">After your password, logoless asks for a 6 digit code from an app on your phone. Even if someone learns your password, they cannot get in.</p>

          {codes ? (
            <div className="mt-5 rounded-panel border border-paper/30 bg-white/[0.04] p-4">
              <p className="text-sm font-medium">It is on. Keep these backup codes somewhere safe.</p>
              <p className="mt-1 text-xs text-mute">Each works once if you lose your phone. They are shown now and never again.</p>
              <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 font-mono text-sm">
                {codes.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
              <button type="button" onClick={() => copy(codes.join('\n'))} className="mt-4 inline-flex h-9 items-center gap-2 rounded-pill border border-line-strong px-4 text-sm transition-colors hover:bg-white/[0.06]">
                <Copy aria-hidden="true" className="size-3.5" /> Copy them
              </button>
              <button type="button" onClick={() => (setCodes(null), setSt((s) => (s ? { ...s, on: true, backupLeft: 8 } : s)))} className="ml-2 h-9 rounded-pill bg-paper px-4 text-sm font-medium text-ink">
                I have saved them
              </button>
            </div>
          ) : st.on ? (
            mode === 'off' ? (
              <form
                className="mt-5 grid max-w-sm gap-3"
                onSubmit={(e) => {
                  e.preventDefault()
                  void run(async () => {
                    await call('disable', { password, code })
                    setSt({ ...st, on: false, backupLeft: 0 })
                    setMode('idle')
                    setPassword('')
                    setCode('')
                    toast.ok('Two-step sign-in is off')
                  })
                }}
              >
                <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" aria-label="Your password" className="h-11 rounded-tile border border-line-strong bg-transparent px-4 text-[15px] outline-none focus:border-paper/60" />
                <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="A code from the app, or a backup code" aria-label="A code from the app, or a backup code" className="h-11 rounded-tile border border-line-strong bg-transparent px-4 text-[15px] outline-none focus:border-paper/60" />
                {error && <p role="alert" className="text-sm text-signal">{error}</p>}
                <div className="flex gap-2">
                  <button type="submit" disabled={busy || !password || !code} className="inline-flex h-10 items-center gap-2 rounded-pill bg-signal px-5 text-sm font-medium text-white disabled:opacity-50">
                    {busy && <Loader2 className="size-4 animate-spin" />} Turn it off
                  </button>
                  <button type="button" onClick={() => (setMode('idle'), setError(''))} className="h-10 rounded-pill border border-line-strong px-4 text-sm">
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1.5 text-sm">
                  <Check aria-hidden="true" className="size-4" /> On · {st.backupLeft} backup {st.backupLeft === 1 ? 'code' : 'codes'} left
                </span>
                <button type="button" onClick={() => setMode('off')} className="text-sm text-mute underline underline-offset-4 hover:text-paper">
                  Turn it off
                </button>
              </div>
            )
          ) : setup ? (
            <div className="mt-5 grid max-w-md gap-4">
              <ol className="grid gap-2 text-sm leading-relaxed text-paper/85">
                <li>1. Open an authenticator app (Google Authenticator, 1Password, Authy).</li>
                <li>2. Add an account, and type this key (or tap the link on your phone):</li>
              </ol>
              <div className="flex items-center justify-between gap-3 rounded-panel border border-line bg-black/40 px-4 py-3">
                <code className="min-w-0 font-mono text-sm tracking-wider break-all">{setup.secret.replace(/(.{4})/g, '$1 ').trim()}</code>
                <button type="button" onClick={() => copy(setup.secret)} aria-label="Copy the key" className="grid size-8 shrink-0 place-items-center rounded-pill hover:bg-white/10">
                  <Copy className="size-4" />
                </button>
              </div>
              <a href={setup.url} className="text-sm text-mute underline underline-offset-4 hover:text-paper">
                Open in my authenticator app
              </a>
              <form
                className="grid gap-3"
                onSubmit={(e) => {
                  e.preventDefault()
                  void run(async () => {
                    const r = await call<{ codes: string[] }>('enable', { code })
                    setCodes(r.codes)
                    setSetup(null)
                    setCode('')
                  })
                }}
              >
                <label htmlFor="two-step-code" className="text-sm text-mute">
                  3. Type the 6 digit code the app shows
                </label>
                <input id="two-step-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="123456" className="h-12 w-40 rounded-tile border border-line-strong bg-transparent px-4 text-center font-mono text-xl tracking-[0.25em] outline-none focus:border-paper/60" />
                {error && <p role="alert" className="text-sm text-signal">{error}</p>}
                <div className="flex gap-2">
                  <button type="submit" disabled={busy || code.length !== 6} className={cn('inline-flex h-10 items-center gap-2 rounded-pill bg-paper px-5 text-sm font-medium text-ink disabled:opacity-50')}>
                    {busy && <Loader2 className="size-4 animate-spin" />} Turn it on
                  </button>
                  <button type="button" onClick={() => (setSetup(null), setCode(''), setError(''))} className="h-10 rounded-pill border border-line-strong px-4 text-sm">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="mt-5">
              {error && <p role="alert" className="mb-3 text-sm text-signal">{error}</p>}
              <button type="button" disabled={busy} onClick={() => void run(async () => setSetup(await call<Setup>('begin')))} className="inline-flex h-10 items-center gap-2 rounded-pill bg-paper px-5 text-sm font-medium text-ink transition-colors hover:bg-paper/85 disabled:opacity-50">
                {busy && <Loader2 className="size-4 animate-spin" />} Set it up
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
