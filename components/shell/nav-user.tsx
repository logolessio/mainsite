'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { usePathname } from 'next/navigation'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { BadgeStar } from '@/components/badges/badge-star'
import { BADGE_BY_ID } from '@/lib/badges-defs'
import { BANNER_PRESETS } from '@/lib/profile-style'
import { EASE_OUT } from '@/lib/layout'
import { cn } from '@/lib/utils'
import { NotificationBell } from './notifications'
import { TransitionLink } from './transition-link'

export type NavUser =
  | { signedIn: false }
  | {
      signedIn: true
      isAdmin: boolean
      isDev: boolean
      stats: { clips: number; views: number; earnedCents: number; campaigns: number; brandCents: number }
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

/** `hint` is what the server already knows (is someone signed in), so the bar can draw the right buttons before the details arrive. */
type Ctx = { user: NavUser | null; hint: boolean | undefined; refresh: () => void; setUnread: (n: number) => void }
const NavUserContext = createContext<Ctx>({ user: null, hint: undefined, refresh: () => {}, setUnread: () => {} })
export const useNavUser = () => useContext(NavUserContext)

export const NAV_USER_REFRESH = 'logoless:nav-user'

export function NavUserProvider({ children, signedIn }: { children: React.ReactNode; signedIn?: boolean }) {
  // someone who is not signed in needs nothing fetched to be drawn
  const [user, setUser] = useState<NavUser | null>(signedIn === false ? { signedIn: false } : null)
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
  const value = useMemo(() => ({ user, hint: signedIn, refresh, setUnread }), [user, signedIn, refresh, setUnread])
  return <NavUserContext.Provider value={value}>{children}</NavUserContext.Provider>
}

const bannerCss = (b: string, kind: 'preset' | 'image' | 'color') =>
  kind === 'image' ? `center/cover url(${b})` : kind === 'color' ? b : (BANNER_PRESETS.find((p) => p.id === b)?.css ?? BANNER_PRESETS[0].css)

export function Avatar({ src, name, size = 40, className }: { src: string | null; name: string; size?: number; className?: string }) {
  const [failed, setFailed] = useState(false)
  const initial = (name.trim()[0] ?? '?').toUpperCase()
  return (
    <span
      className={cn('relative grid shrink-0 place-items-center overflow-hidden rounded-pill border border-line-strong bg-raised font-medium', className)}
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
export function NavUserActions({ onNavigate, menuOpen = false }: { onNavigate?: () => void; menuOpen?: boolean }) {
  const { user } = useNavUser()
  if (!user?.signedIn) return null
  return (
    <>
      <NotificationBell onNavigate={onNavigate} />
      <TransitionLink
        href="/dashboard"
        data-tour="get-started"
        onClick={onNavigate}
        className="inline-flex h-11 items-center rounded-pill bg-paper px-4 text-sm font-medium text-ink transition-colors hover:bg-paper/85 md:px-5"
      >
        Dashboard
      </TransitionLink>
      <ProfileIcon onNavigate={onNavigate} menuOpen={menuOpen} />
    </>
  )
}

function ProfileIcon({ onNavigate, menuOpen }: { onNavigate?: () => void; menuOpen: boolean }) {
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
    // the preview is for a mouse or the keyboard only, and never while the menu is open (the menu already shows you)
    <div className="relative" onPointerEnter={(e) => e.pointerType === 'mouse' && show()} onPointerLeave={(e) => e.pointerType === 'mouse' && hide()} onFocus={(e) => (e.target as HTMLElement).matches(':focus-visible') && show()} onBlur={hide}>
      <TransitionLink href={`/@${p.handle}`} onClick={onNavigate} aria-label={`Your profile, @${p.handle}`} className="block rounded-pill">
        <Avatar src={p.avatar} name={p.displayName} size={44} />
      </TransitionLink>
      <AnimatePresence>
        {open && !menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.22, ease: EASE_OUT }}
            className="absolute top-full right-0 z-50 w-72 pt-3"
          >
            <div className="glass-liquid rounded-[calc(26px*var(--round,1))] shadow-[0_30px_60px_-20px_rgb(0_0_0/0.9)]">
              <div className="h-20" style={{ background: bannerCss(p.banner, p.bannerKind) }} />
              <div className="px-4 pb-4">
                <Avatar src={p.avatar} name={p.displayName} size={56} className="-mt-9 border-2 border-surface" />
                <div className="mt-2 flex items-center gap-1.5">
                  <p className="min-w-0 truncate font-display text-xl leading-tight">{p.displayName}</p>
                  {p.badges.length > 0 && (
                    <span className="flex shrink-0 items-center gap-0.5">
                      {p.badges.slice(0, 5).map((id) => (BADGE_BY_ID[id] ? <BadgeStar key={id} badge={BADGE_BY_ID[id]} size={16} /> : null))}
                    </span>
                  )}
                </div>
                <p className="font-mono text-xs text-mute">@{p.handle}</p>
                {p.bio && <p className="mt-2 line-clamp-2 text-sm text-mute">{p.bio}</p>}
                <TransitionLink
                  href={`/@${p.handle}`}
                  onClick={onNavigate}
                  className="mt-4 flex h-9 items-center justify-center rounded-pill border border-line-strong text-sm transition-colors hover:bg-paper/10"
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
