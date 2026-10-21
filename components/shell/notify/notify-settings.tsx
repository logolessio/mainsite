'use client'

import { motion } from 'framer-motion'
import { Bell, Check, Loader2, Mail, MoonStar } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Card } from '@/components/app/ui'
import { Icon } from '@/components/icons'
import { GlassTabs } from '@/components/ui/glass-tabs'
import { type Channel, CHANNELS, type DigestEvery, fromHhmm, hhmm, KIND_LABELS, NOTE_KIND_IDS, type NoteKind, type NotifyPrefs } from '@/lib/notify-prefs'
import { cn } from '@/lib/utils'
import { TransitionLink } from '../transition-link'

type Loaded = { prefs: NotifyPrefs; quietNow: boolean; channels: { email: { ready: boolean; address: string }; discord: { linked: boolean; dm: boolean; ready: boolean } } }
export type SaveState = 'idle' | 'saving' | 'saved' | 'error'

const browserTz = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

/** The settings, loaded once and saved a moment after each change (with this browser's time zone, for quiet hours and digests). */
export function useNotifyPrefs(enabled = true) {
  const [data, setData] = useState<Loaded | null>(null)
  const [failed, setFailed] = useState(false)
  const [save, setSave] = useState<SaveState>('idle')
  const latest = useRef<NotifyPrefs | null>(null)
  const timer = useRef<number | null>(null)

  useEffect(() => {
    if (!enabled) return
    fetch('/api/me/notifications/settings', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j: Loaded) => setData({ ...j, prefs: { ...j.prefs, tz: browserTz() } }))
      .catch(() => setFailed(true))
  }, [enabled])

  const push = useCallback(async () => {
    timer.current = null
    if (!latest.current) return
    setSave('saving')
    const res = await fetch('/api/me/notifications/settings', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(latest.current) }).catch(() => null)
    if (!res?.ok) return setSave('error')
    const j = (await res.json().catch(() => null)) as { quietNow?: boolean } | null
    setData((d) => (d ? { ...d, quietNow: Boolean(j?.quietNow) } : d))
    setSave('saved')
  }, [])

  const change = useCallback(
    (fn: (p: NotifyPrefs) => NotifyPrefs) => {
      setData((d) => {
        if (!d) return d
        const prefs = { ...fn(d.prefs), tz: browserTz() }
        latest.current = prefs
        return { ...d, prefs }
      })
      if (timer.current !== null) window.clearTimeout(timer.current)
      timer.current = window.setTimeout(push, 450)
    },
    [push],
  )
  return { data, failed, save, change }
}

export function Switch({ checked, onChange, label, disabled, small }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean; small?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn('relative shrink-0 rounded-pill border transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-30', small ? 'h-6 w-10' : 'h-7 w-12', checked ? 'border-paper bg-paper' : 'border-line-strong bg-ink')}
    >
      <motion.span
        aria-hidden="true"
        initial={false}
        animate={{ x: checked ? (small ? 16 : 20) : 0 }}
        transition={{ type: 'spring', stiffness: 600, damping: 34 }}
        className={cn('absolute top-[3px] left-[3px] rounded-pill', small ? 'size-4' : 'size-5', checked ? 'bg-ink' : 'bg-mute')}
      />
    </button>
  )
}

export function SaveNote({ state }: { state: SaveState }) {
  return (
    <span role="status" aria-live="polite" className="inline-flex h-6 items-center gap-1.5 text-xs text-paper/45">
      {state === 'saving' && <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />}
      {state === 'saved' && <Check aria-hidden="true" className="size-3.5 text-emerald-300" />}
      {state === 'saving' ? 'Saving' : state === 'saved' ? 'Saved' : state === 'error' ? <span className="text-signal">Not saved. Try again.</span> : ''}
    </span>
  )
}

const CH_ICON: Record<Channel, React.ReactNode> = {
  site: <Bell aria-hidden="true" className="size-4" />,
  email: <Mail aria-hidden="true" className="size-4" />,
  discord: <Icon name="Discord" aria-hidden="true" className="size-4" />,
}
const CH_SHORT: Record<Channel, string> = { site: 'Site', email: 'Email', discord: 'Discord' }

/** Kind × channel switches. `only` shows a single channel (the Discord page uses it for the Discord column). */
export function KindMatrix({ data, change, only }: { data: Loaded; change: (fn: (p: NotifyPrefs) => NotifyPrefs) => void; only?: Channel }) {
  const cols = only ? [only] : [...CHANNELS]
  const blocked = (c: Channel) => (c === 'discord' && (!data.channels.discord.linked || !data.channels.discord.dm)) || (c === 'email' && !data.channels.email.ready)
  const set = (k: NoteKind, c: Channel, v: boolean) => change((p) => ({ ...p, m: { ...p.m, [k]: { ...p.m[k], [c]: v } } }))
  const column = (c: Channel) => {
    const allOn = NOTE_KIND_IDS.every((k) => data.prefs.m[k][c])
    change((p) => ({ ...p, m: Object.fromEntries(NOTE_KIND_IDS.map((k) => [k, { ...p.m[k], [c]: !allOn }])) as NotifyPrefs['m'] }))
  }
  return (
    <div role="table" aria-label="Notifications by kind and channel">
      <div role="row" className="grid items-end gap-x-3 border-b border-line pb-3 sm:gap-x-5" style={{ gridTemplateColumns: `minmax(0,1fr) repeat(${cols.length}, 2.75rem)` }}>
        <span role="columnheader">
          <span className="sr-only">Kind</span>
        </span>
        {cols.map((c) => (
          <button
            key={c}
            role="columnheader"
            type="button"
            disabled={blocked(c)}
            onClick={() => column(c)}
            title={`${NOTE_KIND_IDS.every((k) => data.prefs.m[k][c]) ? 'Turn off' : 'Turn on'} ${CH_SHORT[c].toLowerCase()} for everything`}
            className="grid justify-items-center gap-1 text-[11px] text-paper/50 transition-colors hover:text-paper disabled:opacity-40"
          >
            {CH_ICON[c]}
            {CH_SHORT[c]}
          </button>
        ))}
      </div>
      {NOTE_KIND_IDS.map((k) => (
        <div role="row" key={k} className="grid items-center gap-x-3 border-b border-line py-3.5 last:border-0 sm:gap-x-5" style={{ gridTemplateColumns: `minmax(0,1fr) repeat(${cols.length}, 2.75rem)` }}>
          <span role="rowheader" className="min-w-0">
            <span className="block text-[15px]">{KIND_LABELS[k].label}</span>
            <span className="block text-[13px] leading-snug text-paper/45">{KIND_LABELS[k].hint}</span>
          </span>
          {cols.map((c) => (
            <span role="cell" key={c} className="grid justify-items-center">
              <Switch small checked={data.prefs.m[k][c] && !blocked(c)} disabled={blocked(c)} onChange={(v) => set(k, c, v)} label={`${KIND_LABELS[k].label}: ${CHANNEL_NAME[c]}`} />
            </span>
          ))}
        </div>
      ))}
    </div>
  )
}
const CHANNEL_NAME: Record<Channel, string> = { site: 'on the site', email: 'by email', discord: 'as Discord messages' }

const DIGEST_TABS = [
  { id: 'off', label: 'Right away' },
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
]

function TimeInput({ value, onChange, label }: { value: number; onChange: (m: number) => void; label: string }) {
  return (
    <input
      type="time"
      step={900}
      aria-label={label}
      value={hhmm(value)}
      onChange={(e) => {
        const m = fromHhmm(e.target.value)
        if (m !== null) onChange(m)
      }}
      className="h-11 w-[7.5rem] rounded-pill border border-line-strong bg-ink/75 px-4 text-sm tabular-nums [color-scheme:dark] focus:border-paper/60 focus:outline-none"
    />
  )
}

/** The whole settings page. */
export function NotifySettings() {
  const { data, failed, save, change } = useNotifyPrefs()
  if (failed) return <p className="text-mute">Could not load your settings. Refresh to try again.</p>
  if (!data)
    return (
      <div role="status" aria-busy="true" aria-label="Loading" className="max-w-3xl space-y-6">
        {[520, 170, 200].map((h, i) => (
          <div key={i} className="sk rounded-3xl border border-line bg-white/[0.03]" style={{ height: h }} />
        ))}
      </div>
    )
  const { prefs } = data
  const discord = data.channels.discord
  return (
    <div className="grid max-w-3xl gap-6">
      <div className="-mb-2 flex justify-end">
        <SaveNote state={save} />
      </div>
      <Card title="What you hear about" sub="Every kind, on each channel. Tap a column heading to switch the whole column.">
        <KindMatrix data={data} change={change} />
        {(!discord.linked || !discord.dm) && (
          <p className="mt-4 text-[13px] text-paper/50">
            {!discord.linked ? 'Link Discord to get these as messages too. ' : 'Discord messages are switched off. '}
            <TransitionLink href="/dashboard/discord" className="text-paper underline underline-offset-4">
              {!discord.linked ? 'Link Discord' : 'Turn them on'}
            </TransitionLink>
          </p>
        )}
        {!data.channels.email.ready && <p className="mt-2 text-[13px] text-paper/50">Email is not switched on for the site yet.</p>}
      </Card>

      <Card
        title="Quiet hours"
        sub="Emails and Discord messages wait until quiet hours end. The bell still fills up, without pop-ups."
        action={<Switch checked={prefs.quiet.on} onChange={(on) => change((p) => ({ ...p, quiet: { ...p.quiet, on } }))} label="Quiet hours" />}
      >
        <div className={cn('flex flex-wrap items-center gap-3 transition-opacity', !prefs.quiet.on && 'pointer-events-none opacity-40')} aria-disabled={!prefs.quiet.on}>
          <MoonStar aria-hidden="true" className="size-4 text-paper/50" />
          <TimeInput label="Quiet from" value={prefs.quiet.from} onChange={(from) => change((p) => ({ ...p, quiet: { ...p.quiet, from } }))} />
          <span className="text-sm text-paper/45">until</span>
          <TimeInput label="Quiet until" value={prefs.quiet.to} onChange={(to) => change((p) => ({ ...p, quiet: { ...p.quiet, to } }))} />
        </div>
        <p className="mt-4 text-[13px] text-paper/45">
          Your time zone: {prefs.tz.replace(/_/g, ' ')}.{prefs.quiet.on && data.quietNow ? ' Quiet right now.' : ''}
        </p>
      </Card>

      <Card title="Digests" sub="One message with everything, instead of one for each thing. Weekly digests arrive on Mondays.">
        <div className="grid gap-5">
          {(['email', 'discord'] as const).map((c) => (
            <div key={c} className="flex flex-wrap items-center justify-between gap-3">
              <span className="flex items-center gap-2.5 text-[15px]">
                <span className="text-paper/50">{CH_ICON[c]}</span>
                {c === 'email' ? 'Email' : 'Discord'}
              </span>
              <GlassTabs compact label={`${c === 'email' ? 'Email' : 'Discord'} digest`} className="mx-0" tabs={DIGEST_TABS} value={prefs.digest[c]} onChange={(v) => change((p) => ({ ...p, digest: { ...p.digest, [c]: v as DigestEvery } }))} />
            </div>
          ))}
          <div className={cn('flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5 transition-opacity', prefs.digest.email === 'off' && prefs.digest.discord === 'off' && 'opacity-40')}>
            <span className="text-[15px]">Send digests at</span>
            <TimeInput label="Send digests at" value={prefs.digest.at} onChange={(at) => change((p) => ({ ...p, digest: { ...p.digest, at } }))} />
          </div>
        </div>
      </Card>
    </div>
  )
}
