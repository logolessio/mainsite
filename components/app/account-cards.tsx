'use client'

import { useEffect, useState } from 'react'
import { Field, Input } from '@/components/ui/fields'
import { GlassTabs } from '@/components/ui/glass-tabs'
import { money } from '@/lib/format'
import { ActionButton, Card } from './ui'

type Choice = 'return' | 'logoless'
type State = { availableCents: number; pendingCents: number; deletion: { at: number; choice: string } | null; graceDays: number }

/** The one address payouts go to. Creators only need an email. */
export function PayPalCard() {
  const [email, setEmail] = useState('')
  const [saved, setSaved] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  useEffect(() => {
    fetch('/api/me/paypal', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { email?: string } | null) => {
        setEmail(j?.email ?? '')
        setSaved(j?.email ?? '')
      })
      .catch(() => {})
  }, [])
  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setMsg(null)
    const res = await fetch('/api/me/paypal', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email }) }).catch(() => null)
    const j = (await res?.json().catch(() => ({}))) as { error?: string }
    setBusy(false)
    if (res?.ok) {
      setSaved(email.trim().toLowerCase())
      setMsg({ ok: true, text: email ? 'Saved.' : 'Removed.' })
    } else setMsg({ ok: false, text: j?.error ?? 'Could not save that.' })
  }
  return (
    <Card title="Get paid">
      <form onSubmit={save}>
        <Field label="PayPal email" hint="We pay out to this address. No bank details needed.">
          <Input type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <ActionButton type="submit" variant="ghost" disabled={busy || email.trim().toLowerCase() === saved}>
            {busy ? 'Saving…' : 'Save'}
          </ActionButton>
          {msg && (
            <span role={msg.ok ? 'status' : 'alert'} className={msg.ok ? 'text-sm text-mute' : 'text-sm text-signal'}>
              {msg.text}
            </span>
          )}
        </div>
      </form>
    </Card>
  )
}

/** Deleting an account: pick what happens to leftover money, wait 30 days, then it is gone for good. */
export function DeleteCard() {
  const [s, setS] = useState<State | null>(null)
  const [choice, setChoice] = useState<Choice>('return')
  const [sure, setSure] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const load = () =>
    fetch('/api/me/account', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: State | null) => setS(j))
      .catch(() => setS(null))
  useEffect(() => {
    load()
  }, [])

  const post = async (path: string, payload?: unknown) => {
    if (busy) return
    setBusy(true)
    setErr('')
    const res = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload ?? {}) }).catch(() => null)
    const j = (await res?.json().catch(() => ({}))) as { error?: string }
    setBusy(false)
    if (!res?.ok) return setErr(j?.error ?? 'Something went wrong. Try again.')
    setSure(false)
    await load()
  }

  if (!s) return null
  const left = s.availableCents + s.pendingCents

  if (s.deletion) {
    const days = Math.max(0, Math.ceil((s.deletion.at + s.graceDays * 86400 - Date.now() / 1000) / 86400))
    return (
      <Card title="Your account is scheduled for deletion">
        <p className="text-sm leading-relaxed text-mute">
          It will be deleted for good in {days} {days === 1 ? 'day' : 'days'}.
          {left > 0 && ' Until then your money stays in your account and you can still withdraw it.'} Changed your mind? Nothing has been removed yet.
        </p>
        <ActionButton type="button" variant="ghost" className="mt-4" disabled={busy} onClick={() => post('/api/me/account/cancel')}>
          {busy ? 'Working…' : 'Keep my account'}
        </ActionButton>
        {err && (
          <p role="alert" className="mt-3 text-sm text-signal">
            {err}
          </p>
        )}
      </Card>
    )
  }

  return (
    <Card title="Delete your account">
      <p className="text-sm leading-relaxed text-mute">
        Your profile and linked accounts are removed after {s.graceDays} days. Until then nothing changes and you can undo it here. Records we must keep, like payment history, stay without your name.
      </p>
      {left > 0 && (
        <div className="mt-4 rounded-2xl border border-line p-4">
          <p className="text-sm">
            You still have <strong>{money(left)}</strong> in your account. Withdraw it first, or choose where it goes.
          </p>
          <div className="mt-3">
            <GlassTabs
              label="Where the money goes"
              value={choice}
              onChange={(v) => setChoice(v as Choice)}
              tabs={[
                { id: 'return', label: 'Back to campaigns' },
                { id: 'logoless', label: 'To logoless' },
              ]}
            />
          </div>
          <p className="mt-3 text-xs text-mute">
            {choice === 'return' ? 'It goes back to the campaigns it came from, in proportion to what each paid you.' : 'logoless keeps it.'} Either way it waits {s.graceDays} days first.
          </p>
        </div>
      )}
      {!sure ? (
        <ActionButton type="button" variant="danger" className="mt-4" onClick={() => setSure(true)}>
          Delete my account
        </ActionButton>
      ) : (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <ActionButton type="button" variant="danger" disabled={busy} onClick={() => post('/api/me/account/delete', { choice: left > 0 ? choice : 'none' })}>
            {busy ? 'Working…' : `Yes, delete in ${s.graceDays} days`}
          </ActionButton>
          <ActionButton type="button" variant="ghost" disabled={busy} onClick={() => setSure(false)}>
            Cancel
          </ActionButton>
        </div>
      )}
      {err && (
        <p role="alert" className="mt-3 text-sm text-signal">
          {err}
        </p>
      )}
    </Card>
  )
}
