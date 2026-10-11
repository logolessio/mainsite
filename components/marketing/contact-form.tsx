'use client'

import { Check } from 'lucide-react'
import { useState } from 'react'
import { Field, Input, PrimaryButton, Select, Textarea } from '@/components/ui/fields'

export function ContactForm() {
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    const data = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>
    try {
      const res = await fetch('/api/contact', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) })
      const j = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) setError(j.error ?? 'Something went wrong. Please try again.')
      else setSent(true)
    } catch {
      setError('We could not reach the server. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  if (sent)
    return (
      <div role="status" className="border border-line p-10 rounded-2xl">
        <span className="grid size-10 place-items-center bg-paper text-ink">
          <Check className="size-5" />
        </span>
        <p className="mt-6 font-display text-4xl">Message sent</p>
        <p className="mt-2 text-mute">Thanks. We usually reply within two business days.</p>
      </div>
    )
  return (
    <form onSubmit={submit} className="grid gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Name">
          <Input required name="name" autoComplete="name" maxLength={80} />
        </Field>
        <Field label="Email">
          <Input required type="email" name="email" autoComplete="email" maxLength={254} />
        </Field>
      </div>
      <Field label="Topic">
        <Select name="topic" defaultValue="brand">
          <option value="brand">I want to launch a campaign</option>
          <option value="clipper">I am a clipper and need help</option>
          <option value="payments">Payments or payouts</option>
          <option value="legal">Legal, privacy or copyright</option>
          <option value="other">Something else</option>
        </Select>
      </Field>
      <Field label="Message">
        <Textarea required name="message" rows={6} minLength={5} maxLength={4000} />
      </Field>
      {/* Honeypot: hidden from people, irresistible to bots. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" />
      {error && (
        <p role="alert" className="text-sm text-signal">
          {error}
        </p>
      )}
      <PrimaryButton type="submit" disabled={busy} className="self-start">
        {busy ? 'Sending…' : 'Send message'}
      </PrimaryButton>
    </form>
  )
}
