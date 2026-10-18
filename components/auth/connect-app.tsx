'use client'

import { useState } from 'react'
import { signOut } from 'next-auth/react'
import { PrimaryButton } from '@/components/ui/fields'

/** The one question the Mac app's sign-in sheet asks: continue as this account? Then the sheet closes and the app is signed in. */
export function ConnectApp({ email, state, challenge, redirect, back }: { email: string; state: string; challenge: string; redirect?: string; back: string }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const go = async () => {
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/app/code', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ state, challenge, redirect }) })
      const data = (await res.json().catch(() => ({}))) as { redirect?: string; error?: string }
      if (!res.ok || !data.redirect) throw new Error(data.error ?? 'Something went wrong. Please try again.')
      setDone(true)
      window.location.assign(data.redirect)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.')
      setBusy(false)
    }
  }

  return (
    <div className="w-full max-w-sm text-center">
      <h1 className="font-display text-4xl leading-tight tracking-[-0.03em]">{done ? 'You are signed in' : 'Open the logoless app'}</h1>
      <p className="mt-4 text-[15px] text-paper/60">{done ? 'You can close this window and go back to the app.' : <>Continue as <span className="text-paper">{email}</span>.</>}</p>
      {!done && (
        <>
          <PrimaryButton type="button" onClick={go} disabled={busy} className="mt-8 w-full">
            {busy ? 'One moment…' : 'Continue'}
          </PrimaryButton>
          {error && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}
          <button type="button" onClick={() => signOut({ callbackUrl: `/login?next=${encodeURIComponent(back)}` })} className="mt-6 text-sm text-paper/50 underline underline-offset-4 transition-colors hover:text-paper">
            Use a different account
          </button>
        </>
      )}
    </div>
  )
}
