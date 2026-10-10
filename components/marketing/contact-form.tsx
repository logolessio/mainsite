'use client'

import { Check } from 'lucide-react'
import { useState } from 'react'
import { Field, Input, PrimaryButton, Select, Textarea } from '@/components/ui/fields'

export function ContactForm() {
  const [sent, setSent] = useState(false)
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
    <form
      onSubmit={(e) => {
        e.preventDefault()
        // TODO(backend): POST /api/contact
        setSent(true)
      }}
      className="grid gap-5"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Name">
          <Input required name="name" autoComplete="name" />
        </Field>
        <Field label="Email">
          <Input required type="email" name="email" autoComplete="email" />
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
        <Textarea required name="message" rows={6} />
      </Field>
      <PrimaryButton type="submit" className="self-start">
        Send message
      </PrimaryButton>
    </form>
  )
}
