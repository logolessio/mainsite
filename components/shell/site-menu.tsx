'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { signOut } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { Avatar, useNavUser } from './nav-user'
import { T } from './copy-provider'
import { TransitionLink } from './transition-link'
import { LEGAL_LINKS, NAV_LINKS } from '@/lib/site'
import { useFeature } from './features-provider'
import { cn } from '@/lib/utils'

/**
 * The menu slides in from the right edge: the pages in large type, you at the bottom, nothing else. Pointing at one page
 * quiets the others. It follows the page's colour. Pick a page, press Escape or click the dimmed page to close it.
 */
export function SiteMenu({ open, onClose, onTour }: { open: boolean; onClose: () => void; onTour: () => void }) {
  const pathname = usePathname()
  const { user } = useNavUser()
  const first = useRef<HTMLAnchorElement>(null)
  const board = useFeature('leaderboard')
  const reels = useFeature('reels')
  const status = useFeature('status-page')
  // the smaller pages: always there, or there once their feature is switched on
  const more = [
    { label: 'Case studies', href: '/case-studies' },
    { label: 'Contact', href: '/contact' },
    ...(board ? [{ label: 'Leaderboard', href: '/leaderboard' }] : []),
    ...(reels ? [{ label: 'Reels', href: '/reels' }] : []),
    ...(status ? [{ label: 'Status', href: '/status' }] : []),
  ]

  useEffect(() => {
    if (!open) return
    const t = window.setTimeout(() => first.current?.focus({ preventScroll: true }), 300)
    return () => window.clearTimeout(t)
  }, [open])

  const small = 'text-[15px] text-mute transition-colors hover:text-paper'

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="dim" aria-hidden="true" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="fixed inset-0 z-40 bg-black/55" onMouseDown={onClose} />
          <motion.aside
            key="menu"
            id="site-menu"
            role="dialog"
            aria-label="Menu"
            initial={{ x: '100%' }}
            animate={{ x: 0, transition: { duration: 0.5, ease: [0.32, 0.72, 0, 1] } }}
            exit={{ x: '100%', transition: { duration: 0.35, ease: [0.32, 0.72, 0, 1] } }}
            className="no-scrollbar fixed top-0 right-0 bottom-0 z-[45] flex w-[min(26rem,100vw)] flex-col overflow-y-auto border-l border-line bg-ink px-8 pt-24 pb-8 text-paper"
          >
            <nav aria-label="Main">
              <ul className="[&:hover>li:not(:hover)]:opacity-35">
                {NAV_LINKS.map((l, i) => {
                  const active = pathname === l.href
                  return (
                    <motion.li key={l.href} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0, transition: { duration: 0.45, delay: 0.12 + i * 0.045, ease: [0.32, 0.72, 0, 1] } }} className="transition-opacity duration-300">
                      <TransitionLink
                        ref={i === 0 ? first : undefined}
                        href={l.href}
                        onClick={onClose}
                        aria-current={active ? 'page' : undefined}
                        className="group flex items-center gap-3 py-1 font-display text-[2.2rem] leading-[1.1] tracking-[-0.035em]"
                      >
                        <T>{l.label}</T>
                        <span aria-hidden="true" className={cn('size-2 rounded-full bg-paper transition-transform duration-300', active ? 'scale-100' : 'scale-0')} />
                      </TransitionLink>
                    </motion.li>
                  )
                })}
              </ul>
            </nav>

            <div className="mt-7">
              <p className="mb-2 text-[12px] text-mute/70">More</p>
              <ul className="grid grid-cols-2 gap-x-4 [&:hover>li:not(:hover)]:opacity-40">
                {more.map((l, i) => (
                  <motion.li key={l.href} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0, transition: { duration: 0.4, delay: 0.4 + i * 0.04, ease: [0.32, 0.72, 0, 1] } }} className="transition-opacity duration-300">
                    <TransitionLink href={l.href} onClick={onClose} aria-current={pathname === l.href ? 'page' : undefined} className="block py-1.5 text-[17px] text-paper/80 transition-colors hover:text-paper">
                      {l.label}
                    </TransitionLink>
                  </motion.li>
                ))}
              </ul>
            </div>

            <div className="mt-auto pt-10">
              {user?.signedIn ? (
                <>
                  <TransitionLink href="/dashboard" onClick={onClose} className="mb-6 flex items-center gap-3.5">
                    <Avatar src={user.profile.avatar} name={user.profile.displayName} size={44} />
                    <span className="min-w-0">
                      <span className="block truncate text-[17px] leading-tight">{user.profile.displayName}</span>
                      <span className="block truncate text-[13px] text-mute">Open dashboard</span>
                    </span>
                  </TransitionLink>
                  <div className="flex flex-wrap gap-x-6 gap-y-2">
                    <TransitionLink href={`/@${user.profile.handle}`} onClick={onClose} className={small}>
                      Profile
                    </TransitionLink>
                    {user.isAdmin && (
                      <TransitionLink href="/admin" onClick={onClose} className={small}>
                        Admin
                      </TransitionLink>
                    )}
                    <button type="button" onClick={() => signOut({ callbackUrl: '/' })} className={small}>
                      Log out
                    </button>
                  </div>
                </>
              ) : (
                <div className="grid gap-4">
                  <TransitionLink href="/onboarding" onClick={onClose} className="inline-flex h-14 items-center justify-center rounded-full bg-paper text-[17px] font-medium text-ink transition-colors hover:bg-paper/85">
                    Get started
                  </TransitionLink>
                  <TransitionLink href="/login" onClick={onClose} className="py-1 text-center text-[15px] text-mute transition-colors hover:text-paper">
                    Log in
                  </TransitionLink>
                </div>
              )}
              <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[12px] text-mute/70">
                <button type="button" onClick={onTour} className="transition-colors hover:text-paper">
                  Take the tour
                </button>
                {[LEGAL_LINKS[0], LEGAL_LINKS[1], LEGAL_LINKS[4], LEGAL_LINKS[6]].map((l) => (
                  <TransitionLink key={l.href} href={l.href} onClick={onClose} className="transition-colors hover:text-paper">
                    {l.label}
                  </TransitionLink>
                ))}
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
