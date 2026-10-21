'use client'

import { Loader2, Lock } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useDialog } from '@/hooks/use-dialog'
import { ConfirmDialogHost } from './confirm-dialog'

type Ask = { resolve: (v: string | null) => void; reason?: string }
const EVENT = 'logoless:admin-secret'

/** Asks the admin for their admin password and resolves with it, or null if they cancel. Needs <SecretDialogHost /> on the page. */
export function askAdminSecret(reason?: string): Promise<string | null> {
  return new Promise((resolve) => {
    window.dispatchEvent(new CustomEvent<Ask>(EVENT, { detail: { resolve, reason } }))
  })
}

/** The password box, and the box that asks before risky actions (components/admin/confirm-dialog.tsx). */
export function SecretDialogHost() {
  return (
    <>
      <ConfirmDialogHost />
      <SecretBox />
    </>
  )
}

/** The password box itself. If no admin password exists yet it offers to make one. */
function SecretBox() {
  const [ask, setAsk] = useState<Ask | null>(null)
  const [isSet, setIsSet] = useState<boolean | null>(null)
  const [pw, setPw] = useState('')
  const [again, setAgain] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const on = (e: Event) => {
      const detail = (e as CustomEvent<Ask>).detail
      setAsk(detail)
      setPw('')
      setAgain('')
      setError('')
      setIsSet(null)
      fetch('/api/admin/security', { cache: 'no-store' })
        .then((r) => r.json())
        .then((j: { set?: boolean }) => setIsSet(Boolean(j.set)))
        .catch(() => setIsSet(true))
    }
    window.addEventListener(EVENT, on)
    return () => window.removeEventListener(EVENT, on)
  }, [])
  useEffect(() => {
    if (ask && isSet !== null) window.setTimeout(() => input.current?.focus(), 30)
  }, [ask, isSet])

  const close = (v: string | null) => {
    ask?.resolve(v)
    setAsk(null)
  }
  const box = useDialog<HTMLFormElement>(Boolean(ask), () => close(null), { initial: 'none' })

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy || !ask) return
    setError('')
    if (isSet) return close(pw)
    if (pw.length < 10) return setError('Use at least 10 characters.')
    if (pw !== again) return setError('The two do not match.')
    setBusy(true)
    const res = await fetch('/api/admin/security', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ next: pw }) }).catch(() => null)
    const j = (await res?.json().catch(() => ({}))) as { error?: string }
    setBusy(false)
    if (!res?.ok) return setError(j.error ?? 'Could not save that.')
    close(pw)
  }

  if (!ask || typeof document === 'undefined') return null
  return createPortal(
    <div className="fixed inset-0 z-[300] grid place-items-center bg-black/70 px-4" onMouseDown={() => close(null)} role="presentation">
      <form ref={box} onSubmit={submit} onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Admin password" className="w-full max-w-sm rounded-[calc(2rem*var(--round,1))] border border-line-strong bg-ink p-7">
        <span className="grid size-11 place-items-center rounded-pill bg-paper text-ink">
          <Lock className="size-5" />
        </span>
        <p className="mt-5 font-display text-3xl leading-tight">{isSet === false ? 'Make your admin password' : 'Enter your admin password'}</p>
        <p className="mt-2 text-sm leading-relaxed text-mute">
          {isSet === false ? 'Risky actions ask for this each time. It is separate from how you sign in. Choose something only you know.' : (ask.reason ?? 'This could affect the whole company, so it needs your admin password.')}
        </p>
        {isSet !== null && (
          <div className="mt-5 grid gap-3">
            <input ref={input} type="password" autoComplete={isSet ? 'current-password' : 'new-password'} value={pw} onChange={(e) => setPw(e.target.value)} placeholder={isSet ? 'Admin password' : 'New password (10+ characters)'} className="h-12 w-full rounded-pill border border-line-strong bg-transparent px-5 outline-none focus:border-paper" />
            {isSet === false && <input type="password" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} placeholder="Type it again" className="h-12 w-full rounded-pill border border-line-strong bg-transparent px-5 outline-none focus:border-paper" />}
          </div>
        )}
        {error && (
          <p role="alert" className="mt-3 text-sm text-signal">
            {error}
          </p>
        )}
        <div className="mt-6 flex items-center gap-3">
          <button type="submit" disabled={busy || isSet === null || !pw} className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-pill bg-paper text-[15px] font-medium text-ink transition-colors hover:bg-paper/85 disabled:opacity-40">
            {busy && <Loader2 className="size-4 animate-spin" />} {isSet === false ? 'Save and continue' : 'Continue'}
          </button>
          <button type="button" onClick={() => close(null)} className="h-12 px-4 text-sm text-mute hover:text-paper">
            Cancel
          </button>
        </div>
      </form>
    </div>,
    document.body,
  )
}
