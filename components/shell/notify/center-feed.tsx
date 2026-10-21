'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Bell, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { BadgeArt } from '@/components/badges/badge-art'
import { BADGES } from '@/lib/badges-defs'
import { EASE_OUT } from '@/lib/layout'
import { cn } from '@/lib/utils'
import { useNavUser } from '../nav-user'
import { NOTE_KINDS, type Note } from '../notifications'
import { TransitionLink } from '../transition-link'

/**
 * The notification centre's feed: nothing but the notifications. Each one marks itself read once it has been on screen for a
 * moment, so there is no "mark as read" to think about. Used by the bell and by the Notifications page.
 */

const ago = (t: number) => {
  const s = Math.max(1, Math.floor(Date.now() / 1000 - t))
  if (s < 60) return 'now'
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  if (s < 604800) return `${Math.floor(s / 86400)}d`
  return new Date(t * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/** How long a notification has to be in view before it counts as seen. */
const SEEN_MS = 900

/** Watches the rows; the ones that stay in view are marked read on the server (in small batches) and here. */
export function useAutoRead(notes: Note[] | null, setNotes: (fn: (cur: Note[]) => Note[]) => void, active = true) {
  const { setUnread } = useNavUser()
  const timers = useRef(new Map<string, number>())
  const pending = useRef(new Set<string>())
  const flushTimer = useRef<number | null>(null)
  const io = useRef<IntersectionObserver | null>(null)
  const els = useRef(new Set<HTMLElement>())
  const unreadIds = useMemo(() => new Set((notes ?? []).filter((n) => !n.read_at).map((n) => n.id)), [notes])
  const unreadRef = useRef(unreadIds)
  unreadRef.current = unreadIds

  const flush = useCallback(() => {
    flushTimer.current = null
    const ids = [...pending.current]
    pending.current.clear()
    if (!ids.length) return
    const at = Date.now() / 1000
    setNotes((cur) => cur.map((n) => (ids.includes(n.id) && !n.read_at ? { ...n, read_at: at } : n)))
    fetch('/api/me/notifications', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ids }) })
      .then(() => fetch('/api/me/notifications?limit=1', { cache: 'no-store' }))
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { unread?: number } | null) => typeof j?.unread === 'number' && setUnread(j.unread))
      .catch(() => {})
  }, [setNotes, setUnread])

  useEffect(() => {
    if (!active || typeof IntersectionObserver === 'undefined') return
    const t = timers.current
    io.current = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const id = (e.target as HTMLElement).dataset.noteId
          if (!id || !unreadRef.current.has(id)) continue
          if (e.isIntersecting && e.intersectionRatio >= 0.6 && document.visibilityState === 'visible') {
            if (!t.has(id))
              t.set(
                id,
                window.setTimeout(() => {
                  t.delete(id)
                  pending.current.add(id)
                  if (flushTimer.current === null) flushTimer.current = window.setTimeout(flush, 350)
                }, SEEN_MS),
              )
          } else if (t.has(id)) {
            window.clearTimeout(t.get(id))
            t.delete(id)
          }
        }
      },
      { threshold: [0, 0.6, 1] },
    )
    els.current.forEach((el) => io.current?.observe(el))
    return () => {
      io.current?.disconnect()
      io.current = null
      t.forEach((x) => window.clearTimeout(x))
      t.clear()
      if (flushTimer.current !== null) {
        window.clearTimeout(flushTimer.current)
        flush()
      }
    }
  }, [active, flush])

  // a ref for each row: watched while it is on the page
  return useCallback((el: HTMLElement | null) => {
    if (!el) return
    els.current.add(el)
    io.current?.observe(el)
    return () => {
      els.current.delete(el)
      io.current?.unobserve(el)
    }
  }, [])
}

function Mark({ n }: { n: Note }) {
  const k = NOTE_KINDS[n.kind]
  const b = n.kind === 'badge' ? BADGES.find((x) => n.title.includes(x.name)) : null
  const Icon = k?.icon ?? Bell
  return (
    <span className="relative mt-0.5 grid size-9 shrink-0 place-items-center">
      {b ? (
        <BadgeArt badge={b} size={36} animated={false} />
      ) : (
        <span className="grid size-9 place-items-center rounded-pill" style={{ background: `oklch(0.32 0.06 ${k?.hue ?? 220} / 0.55)`, color: `oklch(0.86 0.09 ${k?.hue ?? 220})` }}>
          <Icon aria-hidden="true" className="size-4" />
        </span>
      )}
      <AnimatePresence>
        {!n.read_at && (
          <motion.span
            key="dot"
            aria-hidden="true"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0, opacity: 0, transition: { duration: 0.45, ease: EASE_OUT } }}
            className="absolute -top-0.5 -right-0.5 size-2.5 rounded-pill bg-paper ring-2 ring-[#0d0d10]"
          />
        )}
      </AnimatePresence>
    </span>
  )
}

/** The list. `onOpen` runs when one is clicked (the bell closes itself). */
export function CenterFeed({ notes, setNotes, onOpen, active = true, roomy = false }: { notes: Note[]; setNotes: (fn: (cur: Note[]) => Note[]) => void; onOpen?: () => void; active?: boolean; roomy?: boolean }) {
  const reduced = useReducedMotion()
  const watch = useAutoRead(notes, setNotes, active)
  const { setUnread, user } = useNavUser()
  const unread = user?.signedIn ? user.unread : 0

  const remove = (n: Note) => {
    setNotes((cur) => cur.filter((x) => x.id !== n.id))
    if (!n.read_at) setUnread(Math.max(0, unread - 1))
    fetch('/api/me/notifications', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: n.id }) }).catch(() => {})
  }

  return (
    <ul className={cn('grid', roomy ? 'gap-1 p-2' : 'gap-0.5 p-1.5')} aria-label="Notifications">
      <AnimatePresence initial={false}>
        {notes.map((n, i) => {
          const inner = (
            <>
              <Mark n={n} />
              <span className="min-w-0 flex-1 text-left">
                <span className="flex items-baseline gap-3">
                  <span className={cn('min-w-0 flex-1 text-[14px] leading-snug transition-colors duration-700', roomy ? '' : 'truncate', n.read_at ? 'text-paper/70' : 'text-paper')}>{n.title}</span>
                  <span className="shrink-0 text-[11px] text-paper/35 tabular-nums">{ago(n.created_at)}</span>
                </span>
                {n.body && <span className={cn('mt-0.5 block text-[13px] leading-snug text-paper/45', roomy ? 'line-clamp-3' : 'line-clamp-2')}>{n.body}</span>}
              </span>
            </>
          )
          const cls = cn('flex w-full items-start gap-3 rounded-[calc(18px*var(--round,1))] text-left transition-colors hover:bg-white/[0.045] focus-visible:bg-white/[0.06]', roomy ? 'px-4 py-3.5' : 'px-3 py-3')
          return (
            <motion.li
              key={n.id}
              ref={watch}
              data-note-id={n.id}
              layout={!reduced}
              initial={reduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0, transition: { delay: reduced ? 0 : Math.min(i * 0.03, 0.24), duration: 0.32, ease: EASE_OUT } }}
              exit={{ opacity: 0, x: 48, height: 0, transition: { duration: 0.22 } }}
              drag={reduced ? false : 'x'}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={{ left: 0, right: 0.5 }}
              dragSnapToOrigin
              onDragEnd={(_, info) => info.offset.x > 90 && remove(n)}
              className="group/n relative"
            >
              {n.href ? (
                <TransitionLink href={n.href} className={cls} onClick={() => onOpen?.()} draggable={false}>
                  {inner}
                </TransitionLink>
              ) : (
                <div className={cls}>{inner}</div>
              )}
              <button
                type="button"
                aria-label="Dismiss"
                title="Dismiss"
                onClick={() => remove(n)}
                className="absolute top-2 right-2 grid size-7 place-items-center rounded-pill bg-[#141418] text-paper/50 opacity-0 transition-opacity group-focus-within/n:opacity-100 group-hover/n:opacity-100 hover:text-paper focus-visible:opacity-100 [@media(hover:none)]:hidden"
              >
                <X aria-hidden="true" className="size-3.5" />
              </button>
            </motion.li>
          )
        })}
      </AnimatePresence>
    </ul>
  )
}

/** Nothing here: a quiet bell, no words (screen readers still hear it). */
export function CenterEmpty({ tall = false }: { tall?: boolean }) {
  return (
    <div className={cn('grid place-items-center', tall ? 'py-24' : 'py-14')}>
      <span className="grid size-12 place-items-center rounded-pill border border-white/10 text-paper/30">
        <Bell aria-hidden="true" className="size-5" />
      </span>
      <span className="sr-only">No notifications</span>
    </div>
  )
}

export function CenterSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <ul className="grid gap-0.5 p-1.5" aria-label="Loading" aria-busy="true">
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="flex items-start gap-3 px-3 py-3">
          <span className="sk size-9 shrink-0 rounded-pill bg-white/[0.06]" />
          <span className="grid flex-1 gap-2 pt-1">
            <span className="sk h-3 w-2/3 rounded-pill bg-white/[0.07]" />
            <span className="sk h-2.5 w-1/2 rounded-pill bg-white/[0.05]" />
          </span>
        </li>
      ))}
    </ul>
  )
}
