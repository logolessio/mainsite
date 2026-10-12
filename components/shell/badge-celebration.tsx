'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { BadgeArt, RARITY_STYLE } from '@/components/badges/badge-art'
import { Confetti } from '@/components/invite/bits'
import { BADGES, type BadgeDef } from '@/lib/badges-defs'
import { EASE_OUT } from '@/lib/layout'
import { cn } from '@/lib/utils'
import { useFeature } from './features-provider'
import { useNavUser } from './nav-user'
import { type Note } from './notifications'
import { useTransitions } from './transition-provider'

/** Unlock a badge and the whole screen celebrates it. Shown once per badge, inside the dashboards. */
export function BadgeCelebration() {
  const on = useFeature('badge-celebration')
  const { user, setUnread } = useNavUser()
  const pathname = usePathname()
  const { navigate } = useTransitions()
  const [queue, setQueue] = useState<{ note: Note; badge: BadgeDef }[]>([])
  const inApp = pathname.startsWith('/dashboard') || pathname.startsWith('/brand')

  useEffect(() => {
    if (!on || !user?.signedIn || !inApp) return
    let live = true
    fetch('/api/me/notifications?limit=30', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((j: { items: Note[] }) => {
        if (!live) return
        const found = j.items
          .filter((n) => n.kind === 'badge' && !n.read_at)
          .map((n) => ({ note: n, badge: BADGES.find((b) => n.title.includes(b.name)) }))
          .filter((x): x is { note: Note; badge: BadgeDef } => Boolean(x.badge))
        if (found.length) setQueue(found)
      })
      .catch(() => {})
    return () => {
      live = false
    }
  }, [on, user?.signedIn, inApp])

  const cur = queue[0]
  const done = (view: boolean) => {
    if (!cur) return
    fetch('/api/me/notifications', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: cur.note.id }) }).catch(() => {})
    setUnread(Math.max(0, (user?.signedIn ? user.unread : 1) - 1))
    setQueue((q) => q.slice(1))
    if (view) navigate('/dashboard/achievements')
  }

  return (
    <AnimatePresence>
      {cur && on && (
        <motion.div key={cur.note.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[140] grid place-items-center overflow-hidden bg-black/85 px-4 backdrop-blur-md" role="dialog" aria-modal="true" aria-label="Badge unlocked">
          <Confetti count={70} />
          <motion.div initial={{ scale: 0.5, opacity: 0, rotate: -12 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 160, damping: 14 }} className="relative z-10 flex max-w-sm flex-col items-center text-center">
            <span aria-hidden="true" className="absolute top-8 size-72 rounded-full blur-3xl" style={{ background: RARITY_STYLE[cur.badge.rarity].glow }} />
            <p className="relative text-xs text-mute">Badge unlocked</p>
            <div className="relative mt-5"><BadgeArt badge={cur.badge} size={240} animated /></div>
            <h2 className="relative mt-5 font-display text-4xl">{cur.badge.name}</h2>
            <p className={cn('relative mt-1 text-[11px]', RARITY_STYLE[cur.badge.rarity].text)}>{RARITY_STYLE[cur.badge.rarity].label} · {cur.badge.points} points</p>
            <p className="relative mt-3 text-sm text-mute">{cur.badge.how}</p>
            <div className="relative mt-7 flex flex-wrap justify-center gap-3">
              <button type="button" onClick={() => done(true)} className="inline-flex h-12 items-center rounded-full bg-paper px-7 text-[15px] font-medium text-ink transition-all hover:bg-paper/85 active:scale-95">See my achievements</button>
              <button type="button" onClick={() => done(false)} className="h-12 rounded-full px-5 text-sm text-mute hover:text-paper">{queue.length > 1 ? `Next (${queue.length - 1} more)` : 'Nice'}</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
