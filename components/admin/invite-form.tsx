'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { AtSign, Loader2, Mail, Sparkles } from 'lucide-react'
import { BrandIcon } from '@/components/brand-icon'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { useFeature } from '@/components/shell/features-provider'
import { clientUrl } from '@/lib/client-host'
import { dmText, slugFromName, slugProblem } from '@/lib/invite-shared'
import { cn } from '@/lib/utils'
import { CopyButton } from './copy-button'

const CHANNELS = [
  { id: 'instagram', label: 'Instagram DM', icon: ({ className }: { className?: string }) => <BrandIcon name="instagram" className={className} /> },
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'other', label: 'Somewhere else', icon: AtSign },
] as const

const field = 'h-11 w-full rounded-pill border border-line-strong bg-ink/80 px-4 text-sm placeholder:text-mute focus:border-paper/60 focus:outline-none'

/** Makes a private link. The address is built from the name as you type, and you can change it. */
export function InviteForm() {
  const router = useRouter()
  // with client links on, the link is the client's own address: name.logoless.io
  const sub = useFeature('client-links')
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [touched, setTouched] = useState(false)
  const [channel, setChannel] = useState<(typeof CHANNELS)[number]['id']>('instagram')
  const [handle, setHandle] = useState('')
  const [email, setEmail] = useState('')
  const [lock, setLock] = useState(false)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [made, setMade] = useState<{ url: string; name: string } | null>(null)

  const finalSlug = touched ? slug : slugFromName(name)
  const problem = useMemo(() => (finalSlug ? slugProblem(finalSlug) : null), [finalSlug])
  const ready = name.trim().length >= 2 && finalSlug && !problem && (!lock || /^\S+@\S+\.\S+$/.test(email))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    const res = await fetch('/api/admin/invites', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ artistName: name.trim(), slug: finalSlug, channel, handle: handle.trim() || undefined, email: email.trim() || undefined, note: note.trim() || undefined, lock }),
    }).catch(() => null)
    const j = (await res?.json().catch(() => ({}))) as { error?: string; url?: string; slug?: string }
    setBusy(false)
    if (!res?.ok || !j.url) return setError(j.error ?? 'Could not make the link.')
    setMade({ url: sub && j.slug ? clientUrl(j.slug) : j.url, name: name.trim() })
    setName('')
    setSlug('')
    setTouched(false)
    setHandle('')
    setEmail('')
    setLock(false)
    setNote('')
    router.refresh()
  }

  return (
    <div>
      <form onSubmit={submit} className="grid gap-5">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="font-mono text-xs text-mute">Artist or brand name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="e.g. KXNG VALE" className={cn(field, 'mt-2')} />
          </label>
          <label className="block">
            <span className="font-mono text-xs text-mute">Their link</span>
            <span className={cn(field, 'mt-2 flex items-center gap-0 pr-2 focus-within:border-paper/60', problem && 'border-signal/60')}>
              {!sub && <span className="text-mute">logoless.io/</span>}
              <input
                value={finalSlug}
                onChange={(e) => {
                  setTouched(true)
                  setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 30))
                }}
                maxLength={30}
                placeholder="kxngvale"
                aria-label="Link name"
                className="h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-mute"
              />
              {sub && <span className="text-mute">.logoless.io</span>}
            </span>
            {problem && <span className="mt-1.5 block text-xs text-signal">{problem}</span>}
          </label>
        </div>

        <div>
          <span className="font-mono text-xs text-mute">How did you contact them?</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {CHANNELS.map((c) => (
              <button key={c.id} type="button" onClick={() => setChannel(c.id)} aria-pressed={channel === c.id} className={cn('inline-flex h-10 items-center gap-2 rounded-pill border px-4 text-sm transition-colors', channel === c.id ? 'border-paper bg-paper/10' : 'border-line-strong text-mute hover:text-paper')}>
                <c.icon className="size-4" /> {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {channel !== 'email' && (
            <label className="block">
              <span className="font-mono text-xs text-mute">Their {channel === 'instagram' ? 'Instagram' : 'contact'} (optional)</span>
              <input value={handle} onChange={(e) => setHandle(e.target.value)} maxLength={60} placeholder="@kxngvale" className={cn(field, 'mt-2')} />
            </label>
          )}
          <label className="block">
            <span className="font-mono text-xs text-mute">Their email {lock ? '' : '(optional)'}</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={120} placeholder="name@label.com" className={cn(field, 'mt-2')} />
          </label>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-line bg-white/[0.02] p-4">
          <input type="checkbox" checked={lock} onChange={(e) => setLock(e.target.checked)} className="mt-1 size-4 accent-white" />
          <span>
            <span className="block text-sm">Only let that email claim the link</span>
            <span className="mt-0.5 block text-xs text-mute">Safest. Anyone who guesses the link still cannot take it. Leave this off for Instagram contacts, where the first person to sign in claims it and you can hand it back if it was the wrong one.</span>
          </span>
        </label>

        <label className="block">
          <span className="font-mono text-xs text-mute">Private note (only admins see this)</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="Agreed on a $500 test campaign" className={cn(field, 'mt-2')} />
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button disabled={!ready || busy} className="inline-flex h-11 items-center gap-2 rounded-pill bg-paper px-6 text-sm font-medium text-ink transition-colors hover:bg-paper/85 disabled:opacity-40">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Make their link
          </button>
          {finalSlug && !problem && (sub ? <span className="text-sm text-mute"><span className="text-paper">{finalSlug}</span>.logoless.io</span> : <span className="text-sm text-mute">logoless.io/<span className="text-paper">{finalSlug}</span></span>)}
        </div>
        {error && <p role="alert" className="text-sm text-signal">{error}</p>}
      </form>

      <AnimatePresence>
        {made && (
          <motion.div initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} className="mt-6 rounded-3xl border border-emerald-400/30 bg-emerald-400/[0.05] p-5">
            <p className="text-sm text-emerald-300">Link ready for {made.name}</p>
            <p className="mt-1 font-display text-2xl break-all">{made.url}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <CopyButton text={made.url} label="Copy link" />
              <CopyButton text={dmText(made.name, made.url)} label="Copy a message to send" />
              <button type="button" onClick={() => setMade(null)} className="h-9 rounded-pill px-3 text-xs text-mute hover:text-paper">Dismiss</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
