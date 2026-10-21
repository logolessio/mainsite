'use client'

import { CheckCircle2, CircleAlert, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

type Result = { ready: boolean; checks: { ok: boolean; label: string; fix?: string }[]; app: { name: string; type: 'confidential' | 'public'; verified: boolean } | null }

const field = 'h-12 w-full rounded-2xl border border-line-strong bg-ink/80 px-4 font-mono text-sm outline-none transition-colors placeholder:text-mute/70 focus:border-paper'

/** Paste a client id and a return address, and see whether a sign-in would work, with the fix for anything that would not. */
export function SetupChecker({ issuer, initialClientId = '', initialRedirect = '' }: { issuer: string; initialClientId?: string; initialRedirect?: string }) {
  const [clientId, setClientId] = useState(initialClientId)
  const [redirect, setRedirect] = useState(initialRedirect)
  const [busy, setBusy] = useState(false)
  const [res, setRes] = useState<Result | null>(null)
  const [error, setError] = useState('')

  const run = async () => {
    setBusy(true)
    setError('')
    try {
      const r = await fetch(`/api/developers/check?${new URLSearchParams({ client_id: clientId.trim(), redirect_uri: redirect.trim() })}`, { cache: 'no-store' })
      const j = (await r.json()) as Result & { error?: string }
      if (!r.ok) throw new Error(j.error ?? 'Could not check that.')
      setRes(j)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not check that.')
      setRes(null)
    }
    setBusy(false)
  }

  const open = async () => {
    const b64 = (b: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    const verifier = b64(crypto.getRandomValues(new Uint8Array(32)))
    const p = new URLSearchParams({ response_type: 'code', client_id: clientId.trim(), redirect_uri: redirect.trim(), scope: 'openid profile', state: b64(crypto.getRandomValues(new Uint8Array(12))) })
    if (res?.app?.type === 'public') {
      p.set('code_challenge', b64(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))))
      p.set('code_challenge_method', 'S256')
    }
    window.open(`/oauth/authorize?${p}`, '_blank', 'noopener')
  }

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        void run()
      }}
    >
      <div className="grid gap-4 xl:grid-cols-2">
        <label className="grid gap-1.5">
          <span className="text-sm">Client id</span>
          <input className={field} value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="lg_…" spellCheck={false} autoComplete="off" />
        </label>
        <label className="grid gap-1.5">
          <span className="text-sm">Return address your code sends</span>
          <input className={field} value={redirect} onChange={(e) => setRedirect(e.target.value)} placeholder="https://example.com/auth/callback" spellCheck={false} autoComplete="off" inputMode="url" />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy || !clientId.trim()} className="inline-flex h-11 items-center gap-2 rounded-pill bg-paper px-6 text-sm font-medium text-ink transition-colors hover:bg-paper/85 disabled:opacity-40">
          {busy && <Loader2 aria-hidden="true" className="size-4 animate-spin" />} Check my setup
        </button>
        {res?.ready && (
          <button type="button" onClick={() => void open()} className="h-11 rounded-pill border border-line-strong px-5 text-sm transition-colors hover:bg-paper/10">
            Open the sign-in page
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm text-signal">
          {error}
        </p>
      )}
      {res && (
        <div aria-live="polite" className={cn('rounded-2xl border p-5', res.ready ? 'border-emerald-400/30 bg-emerald-400/[0.04]' : 'border-signal/30 bg-signal/[0.04]')}>
          <p className="font-medium">{res.ready ? 'Ready: a sign-in with these will work.' : 'Not yet. Fix the items below.'}</p>
          <ul className="mt-3 grid gap-2.5">
            {res.checks.map((c) => (
              <li key={c.label} className="flex gap-2.5 text-sm">
                {c.ok ? <CheckCircle2 aria-label="OK" className="mt-0.5 size-4 shrink-0 text-emerald-300" /> : <CircleAlert aria-label="Problem" className="mt-0.5 size-4 shrink-0 text-signal" />}
                <span>
                  {c.label}
                  {c.fix && <span className="block text-mute">{c.fix}</span>}
                </span>
              </li>
            ))}
          </ul>
          {res.ready && <p className="mt-4 text-xs text-mute">Opening the sign-in page checks the logoless side. When you press Allow you are sent to your return address with a code, which your own code then swaps at {issuer}/api/oauth/token.</p>}
        </div>
      )}
    </form>
  )
}
