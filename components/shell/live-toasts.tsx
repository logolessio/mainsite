'use client'

import { AnimatePresence, motion } from 'framer-motion'
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
    const j = (await res.json().catch(() => null)) as { items: Note[]; unread?: number; quiet?: boolean } | null
    if (!j) return
    const newest = j.items.reduce((m, n) => Math.max(m, n.created_at), since.current ?? 0)
    // the first look only sets the starting point: nothing old pops up
    if (since.current !== null) {
      const fresh = j.items.filter((n) => !n.read_at && !seen.current.has(n.id))
      fresh.forEach((n) => seen.current.add(n.id))
      if (fresh.length) {
        // quiet hours (notification centre): the bell still counts them, nothing pops up
        if (!j.quiet) setToasts((cur) => [...fresh.slice(0, 3), ...cur].slice(0, 3))
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

  // an admin's preview: drop a made-up notification, whatever page this is
  useEffect(() => {
    const onPreview = () => {
      const now = Math.floor(Date.now() / 1000)
      const n: Note = { id: `preview-${now}-${Math.random().toString(36).slice(2, 6)}`, kind: 'submission', title: 'Your submission was approved', body: 'This is a preview of how a notification arrives.', href: null, read_at: null, created_at: now }
      setToasts((cur) => [n, ...cur].slice(0, 3))
    }
    window.addEventListener('logoless:preview-toast', onPreview)
    return () => window.removeEventListener('logoless:preview-toast', onPreview)
  }, [])

  useEffect(() => {
    if (!toasts.length) return
    const t = window.setTimeout(() => setToasts((cur) => cur.slice(0, -1)), 7000)
    return () => window.clearTimeout(t)
  }, [toasts])

  const dismiss = (id: string, read = false) => {
    setToasts((cur) => cur.filter((n) => n.id !== id))
    if (read && !id.startsWith('preview-')) fetch('/api/me/notifications', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id }) }).catch(() => {})
  }
  const previewing = toasts.some((n) => n.id.startsWith('preview-'))
  if (!previewing && (!on || !signedIn || pathname.startsWith('/admin'))) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[120] flex flex-col items-center gap-2 px-3">
      <AnimatePresence initial={false}>
        {toasts.map((n) => {
          const body = (
            <>
              <NoteTile n={n} />
              <span className="min-w-0 flex-1 text-left">
                <span className="block truncate text-[15px] font-medium">{n.title}</span>
                {n.body && <span className="mt-0.5 line-clamp-2 block text-[13px] text-white/60">{n.body}</span>}
              </span>
              <span className="shrink-0 self-start pt-0.5 text-[12px] text-white/45">now</span>
            </>
          )
          const cls = 'flex flex-1 items-start gap-3 px-5 py-4'
          return (
            <motion.div
              key={n.id}
              layout
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0.6, bottom: 0 }}
              onDragEnd={(_, i) => i.offset.y < -24 && dismiss(n.id)}
              initial={{ opacity: 0, y: -90, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -90, transition: { duration: 0.25 } }}
              transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              className="island pointer-events-auto w-[min(26rem,100%)] rounded-card bg-[#0b0b0d] text-white shadow-[0_18px_50px_-12px_rgb(0_0_0/0.55)]"
            >
              {n.href ? (
                <TransitionLink href={n.href} className={cls} onClick={() => dismiss(n.id, true)}>
                  {body}
                </TransitionLink>
              ) : (
                <button type="button" className={cls} onClick={() => dismiss(n.id, true)}>
                  {body}
                </button>
              )}
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
