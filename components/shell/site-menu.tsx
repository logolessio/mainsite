'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { signOut } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { BadgeStar } from '@/components/badges/badge-star'
import { BADGE_BY_ID } from '@/lib/badges-defs'
import { BANNER_PRESETS } from '@/lib/profile-style'
import { Avatar, type NavUser, useNavUser } from './nav-user'
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
            className="no-scrollbar fixed top-0 right-0 bottom-0 z-[45] flex transform-gpu will-change-transform w-[min(26rem,100vw)] flex-col overflow-y-auto border-l border-line bg-ink px-8 pt-24 pb-8 text-paper"
          >
            <nav aria-label="Main">
              <ul className="[&:hover>li:not(:hover)]:opacity-35">
                {NAV_LINKS.map((l, i) => {
                  const active = pathname === l.href
                  return (
                    <li key={l.href} className="transition-opacity duration-300">
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
                    </li>
                  )
                })}
              </ul>
            </nav>

            <div className="mt-7">
              <p className="mb-2 text-[12px] text-mute/70">More</p>
              <ul className="grid grid-cols-2 gap-x-4 [&:hover>li:not(:hover)]:opacity-40">
                {more.map((l) => (
                  <li key={l.href} className="transition-opacity duration-300">
                    <TransitionLink href={l.href} onClick={onClose} aria-current={pathname === l.href ? 'page' : undefined} className="block py-1.5 text-[17px] text-paper/80 transition-colors hover:text-paper">
                      {l.label}
                    </TransitionLink>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-auto pt-10">
              {user?.signedIn ? <ProfilePill user={user} onClose={onClose} onTour={onTour} /> : (
                <div className="overflow-hidden rounded-[28px] border border-line bg-white/[0.03] p-5">
                  <TransitionLink href="/onboarding" onClick={onClose} className="inline-flex h-14 w-full items-center justify-center rounded-full bg-paper text-[17px] font-medium text-ink transition-colors hover:bg-paper/85">
                    Get started
                  </TransitionLink>
                  <TransitionLink href="/login" onClick={onClose} className="mt-3 block py-1 text-center text-[15px] text-mute transition-colors hover:text-paper">
                    Log in
                  </TransitionLink>
                  <Legal onClose={onClose} onTour={onTour} className="mt-4 justify-center border-t border-line pt-4" />
                </div>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

const compact = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M` : n >= 10_000 ? `${Math.round(n / 1000)}k` : n.toLocaleString('en-US'))
const dollars = (cents: number) => `$${Math.floor(cents / 100).toLocaleString('en-US')}`

function Legal({ onClose, onTour, className }: { onClose: () => void; onTour: () => void; className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-mute/80', className)}>
      <button type="button" onClick={onTour} className="transition-colors hover:text-paper">
        Take the tour
      </button>
      {[LEGAL_LINKS[0], LEGAL_LINKS[1], LEGAL_LINKS[4], LEGAL_LINKS[6]].map((l) => (
        <TransitionLink key={l.href} href={l.href} onClick={onClose} className="transition-colors hover:text-paper">
          {l.label}
        </TransitionLink>
      ))}
    </div>
  )
}

/** You, in one pill: your banner, picture, name and badges, a few numbers, and the places you are most likely to go next. */
function ProfilePill({ user, onClose, onTour }: { user: Extract<NavUser, { signedIn: true }>; onClose: () => void; onTour: () => void }) {
  const p = user.profile
  const banner = p.bannerKind === 'image' ? `center/cover url(${p.banner})` : p.bannerKind === 'color' ? p.banner : (BANNER_PRESETS.find((b) => b.id === p.banner)?.css ?? BANNER_PRESETS[0].css)
  const stats: [string, string][] = [
    ['Clips', compact(user.stats.clips)],
    ['Views', compact(user.stats.views)],
    [user.stats.brandCents > 0 ? 'Balance' : 'Earned', dollars(user.stats.brandCents > 0 ? user.stats.brandCents : user.stats.earnedCents)],
  ]
  const link = 'text-[14px] text-mute transition-colors hover:text-paper'
  return (
    <div className="overflow-hidden rounded-[28px] border border-line bg-white/[0.03]">
      <div className="h-14" style={{ background: banner }} />
      <div className="px-5 pb-5">
        <TransitionLink href="/dashboard" onClick={onClose} className="group block">
          <Avatar src={p.avatar} name={p.displayName} size={52} className="-mt-8 border-[3px] border-[#0b0b0d]" />
          <span className="mt-2 flex items-center gap-1.5">
            <span className="min-w-0 truncate text-[18px] leading-tight">{p.displayName}</span>
            {p.badges.length > 0 && (
              <span className="flex shrink-0 items-center gap-0.5">
                {p.badges.slice(0, 4).map((id) => (BADGE_BY_ID[id] ? <BadgeStar key={id} badge={BADGE_BY_ID[id]} size={15} /> : null))}
              </span>
            )}
          </span>
          <span className="block truncate text-[13px] text-mute transition-colors group-hover:text-paper">Open dashboard</span>
        </TransitionLink>
        <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-4">
          {stats.map(([k, v]) => (
            <div key={k}>
              <dd className="font-display text-[1.35rem] leading-none tabular-nums">{v}</dd>
              <dt className="mt-1 text-[11px] text-mute">{k}</dt>
            </div>
          ))}
        </dl>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 border-t border-line pt-4">
          <TransitionLink href={`/@${p.handle}`} onClick={onClose} className={link}>
            Profile
          </TransitionLink>
          {user.isAdmin && (
            <TransitionLink href="/admin" onClick={onClose} className={link}>
              Admin
            </TransitionLink>
          )}
          {(user.isDev || user.isAdmin) && (
            <TransitionLink href="/dev" onClick={onClose} className={link}>
              Dev
            </TransitionLink>
          )}
          <button type="button" onClick={() => signOut({ callbackUrl: '/' })} className={link}>
            Log out
          </button>
        </div>
        <Legal onClose={onClose} onTour={onTour} className="mt-4 border-t border-line pt-4" />
      </div>
    </div>
  )
}
