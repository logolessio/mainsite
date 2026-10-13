'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Compass, LayoutDashboard, LogOut, ShieldCheck, Trophy, UserRound } from 'lucide-react'
import { signOut } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { Avatar, useNavUser } from './nav-user'
import { T } from './copy-provider'
import { TransitionLink } from './transition-link'
import { LEGAL_LINKS, NAV_LINKS } from '@/lib/site'
import { cn } from '@/lib/utils'

/**
 * A small card that drops from the menu button: the pages, then you. No full-screen takeover, no giant type. It closes when
 * you pick something, press Escape or click anywhere else.
 */
export function SiteMenu({ open, onClose, onTour }: { open: boolean; onClose: () => void; onTour: () => void }) {
  const pathname = usePathname()
  const { user } = useNavUser()
  const first = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    if (!open) return
    const t = window.setTimeout(() => first.current?.focus({ preventScroll: true }), 120)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      window.clearTimeout(t)
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <>
          <div aria-hidden="true" className="fixed inset-0 z-40" onMouseDown={onClose} />
          <motion.div
            key="menu"
            id="site-menu"
            role="dialog"
            aria-label="Menu"
            initial={{ opacity: 0, scale: 0.94, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -6, transition: { duration: 0.14 } }}
            transition={{ type: 'spring', stiffness: 520, damping: 34 }}
            style={{ transformOrigin: 'top right' }}
            className="island fixed top-[68px] right-3 z-[55] w-[min(17.5rem,calc(100vw-1.5rem))] rounded-[26px] border border-white/10 bg-[#0b0b0d] p-2 text-white shadow-[0_24px_60px_-18px_rgb(0_0_0/0.6)] md:right-6"
          >
            <nav aria-label="Main">
              <ul>
                {NAV_LINKS.map((l, i) => {
                  const active = pathname === l.href
                  return (
                    <li key={l.href}>
                      <TransitionLink
                        ref={i === 0 ? first : undefined}
                        href={l.href}
                        onClick={onClose}
                        aria-current={active ? 'page' : undefined}
                        className={cn('flex h-11 items-center justify-between rounded-2xl px-4 text-[15px] transition-colors hover:bg-white/10', active ? 'text-white' : 'text-white/75 hover:text-white')}
                      >
                        <T>{l.label}</T>
                        {active && <span aria-hidden="true" className="size-1.5 rounded-full bg-white" />}
                      </TransitionLink>
                    </li>
                  )
                })}
              </ul>
            </nav>

            <div className="mx-2 my-2 h-px bg-white/10" />

            {user?.signedIn ? (
              <div>
                <TransitionLink href={`/@${user.profile.handle}`} onClick={onClose} className="flex items-center gap-3 rounded-2xl px-2 py-2 transition-colors hover:bg-white/10">
                  <Avatar src={user.profile.avatar} name={user.profile.displayName} size={36} />
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] leading-tight">{user.profile.displayName}</span>
                    <span className="block truncate text-[12px] text-white/50">@{user.profile.handle}</span>
                  </span>
                </TransitionLink>
                <Row href="/dashboard" icon={<LayoutDashboard className="size-4" />} onClick={onClose}>Dashboard</Row>
                <Row href={`/@${user.profile.handle}`} icon={<UserRound className="size-4" />} onClick={onClose}>Profile</Row>
                <Row href="/dashboard/achievements" icon={<Trophy className="size-4" />} onClick={onClose}>Achievements</Row>
                {user.isAdmin && <Row href="/admin" icon={<ShieldCheck className="size-4" />} onClick={onClose}>Admin</Row>}
              </div>
            ) : (
              <div className="grid gap-1.5 p-1">
                <TransitionLink href="/onboarding" onClick={onClose} className="inline-flex h-11 items-center justify-center rounded-full bg-white text-[15px] font-medium text-black transition-colors hover:bg-white/85">
                  Get started
                </TransitionLink>
                <TransitionLink href="/login" onClick={onClose} className="inline-flex h-10 items-center justify-center rounded-full text-[15px] text-white/75 transition-colors hover:bg-white/10 hover:text-white">
                  Log in
                </TransitionLink>
              </div>
            )}

            <div className="mx-2 my-2 h-px bg-white/10" />

            <div className="flex items-center justify-between px-1">
              <button type="button" onClick={onTour} className="inline-flex h-9 items-center gap-2 rounded-full px-3 text-[13px] text-white/60 transition-colors hover:bg-white/10 hover:text-white">
                <Compass className="size-3.5" /> Take the tour
              </button>
              {user?.signedIn && (
                <button type="button" onClick={() => signOut({ callbackUrl: '/' })} className="inline-flex h-9 items-center gap-2 rounded-full px-3 text-[13px] text-white/60 transition-colors hover:bg-white/10 hover:text-white">
                  <LogOut className="size-3.5" /> Log out
                </button>
              )}
            </div>
            <ul className="flex flex-wrap gap-x-3 gap-y-1 px-4 pt-1 pb-2 text-[11px] text-white/40">
              {LEGAL_LINKS.slice(0, 3).map((l) => (
                <li key={l.href}>
                  <TransitionLink href={l.href} onClick={onClose} className="transition-colors hover:text-white">
                    {l.label}
                  </TransitionLink>
                </li>
              ))}
            </ul>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function Row({ href, children, icon, onClick }: { href: string; children: React.ReactNode; icon: React.ReactNode; onClick: () => void }) {
  return (
    <TransitionLink href={href} onClick={onClick} className="flex h-10 items-center gap-3 rounded-2xl px-4 text-[14px] text-white/75 transition-colors hover:bg-white/10 hover:text-white">
      <span className="text-white/50">{icon}</span>
      {children}
    </TransitionLink>
  )
}
