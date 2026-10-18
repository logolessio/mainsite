'use client'

import { Check, Copy, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { Field, Input, PrimaryButton, Textarea } from '@/components/ui/fields'
import { CONTACT_TOPICS, REPORT_TOPICS, type Topic } from '@/lib/inquiry-topics'
import { cn } from '@/lib/utils'

/**
 * Send a message or a report straight to the admins through the site. Pick a ready-made topic (it fills in a message you can
 * change) or write your own. Nothing is emailed: the sender keeps a private link to the conversation and is told here when we reply.
 */
export function InquiryForm({ kind, target = '', topic: initialTopic }: { kind: 'contact' | 'report'; target?: string; topic?: string }) {
  const topics = kind === 'report' ? REPORT_TOPICS : CONTACT_TOPICS
  const start = topics.find((t) => t.id === initialTopic) ?? null
  const [topic, setTopic] = useState<Topic | null>(start)
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState(start?.template ?? '')
  const [about, setAbout] = useState(target)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState<{ id: string; token: string; signedIn: boolean } | null>(null)
  const [copied, setCopied] = useState(false)

  const pick = (t: Topic) => {
    // switching topic swaps the ready-made text, but never throws away something the person wrote themselves
    const wasTemplate = !topic || message.trim() === '' || message === topic.template
    setTopic(t)
    if (wasTemplate) setMessage(t.template)
    setError('')
  }

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (busy || !topic) return
    setBusy(true)
    setError('')
    const honey = (e.currentTarget.elements.namedItem('website') as HTMLInputElement | null)?.value ?? ''
    try {
      const res = await fetch('/api/inquiries', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind, topic: topic.id, subject, message, name, target: about, website: honey }) })
      const j = (await res.json().catch(() => ({}))) as { error?: string; id?: string; token?: string; signedIn?: boolean }
      if (!res.ok || !j.id) setError(j.error ?? 'Something went wrong. Please try again.')
      else setSent({ id: j.id, token: j.token ?? '', signedIn: Boolean(j.signedIn) })
    } catch {
      setError('We could not reach the server. Check your connection and try again.')
    }
    setBusy(false)
  }

  if (sent) {
    const path = `/inquiry/${sent.id}${sent.signedIn ? '' : `?t=${sent.token}`}`
    const full = typeof window === 'undefined' ? path : `${window.location.origin}${path}`
    return (
      <div role="status" className="rounded-[calc(2rem*var(--round,1))] border border-line p-8 md:p-10">
        <span className="grid size-11 place-items-center rounded-pill bg-paper text-ink">
          <Check className="size-5" />
        </span>
        <p className="mt-6 font-display text-4xl">{kind === 'report' ? 'Report sent' : 'Message sent'}</p>
        <p className="mt-3 max-w-md text-lg text-mute">A person on the team will read it. We usually reply within two business days, and the reply appears on the page below.</p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link href={path} className="inline-flex h-12 items-center rounded-pill bg-paper px-7 text-[15px] font-medium text-ink transition-colors hover:bg-paper/85">
            Open the conversation
          </Link>
          {!sent.signedIn && (
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(full)
                  setCopied(true)
                  window.setTimeout(() => setCopied(false), 1800)
                } catch {
                  /* the link is on the page anyway */
                }
              }}
              className="inline-flex h-12 items-center gap-2 rounded-pill border border-line-strong px-6 text-[15px] transition-colors hover:bg-paper/[0.06]"
            >
              {copied ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />} Copy the link
            </button>
          )}
        </div>
        {!sent.signedIn && <p className="mt-5 max-w-md text-sm leading-relaxed text-mute">Keep this link. You are not signed in, so it is the only way back to this conversation, and we cannot email you.</p>}
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="grid gap-8">
      <fieldset>
        <legend className="font-mono text-xs text-mute">{kind === 'report' ? 'What are you reporting?' : 'What is it about?'}</legend>
        <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
          {topics.map((t) => {
            const on = topic?.id === t.id
            return (
              <button key={t.id} type="button" aria-pressed={on} onClick={() => pick(t)} className={cn('rounded-2xl border px-4 py-3.5 text-left transition-colors', on ? 'border-paper bg-paper text-ink' : 'border-line-strong hover:border-paper/60 hover:bg-paper/[0.04]')}>
                <span className="block text-[16px] leading-tight">{t.label}</span>
                <span className={cn('mt-1 block text-[13px]', on ? 'text-ink/60' : 'text-mute')}>{t.hint}</span>
              </button>
            )
          })}
        </div>
      </fieldset>

      {topic && (
        <div className="grid gap-5">
          {topic.id === 'custom' && (
            <Field label="Subject">
              <Input required name="subject" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={120} placeholder="A few words" />
            </Field>
          )}
          {kind === 'report' && (
            <Field label="What is it about?" hint="A link, a @username or a campaign name. Optional, but it helps us find it fast.">
              <Input name="target" value={about} onChange={(e) => setAbout(e.target.value)} maxLength={300} placeholder="https://… or @username" />
            </Field>
          )}
          <Field label={kind === 'report' ? 'What happened?' : 'Your message'} hint="You can change any of this text.">
            <Textarea required name="message" rows={8} minLength={10} maxLength={4000} value={message} onChange={(e) => setMessage(e.target.value)} />
          </Field>
          <Field label="Your name" hint="Optional. Signed-in members are named automatically.">
            <Input name="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={80} />
          </Field>
          {/* Honeypot: hidden from people, irresistible to bots. */}
          <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" />
          {error && (
            <p role="alert" className="text-sm text-signal">
              {error}
            </p>
          )}
          <PrimaryButton type="submit" disabled={busy} className="self-start">
            {busy ? <Loader2 className="size-4 animate-spin" /> : null} {busy ? 'Sending' : kind === 'report' ? 'Send report' : 'Send message'}
          </PrimaryButton>
          <p className="text-xs leading-relaxed text-mute">Goes straight to the logoless team inside the site. We do not email you; you will see our reply on your conversation page.</p>
        </div>
      )}
    </form>
  )
}
