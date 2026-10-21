'use client'

import { Search } from 'lucide-react'
import { openSearch } from './spotlight'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import { signOut } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { useDialog } from '@/hooks/use-dialog'
import { BadgeStar } from '@/components/badges/badge-star'
import { BADGE_BY_ID } from '@/lib/badges-defs'
import { BANNER_PRESETS } from '@/lib/profile-style'
import { Avatar, type NavUser, useNavUser } from './nav-user'
import { T } from './copy-provider'
import { OWNER_URL } from '@/lib/staff-nav'
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
  const box = useDialog<HTMLElement>(open, onClose, { initial: 'none', inert: false })
  const board = useFeature('leaderboard')
  const reels = useFeature('reels')
  const findable = useFeature('command-actions')
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
            ref={box}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            initial={{ x: '100%' }}
            animate={{ x: 0, transition: { duration: 0.5, ease: [0.32, 0.72, 0, 1] } }}
            exit={{ x: '100%', transition: { duration: 0.35, ease: [0.32, 0.72, 0, 1] } }}
            className="no-scrollbar fixed top-0 right-0 bottom-0 z-[45] flex transform-gpu will-change-transform w-[min(26rem,100vw)] flex-col overflow-y-auto border-l border-line bg-ink px-8 pt-24 pb-8 text-paper"
          >
            {findable && (
              <button
                type="button"
                onClick={() => {
                  onClose()
                  window.setTimeout(openSearch, 380)
                }}
                className="mb-6 flex h-12 w-full items-center gap-3 rounded-pill border border-line-strong bg-white/[0.03] px-5 text-left text-[15px] text-paper/55 transition-colors hover:border-paper/30 hover:text-paper"
              >
                <Search aria-hidden="true" className="size-4 shrink-0" />
                <span className="flex-1">Search, or do something</span>
              </button>
            )}
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
                        <span aria-hidden="true" className={cn('size-2 rounded-pill bg-paper transition-transform duration-300', active ? 'scale-100' : 'scale-0')} />
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
                <div className="overflow-hidden rounded-[calc(28px*var(--round,1))] border border-line bg-white/[0.03] p-5">
                  <TransitionLink href="/onboarding" onClick={onClose} className="inline-flex h-14 w-full items-center justify-center rounded-pill bg-paper text-[17px] font-medium text-ink transition-colors hover:bg-paper/85">
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

/** Quiet small print: the tour and the three pages people ask about most. */
function Legal({ onClose, onTour, className }: { onClose: () => void; onTour: () => void; className?: string }) {
  const links = [
    { label: 'Terms', href: LEGAL_LINKS[0].href },
    { label: 'Privacy', href: LEGAL_LINKS[1].href },
    { label: 'Payments', href: LEGAL_LINKS[6].href },
  ]
  return (
    <p className={cn('flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[12px] text-mute/75', className)}>
      <button type="button" onClick={onTour} className="transition-colors hover:text-paper">
        Take the tour
      </button>
      {links.map((l) => (
        <TransitionLink key={l.href} href={l.href} onClick={onClose} className="transition-colors hover:text-paper">
          {l.label}
        </TransitionLink>
      ))}
    </p>
  )
}

/** You, in one pill: your banner, picture, name and badges, three numbers, and the places you are most likely to go next. */
function ProfilePill({ user, onClose, onTour }: { user: Extract<NavUser, { signedIn: true }>; onClose: () => void; onTour: () => void }) {
  const p = user.profile
  const banner = p.bannerKind === 'image' ? `center/cover url(${p.banner})` : p.bannerKind === 'color' ? p.banner : (BANNER_PRESETS.find((b) => b.id === p.banner)?.css ?? BANNER_PRESETS[0].css)
  const stats: [string, string][] = [
    ['Submissions', compact(user.stats.clips)],
    ['Views', compact(user.stats.views)],
    [user.stats.brandCents > 0 ? 'Balance' : 'Earned', dollars(user.stats.brandCents > 0 ? user.stats.brandCents : user.stats.earnedCents)],
  ]
  const chip = 'inline-flex h-8 items-center rounded-pill bg-white/[0.06] px-3.5 text-[13px] text-paper/80 transition-colors hover:bg-white/[0.12] hover:text-paper'
  return (
    <div className="overflow-hidden rounded-[calc(30px*var(--round,1))] border border-white/[0.09] bg-[#0b0b0d] shadow-[0_30px_60px_-30px_rgb(0_0_0/0.9)]">
      <div className="relative h-[84px]" style={{ background: banner }}>
        <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/10 to-[#0b0b0d]" />
      </div>
      <div className="relative px-5 pb-5">
        <div className="-mt-9 flex items-end justify-between gap-3">
          <Avatar src={p.avatar} name={p.displayName} size={68} className="border-[4px] border-[#0b0b0d]" />
          <TransitionLink href="/dashboard" onClick={onClose} className="mb-1 inline-flex h-9 items-center gap-1.5 rounded-pill bg-paper pr-3 pl-4 text-[13px] font-medium text-ink transition-colors hover:bg-paper/85">
            Dashboard <ArrowUpRight aria-hidden="true" className="size-3.5" />
          </TransitionLink>
        </div>
        <div className="mt-3.5 flex items-center gap-2">
          <p className="min-w-0 truncate font-display text-[1.5rem] leading-none tracking-[-0.03em]">{p.displayName}</p>
          {p.badges.length > 0 && (
            <span className="flex shrink-0 items-center gap-1">
              {p.badges.slice(0, 4).map((id) => (BADGE_BY_ID[id] ? <BadgeStar key={id} badge={BADGE_BY_ID[id]} size={18} /> : null))}
            </span>
          )}
        </div>
        <p className="mt-1.5 text-[13px] text-mute">@{p.handle}</p>

        <dl className="mt-5 grid grid-cols-3 divide-x divide-white/[0.07] rounded-[calc(1.1rem*var(--round,1))] bg-white/[0.035] py-3.5">
          {stats.map(([k, v]) => (
            <div key={k} className="px-4">
              <dd className="font-display text-[1.3rem] leading-none tabular-nums">{v}</dd>
              <dt className="mt-1.5 text-[11px] text-mute">{k}</dt>
            </div>
          ))}
        </dl>

        <nav aria-label="Account" className="mt-4 flex flex-wrap items-center gap-1.5">
          <TransitionLink href={`/@${p.handle}`} onClick={onClose} className={chip}>
            Profile
          </TransitionLink>
          {(user.isAdmin || user.isDev) && (
            <a href={OWNER_URL ? `${OWNER_URL}/` : '/owner'} onClick={onClose} className={chip}>
              Owner
            </a>
          )}
          <button type="button" onClick={() => signOut({ callbackUrl: '/' })} className="ml-auto px-1.5 text-[13px] text-mute transition-colors hover:text-paper">
            Log out
          </button>
        </nav>

        <Legal onClose={onClose} onTour={onTour} className="mt-5" />
      </div>
    </div>
  )
}
