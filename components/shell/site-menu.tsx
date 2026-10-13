'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Compass, LayoutDashboard, LogOut, ShieldCheck, Trophy, UserRound } from 'lucide-react'
import { signOut } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { BrandIcon } from '@/components/brand-icon'
import { Avatar, useNavUser } from './nav-user'
import { T } from './copy-provider'
import { TransitionLink } from './transition-link'
import { LEGAL_LINKS, NAV_LINKS, SITE } from '@/lib/site'
import { cn } from '@/lib/utils'

/**
 * The menu is a bar the full width of the screen that opens down from the top: the pages on the left, you on the right, the small
 * print underneath. It follows the page's colour. Pick a page, press Escape or click the dimmed page to close it.
 */
export function SiteMenu({ open, onClose, onTour }: { open: boolean; onClose: () => void; onTour: () => void }) {
  const pathname = usePathname()
  const { user } = useNavUser()
  const first = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    if (!open) return
    const t = window.setTimeout(() => first.current?.focus({ preventScroll: true }), 250)
    return () => window.clearTimeout(t)
  }, [open])

  const half = Math.ceil(NAV_LINKS.length / 2)
  const columns = [
    { title: 'Explore', links: NAV_LINKS.slice(0, half) },
    { title: 'Company', links: NAV_LINKS.slice(half) },
  ]

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="dim" aria-hidden="true" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="fixed inset-0 z-40 bg-black/50" onMouseDown={onClose} />
          <motion.div
            key="menu"
            id="site-menu"
            role="dialog"
            aria-label="Menu"
            initial={{ clipPath: 'inset(0 0 100% 0)' }}
            animate={{ clipPath: 'inset(0 0 0% 0)', transition: { duration: 0.5, ease: [0.76, 0, 0.24, 1] } }}
            exit={{ clipPath: 'inset(0 0 100% 0)', transition: { duration: 0.35, ease: [0.76, 0, 0.24, 1] } }}
            className="no-scrollbar fixed inset-x-0 top-0 z-[45] max-h-dvh overflow-y-auto border-b border-line-strong bg-ink text-paper"
          >
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0, transition: { duration: 0.45, delay: 0.18 } }} exit={{ opacity: 0, transition: { duration: 0.12 } }} className="mx-auto grid w-full max-w-[1400px] gap-10 px-6 pt-28 pb-8 md:grid-cols-3 md:gap-12 md:px-10 md:pt-32">
              {columns.map((col, c) => (
                <nav key={col.title} aria-label={col.title}>
                  <p className="mb-5 text-[13px] text-mute">{col.title}</p>
                  <ul>
                    {col.links.map((l, i) => {
                      const active = pathname === l.href
                      return (
                        <li key={l.href}>
                          <TransitionLink
                            ref={c === 0 && i === 0 ? first : undefined}
                            href={l.href}
                            onClick={onClose}
                            aria-current={active ? 'page' : undefined}
                            className={cn('group flex items-center gap-3 py-2 font-display text-[clamp(1.7rem,3vw,2.5rem)] leading-[1.1] tracking-[-0.03em] transition-colors', active ? 'text-paper' : 'text-paper/55 hover:text-paper')}
                          >
                            <span className="transition-transform duration-300 group-hover:translate-x-1.5">
                              <T>{l.label}</T>
                            </span>
                            {active && <span aria-hidden="true" className="size-2 rounded-full bg-paper" />}
                          </TransitionLink>
                        </li>
                      )
                    })}
                  </ul>
                </nav>
              ))}

              <div aria-label="Account" role="group">
                <p className="mb-5 text-[13px] text-mute">{user?.signedIn ? 'You' : 'Join'}</p>
                {user?.signedIn ? (
                  <>
                    <TransitionLink href={`/@${user.profile.handle}`} onClick={onClose} className="mb-3 flex items-center gap-3.5 rounded-2xl py-1 transition-opacity hover:opacity-75">
                      <Avatar src={user.profile.avatar} name={user.profile.displayName} size={48} />
                      <span className="min-w-0">
                        <span className="block truncate font-display text-xl leading-tight">{user.profile.displayName}</span>
                        <span className="block truncate text-[13px] text-mute">@{user.profile.handle}</span>
                      </span>
                    </TransitionLink>
                    <ul>
                      <Row href="/dashboard" icon={<LayoutDashboard className="size-[18px]" />} onClick={onClose}>Dashboard</Row>
                      <Row href={`/@${user.profile.handle}`} icon={<UserRound className="size-[18px]" />} onClick={onClose}>Profile</Row>
                      <Row href="/dashboard/achievements" icon={<Trophy className="size-[18px]" />} onClick={onClose}>Achievements</Row>
                      {user.isAdmin && <Row href="/admin" icon={<ShieldCheck className="size-[18px]" />} onClick={onClose}>Admin</Row>}
                    </ul>
                  </>
                ) : (
                  <div className="grid max-w-xs gap-3">
                    <p className="font-display text-2xl leading-tight">Views have value.</p>
                    <TransitionLink href="/onboarding" onClick={onClose} className="inline-flex h-12 items-center justify-center rounded-full bg-paper text-[16px] font-medium text-ink transition-colors hover:bg-paper/85">
                      Get started
                    </TransitionLink>
                    <TransitionLink href="/login" onClick={onClose} className="inline-flex h-12 items-center justify-center rounded-full border border-line-strong text-[16px] transition-colors hover:bg-paper/[0.06]">
                      Log in
                    </TransitionLink>
                  </div>
                )}
              </div>
            </motion.div>

            <div className="mx-auto flex w-full max-w-[1400px] flex-wrap items-center gap-x-6 gap-y-3 border-t border-line px-6 py-5 text-[13px] text-mute md:px-10">
              <button type="button" onClick={onTour} className="inline-flex items-center gap-2 transition-colors hover:text-paper">
                <Compass className="size-4" /> Take the tour
              </button>
              {user?.signedIn && (
                <button type="button" onClick={() => signOut({ callbackUrl: '/' })} className="inline-flex items-center gap-2 transition-colors hover:text-paper">
                  <LogOut className="size-4" /> Log out
                </button>
              )}
              <ul className="flex flex-wrap gap-x-5 gap-y-1.5 md:ml-auto">
                {LEGAL_LINKS.slice(0, 3).map((l) => (
                  <li key={l.href}>
                    <TransitionLink href={l.href} onClick={onClose} className="transition-colors hover:text-paper">
                      {l.label}
                    </TransitionLink>
                  </li>
                ))}
              </ul>
              <div className="flex items-center gap-4">
                {(['discord', 'x', 'tiktok', 'instagram', 'youtube'] as const).map((n) => (
                  <a key={n} href={SITE.social[n]} aria-label={n} className="transition-colors hover:text-paper">
                    <BrandIcon name={n} className="size-4" />
                  </a>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function Row({ href, children, icon, onClick }: { href: string; children: React.ReactNode; icon: React.ReactNode; onClick: () => void }) {
  return (
    <li>
      <TransitionLink href={href} onClick={onClick} className="group flex items-center gap-3 py-2.5 text-[17px] text-paper/70 transition-colors hover:text-paper">
        <span className="text-mute transition-colors group-hover:text-paper">{icon}</span>
        {children}
      </TransitionLink>
    </li>
  )
}
