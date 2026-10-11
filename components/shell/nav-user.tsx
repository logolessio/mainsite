'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Bell, Check } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { BadgeStar } from '@/components/badges/badge-star'
import { BADGE_BY_ID } from '@/lib/badges-defs'
import { BANNER_PRESETS } from '@/lib/profile-style'
import { EASE_OUT } from '@/lib/layout'
import { cn } from '@/lib/utils'
import { TransitionLink } from './transition-link'

export type NavUser =
  | { signedIn: false }
  | {
      signedIn: true
      isAdmin: boolean
      restricted: boolean
      unread: number
      profile: {
        handle: string
        displayName: string
        bio: string
        avatar: string | null
        banner: string
        bannerKind: 'preset' | 'image' | 'color'
        accent: string
        badges: string[]
      }
    }

type Ctx = { user: NavUser | null; refresh: () => void; setUnread: (n: number) => void }
const NavUserContext = createContext<Ctx>({ user: null, refresh: () => {}, setUnread: () => {} })
export const useNavUser = () => useContext(NavUserContext)

export const NAV_USER_REFRESH = 'logoless:nav-user'

export function NavUserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<NavUser | null>(null)
  const pathname = usePathname()

  const refresh = useCallback(() => {
    fetch('/api/me/nav', { credentials: 'same-origin', cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { signedIn: false }))
      .then((j: NavUser) => setUser(j))
      .catch(() => setUser((u) => u ?? { signedIn: false }))
  }, [])

  // On the first load, and each time the person moves to a different area, so the bell stays current.
  const area = pathname.split('/')[1] ?? ''
  useEffect(() => {
    refresh()
  }, [refresh, area])

  useEffect(() => {
    window.addEventListener(NAV_USER_REFRESH, refresh)
    const onVisible = () => document.visibilityState === 'visible' && refresh()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener(NAV_USER_REFRESH, refresh)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [refresh])

  const setUnread = useCallback((n: number) => setUser((u) => (u && u.signedIn ? { ...u, unread: n } : u)), [])
  const value = useMemo(() => ({ user, refresh, setUnread }), [user, refresh, setUnread])
  return <NavUserContext.Provider value={value}>{children}</NavUserContext.Provider>
}

const bannerCss = (b: string, kind: 'preset' | 'image' | 'color') =>
  kind === 'image' ? `center/cover url(${b})` : kind === 'color' ? b : (BANNER_PRESETS.find((p) => p.id === b)?.css ?? BANNER_PRESETS[0].css)

export function Avatar({ src, name, size = 40, className }: { src: string | null; name: string; size?: number; className?: string }) {
  const [failed, setFailed] = useState(false)
  const initial = (name.trim()[0] ?? '?').toUpperCase()
  return (
    <span
      className={cn('relative grid shrink-0 place-items-center overflow-hidden rounded-full border border-line-strong bg-raised font-medium', className)}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" width={size} height={size} referrerPolicy="no-referrer" onError={() => setFailed(true)} className="size-full object-cover" />
      ) : (
        initial
      )}
    </span>
  )
}

/** Dashboard button, profile icon with a hover card, and the notification bell. Shown only when signed in. */
export function NavUserActions({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useNavUser()
  if (!user?.signedIn) return null
  return (
    <>
      <NotificationBell onNavigate={onNavigate} />
      <TransitionLink
        href="/dashboard"
        data-tour="get-started"
        onClick={onNavigate}
        className="inline-flex h-11 items-center rounded-full bg-paper px-4 text-sm font-medium text-ink transition-colors hover:bg-paper/85 md:px-5"
      >
        Dashboard
      </TransitionLink>
      <ProfileIcon onNavigate={onNavigate} />
    </>
  )
}

function ProfileIcon({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useNavUser()
  const [open, setOpen] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  if (!user?.signedIn) return null
  const p = user.profile
  const show = () => {
    if (timer.current) clearTimeout(timer.current)
    setOpen(true)
  }
  const hide = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setOpen(false), 140)
  }
  return (
    <div className="relative" onPointerEnter={(e) => e.pointerType === 'mouse' && show()} onPointerLeave={(e) => e.pointerType === 'mouse' && hide()} onFocus={show} onBlur={hide}>
      <TransitionLink href={`/@${p.handle}`} onClick={onNavigate} aria-label={`Your profile, @${p.handle}`} className="block rounded-full">
        <Avatar src={p.avatar} name={p.displayName} size={44} />
      </TransitionLink>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.22, ease: EASE_OUT }}
            className="absolute top-full right-0 z-50 w-72 pt-3"
          >
            <div className="overflow-hidden rounded-[26px] border border-line-strong bg-surface shadow-[0_30px_60px_-20px_rgb(0_0_0/0.9)]">
              <div className="h-20" style={{ background: bannerCss(p.banner, p.bannerKind) }} />
              <div className="px-4 pb-4">
                <Avatar src={p.avatar} name={p.displayName} size={56} className="-mt-9 border-2 border-surface" />
                <p className="mt-2 truncate font-display text-xl leading-tight">{p.displayName}</p>
                <p className="font-mono text-xs text-mute">@{p.handle}</p>
                {p.bio && <p className="mt-2 line-clamp-2 text-sm text-mute">{p.bio}</p>}
                {p.badges.length > 0 && (
                  <div className="mt-3 flex gap-1">
                    {p.badges.slice(0, 5).map((id) => (BADGE_BY_ID[id] ? <BadgeStar key={id} badge={BADGE_BY_ID[id]} size={34} /> : null))}
                  </div>
                )}
                <TransitionLink
                  href={`/@${p.handle}`}
                  onClick={onNavigate}
                  className="mt-4 flex h-9 items-center justify-center rounded-full border border-line-strong text-sm transition-colors hover:bg-paper/10"
                >
                  View profile
                </TransitionLink>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

type Note = { id: string; kind: string; title: string; body: string; href: string | null; read_at: number | null; created_at: number }

const ago = (t: number) => {
  const s = Math.max(1, Math.floor(Date.now() / 1000 - t))
  if (s < 60) return 'now'
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}

function NotificationBell({ onNavigate }: { onNavigate?: () => void }) {
  const { user, setUnread } = useNavUser()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Note[] | null>(null)
  const wrap = useRef<HTMLDivElement>(null)
  const unread = user?.signedIn ? user.unread : 0

  useEffect(() => {
    if (!open) return
    fetch('/api/me/notifications', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((j: { items: Note[] }) => setItems(j.items))
      .catch(() => setItems([]))
    const onDown = (e: PointerEvent) => !wrap.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const markAll = async () => {
    setItems((cur) => cur?.map((n) => ({ ...n, read_at: n.read_at ?? Date.now() / 1000 })) ?? cur)
    setUnread(0)
    await fetch('/api/me/notifications', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }).catch(() => {})
  }
  const markOne = (n: Note) => {
    if (n.read_at) return
    setUnread(Math.max(0, unread - 1))
    fetch('/api/me/notifications', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: n.id }) }).catch(() => {})
  }

  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="glass relative grid size-11 place-items-center"
      >
        <Bell className="size-[18px]" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 grid min-w-5 place-items-center rounded-full bg-paper px-1 text-[10px] font-semibold leading-5 text-ink">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.22, ease: EASE_OUT }}
            className="absolute top-full right-0 z-50 mt-3 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-[26px] border border-line-strong bg-surface shadow-[0_30px_60px_-20px_rgb(0_0_0/0.9)]"
          >
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <p className="font-display text-lg">Notifications</p>
              {unread > 0 && (
                <button type="button" onClick={markAll} className="inline-flex items-center gap-1 text-xs text-mute hover:text-paper">
                  <Check className="size-3.5" /> Mark all read
                </button>
              )}
            </div>
            <div className="max-h-[min(24rem,60vh)] overflow-y-auto">
              {items === null && <p className="px-4 py-8 text-center text-sm text-mute">Loading…</p>}
              {items?.length === 0 && <p className="px-4 py-10 text-center text-sm text-mute">You are all caught up.</p>}
              {items?.map((n) => {
                const inner = (
                  <>
                    <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', n.read_at ? 'bg-transparent' : 'bg-paper')} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm">{n.title}</span>
                      {n.body && <span className="mt-0.5 block text-xs text-mute">{n.body}</span>}
                    </span>
                    <span className="shrink-0 font-mono text-[10px] text-mute">{ago(n.created_at)}</span>
                  </>
                )
                const cls = 'flex gap-3 border-b border-line px-4 py-3 text-left transition-colors last:border-0 hover:bg-paper/5'
                return n.href ? (
                  <TransitionLink
                    key={n.id}
                    href={n.href}
                    className={cls}
                    onClick={() => {
                      markOne(n)
                      setOpen(false)
                      onNavigate?.()
                    }}
                  >
                    {inner}
                  </TransitionLink>
                ) : (
                  <button key={n.id} type="button" className={cn(cls, 'w-full')} onClick={() => markOne(n)}>
                    {inner}
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
