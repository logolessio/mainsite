'use client'

import { Loader2, Megaphone } from 'lucide-react'
import { useState } from 'react'
import { runSiteCheck } from '@/lib/site-check-client'
import { cn } from '@/lib/utils'
import { askAdminSecret } from './secret-dialog'

const AUDIENCES = [
  { id: 'everyone', label: 'Everyone', hint: 'Every active member.' },
  { id: 'clippers', label: 'Clippers', hint: 'Everyone who is not a brand.' },
  { id: 'brands', label: 'Brands', hint: 'People with a campaign or a brand balance.' },
  { id: 'active', label: 'Active this week', hint: 'Anyone seen in the last 7 days.' },
  { id: 'team', label: 'The team', hint: 'Admins and developers.' },
  { id: 'one', label: 'One person', hint: 'By email address.' },
  { id: 'discord', label: 'Discord only', hint: 'Only post it in the Discord server. Nobody is notified on the site.' },
] as const

const input = 'h-11 w-full rounded-2xl border border-line-strong bg-ink/80 px-4 text-sm outline-none focus:border-paper'

/** Write once, reach a whole group: it lands in their notifications, and optionally in their inbox. */
export function BroadcastForm() {
  const [audience, setAudience] = useState<(typeof AUDIENCES)[number]['id']>('active')
  const [to, setTo] = useState('')
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [href, setHref] = useState('')
  const [email, setEmail] = useState(false)
  const [discord, setDiscord] = useState<'' | 'news' | 'updates'>('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const big = audience !== 'one' && audience !== 'team'
  const onlyDiscord = audience === 'discord'
  const aud = AUDIENCES.find((a) => a.id === audience)!

  return (
    <form
      className="grid max-w-3xl gap-6"
      onSubmit={async (e) => {
        e.preventDefault()
        let secret: string | undefined
        if (big) {
          const p = await askAdminSecret(`This will notify ${aud.label.toLowerCase()} straight away, and it cannot be taken back.`)
          if (!p) return
          secret = p
        }
        setBusy(true)
        setMsg(null)
        const res = await fetch('/api/admin/broadcast', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ audience, to: audience === 'one' ? to : undefined, title, text, href: href || undefined, email: onlyDiscord ? false : email, secret, discord: onlyDiscord ? (discord || 'news') : discord || undefined }) }).catch(() => null)
        const j = (await res?.json().catch(() => ({}))) as { error?: string; sent?: number; emailed?: number; emailNote?: string; posted?: boolean | null }
        setBusy(false)
        if (!res?.ok) return setMsg({ ok: false, text: j?.error ?? 'Could not send it.' })
        setMsg({ ok: true, text: `${onlyDiscord ? 'Posted in Discord.' : `Sent to ${j.sent ?? 0} ${j.sent === 1 ? 'person' : 'people'}${j.emailed ? `, ${j.emailed} emailed` : ''}.`}${discord && !onlyDiscord ? (j.posted ? ' Also posted in Discord.' : ' Could not post in Discord.') : ''} ${j.emailNote ?? ''}`.trim() })
        if (big) runSiteCheck('a broadcast')
        setTitle('')
        setText('')
        setHref('')
      }}
    >
      <fieldset>
        <legend className="mb-2 text-sm text-mute">Who</legend>
        <div className="flex flex-wrap gap-2" role="radiogroup">
          {AUDIENCES.map((a) => (
            <button key={a.id} type="button" role="radio" aria-checked={audience === a.id} onClick={() => setAudience(a.id)} className={cn('h-10 rounded-full border px-4 text-sm transition-colors', audience === a.id ? 'border-paper bg-paper text-ink' : 'border-line-strong text-mute hover:text-paper')}>
              {a.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-mute">{aud.hint}</p>
        {audience === 'one' && <input aria-label="Their email" className={`${input} mt-3 max-w-sm`} value={to} onChange={(e) => setTo(e.target.value)} placeholder="name@example.com" type="email" />}
      </fieldset>
      <div>
        <label htmlFor="bc-title" className="mb-1.5 block text-xs text-mute">Title</label>
        <input id="bc-title" className={input} value={title} maxLength={100} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. New campaigns this week" />
      </div>
      <div>
        <label htmlFor="bc-text" className="mb-1.5 block text-xs text-mute">Message (optional, 240 characters)</label>
        <textarea id="bc-text" className={`${input} h-24 py-3`} value={text} maxLength={240} onChange={(e) => setText(e.target.value)} />
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <label htmlFor="bc-href" className="mb-1.5 block text-xs text-mute">Link (optional)</label>
          <input id="bc-href" className={input} value={href} maxLength={200} onChange={(e) => setHref(e.target.value)} placeholder="/" />
        </div>
        <label className="flex h-11 items-center gap-2 text-sm text-mute">
          <input type="checkbox" checked={email} disabled={onlyDiscord} onChange={(e) => setEmail(e.target.checked)} className="size-4 accent-white" /> Also email (small groups only)
        </label>
      </div>
      <div>
        <label htmlFor="bc-dc" className="mb-1.5 block text-xs text-mute">Also post in the Discord server</label>
        <select id="bc-dc" className={`${input} max-w-xs`} value={onlyDiscord ? discord || 'news' : discord} onChange={(e) => setDiscord(e.target.value as '' | 'news' | 'updates')}>
          {!onlyDiscord && <option value="">Not in Discord</option>}
          <option value="news">#news (announcements)</option>
          <option value="updates">#updates (product changes)</option>
        </select>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={busy || title.trim().length < 3 || (audience === 'one' && !to)} className="inline-flex h-12 items-center gap-2 rounded-full bg-paper px-7 text-[15px] font-medium text-ink transition-colors hover:bg-paper/85 disabled:opacity-40">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Megaphone className="size-4" />} Send
        </button>
        {msg && (
          <p role={msg.ok ? 'status' : 'alert'} className={`text-sm ${msg.ok ? 'text-emerald-300' : 'text-signal'}`}>
            {msg.text}
          </p>
        )}
      </div>
    </form>
  )
}
