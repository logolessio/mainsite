'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Award, BadgeDollarSign, Banknote, Bell, BellOff, Check, CheckCheck, Clapperboard, Heart, Megaphone, ShieldCheck, Trash2, X, type LucideIcon } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BadgeArt } from '@/components/badges/badge-art'
import { BADGES } from '@/lib/badges-defs'
import { EASE_OUT } from '@/lib/layout'
import { cn } from '@/lib/utils'
import { useNavUser } from './nav-user'
import { TransitionLink } from './transition-link'
import { LiquidGlass } from '@/components/ui/liquid-glass'
import { SwipeAway } from '@/components/ui/swipe-away'
import { useFeature } from './features-provider'
import { CenterBell } from './notify/center-bell'

export type Note = { id: string; kind: string; title: string; body: string; href: string | null; read_at: number | null; created_at: number }

/** Each kind of news has its own colour and symbol, so you can tell what it is before you read it. */
const KIND: Record<string, { icon: LucideIcon; hue: number; label: string }> = {
  badge: { icon: Award, hue: 268, label: 'Badges' },
  submission: { icon: Clapperboard, hue: 200, label: 'Submissions' },
  payout: { icon: Banknote, hue: 146, label: 'Payouts' },
  earning: { icon: BadgeDollarSign, hue: 46, label: 'Earnings' },
  campaign: { icon: Megaphone, hue: 24, label: 'Campaigns' },
  favorite: { icon: Heart, hue: 346, label: 'Saved' },
  account: { icon: ShieldCheck, hue: 216, label: 'Account' },
}
const kindOf = (k: string) => KIND[k] ?? { icon: Bell, hue: 220, label: 'Other' }

const short = (t: number) => {
  const s = Math.max(1, Math.floor(Date.now() / 1000 - t))
  if (s < 60) return 'now'
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  if (s < 604800) return `${Math.floor(s / 86400)}d`
  return new Date(t * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function dayLabel(t: number) {
  const d = new Date(t * 1000)
  const now = new Date()
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const diff = Math.round((start(now) - start(d)) / 86400000)
  if (diff <= 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 7) return 'This week'
  return 'Earlier'
}

/** A badge notification shows the badge itself. Everything else is just text, with a small dot while it is unread. */
export function NoteTile({ n }: { n: Note }) {
  const b = n.kind === 'badge' ? BADGES.find((x) => n.title.includes(x.name)) : null
  if (b) return <span className="grid size-10 shrink-0 place-items-center"><BadgeArt badge={b} size={40} animated={false} /></span>
  return <span aria-hidden="true" className={cn('mt-[7px] size-2 shrink-0 rounded-pill', n.read_at ? 'bg-transparent' : 'bg-paper')} />
}

/** The feed itself, used by the bell and by the full page. */
export function NotificationFeed({ notes, setNotes, onOpen, compact = false }: { notes: Note[]; setNotes: (fn: (cur: Note[]) => Note[]) => void; onOpen?: () => void; compact?: boolean }) {
  const { setUnread, user } = useNavUser()
  const unread = user?.signedIn ? user.unread : 0

  const read = (n: Note) => {
    if (n.read_at) return
    setNotes((cur) => cur.map((x) => (x.id === n.id ? { ...x, read_at: Date.now() / 1000 } : x)))
    setUnread(Math.max(0, unread - 1))
    fetch('/api/me/notifications', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: n.id }) }).catch(() => {})
  }
  const remove = (n: Note) => {
    setNotes((cur) => cur.filter((x) => x.id !== n.id))
    if (!n.read_at) setUnread(Math.max(0, unread - 1))
    fetch('/api/me/notifications', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: n.id }) }).catch(() => {})
  }

  const groups = useMemo(() => {
    const out: { label: string; items: Note[] }[] = []
    for (const n of notes) {
      const l = dayLabel(n.created_at)
      const g = out.find((x) => x.label === l)
      if (g) g.items.push(n)
      else out.push({ label: l, items: [n] })
    }
    return out
  }, [notes])

  let row = 0
  return (
    <div>
      {groups.map((g) => (
        <section key={g.label}>
          <h3 className="sticky top-0 z-10 bg-gradient-to-b from-[#0d0d10] from-70% to-transparent px-5 pt-4 pb-2 text-[10px] text-mute">{g.label}</h3>
          <ul className="px-2">
            <AnimatePresence initial={false}>
              {g.items.map((n) => {
                const i = row++
                const inner = (
                  <>
                    <NoteTile n={n} />
                    <span className="min-w-0 flex-1 text-left">
                      <span className="flex items-baseline justify-between gap-3">
                        <span className={cn('truncate text-[14px] leading-snug', n.read_at ? 'text-paper/75' : 'font-medium text-paper')}>{n.title}</span>
                        <span className="shrink-0 font-mono text-[10px] text-mute tabular-nums">{short(n.created_at)}</span>
                      </span>
                      {n.body && <span className={cn('mt-0.5 block text-xs leading-snug text-mute', compact ? 'line-clamp-2' : 'line-clamp-3')}>{n.body}</span>}
                    </span>
                  </>
                )
                const base = 'group/n relative flex w-full items-start gap-3 rounded-2xl px-3 py-3 transition-colors hover:bg-white/[0.05]'
                return (
                  <motion.li
                    key={n.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0, transition: { delay: Math.min(i * 0.035, 0.3), duration: 0.35, ease: EASE_OUT } }}
                    exit={{ opacity: 0, x: 40, height: 0, transition: { duration: 0.22 } }}
                    className="relative"
                  >
                    <SwipeAway onAway={() => remove(n)}>
                      {n.href ? (
                        <TransitionLink href={n.href} className={base} onClick={() => { read(n); onOpen?.() }} draggable={false}>
                          {inner}
                        </TransitionLink>
                      ) : (
                        <button type="button" className={base} onClick={() => read(n)}>
                          {inner}
                        </button>
                      )}
                    </SwipeAway>
                    <span className="absolute top-2 right-2 hidden items-center gap-0.5 rounded-pill bg-[#0d0d10]/90 p-0.5 backdrop-blur group-hover/n:flex group-focus-within/n:flex" style={{ top: 6 }}>
                      {!n.read_at && (
                        <button type="button" aria-label="Mark as read" onClick={() => read(n)} className="grid size-6 place-items-center rounded-pill text-mute hover:bg-white/10 hover:text-paper">
                          <Check className="size-3.5" />
                        </button>
                      )}
                      <button type="button" aria-label="Dismiss" onClick={() => remove(n)} className="grid size-6 place-items-center rounded-pill text-mute hover:bg-white/10 hover:text-signal">
                        <X className="size-3.5" />
                      </button>
                    </span>
                  </motion.li>
                )
              })}
            </AnimatePresence>
          </ul>
        </section>
      ))}
    </div>
  )
}

export function EmptyFeed({ unreadOnly }: { unreadOnly?: boolean }) {
  return (
    <div className="grid place-items-center px-6 py-14 text-center">
      <p className="font-display text-xl">{unreadOnly ? 'All caught up' : 'Nothing yet'}</p>
      <p className="mt-1 max-w-[16rem] text-sm text-mute">{unreadOnly ? 'You have read everything. Nice.' : 'Payments, submission decisions, new badges and campaign news will show up here.'}</p>
    </div>
  )
}

export function useNotes(enabled = true) {
  const [notes, setNotes] = useState<Note[] | null>(null)
  const load = useCallback(() => {
    fetch('/api/me/notifications', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((j: { items: Note[] }) => setNotes(j.items))
      .catch(() => setNotes([]))
  }, [])
  useEffect(() => {
    if (enabled) load()
  }, [enabled, load])
  const update = useCallback((fn: (cur: Note[]) => Note[]) => setNotes((cur) => (cur ? fn(cur) : cur)), [])
  return { notes, update, load }
}

export function useNoteActions(update: (fn: (cur: Note[]) => Note[]) => void) {
  const { setUnread } = useNavUser()
  const markAll = async () => {
    update((cur) => cur.map((n) => ({ ...n, read_at: n.read_at ?? Date.now() / 1000 })))
    setUnread(0)
    await fetch('/api/me/notifications', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }).catch(() => {})
  }
  const clear = async () => {
    update(() => [])
    setUnread(0)
    await fetch('/api/me/notifications', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: '{}' }).catch(() => {})
  }
  return { markAll, clear }
}

/** The bell. With the notification centre switched on it is the cleaner, notifications-only one (see notify/center-bell.tsx). */
export function NotificationBell(props: { onNavigate?: () => void; align?: 'left' | 'right' }) {
  return useFeature('notification-center') ? <CenterBell {...props} /> : <ClassicBell {...props} />
}

/** The bell. It rings when something new arrives, and opens a glass panel with the feed. */
function ClassicBell({ onNavigate, align = 'right' }: { onNavigate?: () => void; align?: 'left' | 'right' }) {
  const { user } = useNavUser()
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'all' | 'unread'>('all')
  const [confirm, setConfirm] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)
  const unread = user?.signedIn ? user.unread : 0
  const { notes, update, load } = useNotes(open)
  const { markAll, clear } = useNoteActions(update)

  useEffect(() => {
    if (!open) return
    load()
    setConfirm(false)
    const onDown = (e: PointerEvent) => !wrap.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, load])

  const shown = notes ? (tab === 'unread' ? notes.filter((n) => !n.read_at) : notes) : null

  return (
    <div ref={wrap} className="relative">
      <LiquidGlass as="button" type="button" aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'} aria-expanded={open} onClick={() => setOpen((v) => !v)} className="grid size-11 place-items-center transition-transform active:scale-95" look={{ zRadius: 12 }}>
        <motion.span key={unread} animate={unread ? { rotate: [0, -16, 14, -10, 6, 0] } : {}} transition={{ duration: 0.7, ease: 'easeInOut' }} className="grid origin-top place-items-center">
          <Bell className="size-[18px]" />
        </motion.span>
      </LiquidGlass>
      {/* The badge sits outside the glass button: the glass clips anything that pokes past its edge. */}
      {unread > 0 && (
        <motion.span key={unread} initial={{ scale: 0.4 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 18 }} aria-hidden="true" className="pointer-events-none absolute -top-1 -right-1 z-10 grid min-w-5 place-items-center rounded-pill bg-paper px-1 text-[10px] leading-5 font-semibold text-ink ring-2 ring-ink">
          {unread > 9 ? '9+' : unread}
        </motion.span>
      )}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.26, ease: EASE_OUT }}
            className={cn('absolute top-full z-50 mt-3 flex max-h-[min(34rem,78dvh)] w-[min(25rem,calc(100vw-1.5rem))] origin-top-right flex-col overflow-hidden rounded-card border border-white/15 bg-[#0d0d10]/[0.98] shadow-[0_40px_90px_-20px_rgb(0_0_0/0.95)] backdrop-blur-xl', align === 'right' ? 'right-0' : 'left-0 origin-top-left')}
          >
            <div className="relative px-5 pt-5 pb-3">
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <p className="font-display text-xl">Notifications</p>
                  {unread > 0 && <span className="rounded-pill bg-paper px-2 py-0.5 font-mono text-[10px] font-semibold text-ink">{unread} new</span>}
                </div>
                <div className="flex items-center gap-1">
                  {unread > 0 && (
                    <button type="button" onClick={markAll} aria-label="Mark all as read" title="Mark all as read" className="grid size-8 place-items-center rounded-pill text-mute transition-colors hover:bg-white/10 hover:text-paper">
                      <CheckCheck className="size-4" />
                    </button>
                  )}
                  {notes && notes.length > 0 && (
                    <button type="button" onClick={() => (confirm ? (clear(), setConfirm(false)) : setConfirm(true))} aria-label={confirm ? 'Confirm clear all' : 'Clear all'} title="Clear all" className={cn('grid h-8 place-items-center rounded-pill px-2 text-mute transition-colors hover:bg-white/10', confirm ? 'bg-signal/15 text-signal' : 'hover:text-paper')}>
                      {confirm ? <span className="text-[11px] font-medium">Clear all?</span> : <Trash2 className="size-4" />}
                    </button>
                  )}
                </div>
              </div>
              <div className="relative mt-3 inline-flex rounded-pill bg-white/[0.06] p-1">
                {(['all', 'unread'] as const).map((t) => (
                  <button key={t} type="button" onClick={() => setTab(t)} className={cn('relative h-7 rounded-pill px-4 text-xs capitalize transition-colors', tab === t ? 'text-ink' : 'text-mute hover:text-paper')}>
                    {tab === t && <motion.span layoutId="notif-tab" transition={{ type: 'spring', stiffness: 420, damping: 34 }} className="absolute inset-0 rounded-pill bg-paper" />}
                    <span className="relative">{t}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-2">
              {shown === null && (
                <ul className="grid gap-2 px-4 py-3" aria-label="Loading">
                  {[0, 1, 2].map((i) => (
                    <li key={i} className="flex animate-pulse items-center gap-3 rounded-2xl p-3">
                      <span className="size-11 rounded-[calc(14px*var(--round,1))] bg-white/[0.06]" />
                      <span className="grid flex-1 gap-2"><span className="h-3 w-2/3 rounded-pill bg-white/[0.07]" /><span className="h-2.5 w-1/2 rounded-pill bg-white/[0.05]" /></span>
                    </li>
                  ))}
                </ul>
              )}
              {shown && shown.length === 0 && <EmptyFeed unreadOnly={tab === 'unread'} />}
              {shown && shown.length > 0 && <NotificationFeed notes={shown} setNotes={update} compact onOpen={() => { setOpen(false); onNavigate?.() }} />}
            </div>
            <TransitionLink href="/dashboard/notifications" onClick={() => { setOpen(false); onNavigate?.() }} className="border-t border-line px-5 py-3 text-center text-xs text-mute transition-colors hover:bg-white/[0.04] hover:text-paper">
              See everything
            </TransitionLink>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export { KIND as NOTE_KINDS }
