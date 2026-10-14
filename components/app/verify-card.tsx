'use client'

import { Check, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Input } from '@/components/ui/fields'
import { ActionButton } from './ui'

/** Asks for the six digit code we email. Used on the Getting set up page for anyone who has not verified yet. */
export function VerifyCard({ email }: { email: string }) {
  const router = useRouter()
  const [stage, setStage] = useState<'idle' | 'sent' | 'done'>('idle')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const call = async (payload: object) => {
    const res = await fetch('/api/me/verify', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) })
    const j = (await res.json().catch(() => ({}))) as { error?: string; verified?: boolean }
    if (!res.ok) throw new Error(j.error ?? 'Something went wrong. Please try again.')
    return j
  }
  const send = async () => {
    setBusy(true)
    setError('')
    try {
      await call({ action: 'send' })
      setStage('sent')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send the code.')
    }
    setBusy(false)
  }
  const check = async (v: string) => {
    setBusy(true)
    setError('')
    try {
      await call({ action: 'check', code: v })
      setStage('done')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That code is not right.')
    }
    setBusy(false)
  }

  if (stage === 'done') {
    return (
      <p className="mt-4 inline-flex items-center gap-2 text-sm">
        <Check className="size-4" /> Verified. Thank you.
      </p>
    )
  }
  return (
    <div className="mt-4">
      {stage === 'idle' ? (
        <ActionButton onClick={send} disabled={busy}>
          {busy && <Loader2 aria-hidden="true" className="size-4 animate-spin" />} Email me a code
        </ActionButton>
      ) : (
        <form
          className="flex flex-wrap items-center gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (/^\d{6}$/.test(code)) void check(code)
          }}
        >
          <Input
            inputMode="numeric"
            autoComplete="one-time-code"
            aria-label="6 digit code"
            placeholder="000000"
            value={code}
            maxLength={6}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="w-40 text-center font-mono tracking-[0.3em]"
          />
          <ActionButton type="submit" disabled={busy || code.length !== 6}>
            {busy && <Loader2 aria-hidden="true" className="size-4 animate-spin" />} Verify
          </ActionButton>
          <button type="button" onClick={send} disabled={busy} className="text-sm text-mute underline underline-offset-4 hover:text-paper">
            Send it again
          </button>
          <span className="basis-full text-xs text-mute">We sent it to {email}. It works for 10 minutes.</span>
        </form>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-signal">
          {error}
        </p>
      )}
    </div>
  )
}
