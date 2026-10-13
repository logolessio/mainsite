'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { EASE_OUT } from '@/lib/layout'
import { useNavUser } from './nav-user'
import { NoteTile, type Note } from './notifications'
import { TransitionLink } from './transition-link'

const POLL_MS = 45_000

/** Something happened? A glass toast slides in from the top right, with no refresh needed. */
export function LiveToasts() {
  const on = true
  const { user, setUnread } = useNavUser()
  const signedIn = Boolean(user?.signedIn)
  const pathname = usePathname()
  const [toasts, setToasts] = useState<Note[]>([])
  const since = useRef<number | null>(null)
  const seen = useRef(new Set<string>())

  const check = useCallback(async () => {
    const q = since.current ? `?since=${since.current}` : '?limit=1'
    const res = await fetch(`/api/me/notifications${q}`, { cache: 'no-store' }).catch(() => null)
    if (!res?.ok) return
    const j = (await res.json().catch(() => null)) as { items: Note[]; unread?: number } | null
    if (!j) return
    const newest = j.items.reduce((m, n) => Math.max(m, n.created_at), since.current ?? 0)
    // the first look only sets the starting point: nothing old pops up
    if (since.current !== null) {
      const fresh = j.items.filter((n) => !n.read_at && !seen.current.has(n.id))
      fresh.forEach((n) => seen.current.add(n.id))
      if (fresh.length) {
        setToasts((cur) => [...fresh.slice(0, 3), ...cur].slice(0, 3))
        if (typeof j.unread === 'number') setUnread(j.unread)
      }
    }
    since.current = newest || since.current || Math.floor(Date.now() / 1000)
  }, [setUnread])

  useEffect(() => {
    if (!on || !signedIn) return
    void check()
    const id = window.setInterval(() => document.visibilityState === 'visible' && void check(), POLL_MS)
    const onVis = () => document.visibilityState === 'visible' && void check()
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [on, signedIn, check])

  useEffect(() => {
    if (!toasts.length) return
    const t = window.setTimeout(() => setToasts((cur) => cur.slice(0, -1)), 7000)
    return () => window.clearTimeout(t)
  }, [toasts])

  const dismiss = (id: string, read = false) => {
    setToasts((cur) => cur.filter((n) => n.id !== id))
    if (read) fetch('/api/me/notifications', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id }) }).catch(() => {})
  }
  if (!on || !signedIn || pathname.startsWith('/admin')) return null

  return (
    <div className="pointer-events-none fixed top-[88px] right-4 z-[120] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3 max-md:top-20">
      <AnimatePresence initial={false}>
        {toasts.map((n) => {
          const body = (
            <>
              <NoteTile n={n} />
              <span className="min-w-0 flex-1 text-left">
                <span className="block truncate text-sm font-medium">{n.title}</span>
                {n.body && <span className="mt-0.5 line-clamp-2 block text-xs text-mute">{n.body}</span>}
              </span>
            </>
          )
          const cls = 'flex flex-1 items-center gap-3 p-3'
          return (
            <motion.div key={n.id} layout initial={{ opacity: 0, x: 60, scale: 0.94 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 60, scale: 0.96, transition: { duration: 0.2 } }} transition={{ duration: 0.45, ease: EASE_OUT }} className="glass-liquid pointer-events-auto flex items-center rounded-[1.5rem] pr-2 backdrop-blur-xl">
              {n.href ? (
                <TransitionLink href={n.href} className={cls} onClick={() => dismiss(n.id, true)}>
                  {body}
                </TransitionLink>
              ) : (
                <button type="button" className={cls} onClick={() => dismiss(n.id, true)}>
                  {body}
                </button>
              )}
              <button type="button" aria-label="Dismiss" onClick={() => dismiss(n.id)} className="grid size-8 shrink-0 place-items-center rounded-full text-mute hover:bg-white/10 hover:text-paper">
                <X className="size-4" />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
