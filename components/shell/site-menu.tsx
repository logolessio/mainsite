'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, Compass, LogOut, ShieldCheck, Trophy, UserRound, LayoutDashboard } from 'lucide-react'
import { signOut } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { BrandIcon } from '@/components/brand-icon'
import { Avatar, useNavUser } from './nav-user'
import { T } from './copy-provider'
import { TransitionLink } from './transition-link'
import { LEGAL_LINKS, NAV_LINKS, SITE } from '@/lib/site'
import { EASE_OUT } from '@/lib/layout'
import { cn } from '@/lib/utils'

const NOTES: Record<string, string> = {
  '/': 'Browse every live campaign',
  '/welcome': 'Why logoless exists',
  '/how-it-works': 'From brief to payout',
  '/for-brands': 'Launch a campaign',
  '/for-clippers': 'Get paid for your edits',
  '/pricing': 'One simple fee',
  '/faq': 'Quick answers',
}

/** A full-screen menu that opens as a circle growing out of the menu button. */
export function SiteMenu({ open, onClose, onTour }: { open: boolean; onClose: () => void; onTour: () => void }) {
  const pathname = usePathname()
  const { user } = useNavUser()
  const [hover, setHover] = useState<string | null>(null)
  const first = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    if (!open) return
    const t = window.setTimeout(() => first.current?.focus({ preventScroll: true }), 400)
    return () => window.clearTimeout(t)
  }, [open])

  const links = [...NAV_LINKS, ...(user?.signedIn ? [] : [{ label: 'Log in', href: '/login' }])]
  const reveal = (i: number) => ({
    initial: { opacity: 0, y: 40, rotateX: -40 },
    animate: { opacity: 1, y: 0, rotateX: 0, transition: { duration: 0.8, ease: EASE_OUT, delay: 0.22 + i * 0.055 } },
    exit: { opacity: 0, y: -16, transition: { duration: 0.2 } },
  })

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="menu"
          id="site-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          initial={{ clipPath: 'circle(0px at calc(100% - 44px) 44px)' }}
          animate={{ clipPath: 'circle(150% at calc(100% - 44px) 44px)', transition: { duration: 0.85, ease: [0.76, 0, 0.24, 1] } }}
          exit={{ clipPath: 'circle(0px at calc(100% - 44px) 44px)', transition: { duration: 0.55, ease: [0.76, 0, 0.24, 1] } }}
          className="fixed inset-0 z-40 overflow-y-auto bg-[#060607]"
        >
          {/* slow drifting light behind everything */}
          <motion.div
            aria-hidden="true"
            animate={{ x: [0, 80, -40, 0], y: [0, -50, 60, 0] }}
            transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
            className="pointer-events-none absolute -top-40 -left-32 size-[620px] rounded-full bg-[radial-gradient(closest-side,rgb(255_255_255/0.10),transparent)]"
          />
          <motion.div
            aria-hidden="true"
            animate={{ x: [0, -90, 50, 0], y: [0, 70, -40, 0] }}
            transition={{ duration: 28, repeat: Infinity, ease: 'easeInOut' }}
            className="pointer-events-none absolute -right-40 bottom-0 size-[700px] rounded-full bg-[radial-gradient(closest-side,rgb(255_77_77/0.10),transparent)]"
          />
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 [background-image:radial-gradient(rgb(255_255_255/0.07)_1px,transparent_1.2px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />

          <div className="relative mx-auto grid min-h-dvh w-full max-w-[1400px] grid-cols-1 gap-10 px-6 pt-28 pb-10 md:px-12 lg:grid-cols-[1.5fr_1fr] lg:gap-20">
            <nav aria-label="Main" className="flex flex-col justify-center [perspective:900px]">
              <p className="mb-6 text-xs text-mute">Menu</p>
              <ul className="flex flex-col [&:hover_a:not(:hover)]:opacity-30" onPointerLeave={() => setHover(null)}>
                {links.map((l, i) => {
                  const active = pathname === l.href
                  return (
                    <motion.li key={l.href} {...reveal(i)} className="border-b border-white/[0.07] first:border-t">
                      <TransitionLink
                        ref={i === 0 ? first : undefined}
                        href={l.href}
                        onClick={onClose}
                        onPointerEnter={() => setHover(l.href)}
                        onFocus={() => setHover(l.href)}
                        aria-current={active ? 'page' : undefined}
                        className="group flex items-center gap-4 py-1.5 transition-opacity duration-300 md:gap-8 md:py-2"
                      >
                        {/* the word rolls up to a second copy on hover */}
                        <span className="relative block overflow-hidden whitespace-nowrap font-display text-[clamp(2rem,min(6vw,7vh),4.6rem)] leading-[1.08]">
                          <span className="block transition-transform duration-500 [transition-timing-function:cubic-bezier(.22,1,.36,1)] group-hover:-translate-y-full group-focus-visible:-translate-y-full">
                            <T>{l.label}</T>
                          </span>
                          <span aria-hidden="true" className="absolute inset-0 block translate-y-full text-paper transition-transform duration-500 [transition-timing-function:cubic-bezier(.22,1,.36,1)] group-hover:translate-y-0 group-focus-visible:translate-y-0">
                            {l.label}
                          </span>
                        </span>
                        {active && <span aria-hidden="true" className="size-2 rounded-full bg-paper" />}
                        <span className="ml-auto hidden items-center gap-2 text-sm text-mute opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 md:flex [&]:-translate-x-3">
                          {NOTES[l.href] ?? ''}
                          <ArrowUpRight className="size-4" />
                        </span>
                      </TransitionLink>
                    </motion.li>
                  )
                })}
                <motion.li {...reveal(links.length)} className="border-b border-white/[0.07]">
                  <button type="button" onClick={onTour} className="group flex w-full items-center gap-4 py-2 text-left md:gap-8 md:py-3">
                    <span className="w-8 font-mono text-xs text-mute">
                      <Compass className="size-4" />
                    </span>
                    <span className="font-display text-[clamp(1.4rem,min(3vw,4vh),2.2rem)] text-mute transition-colors group-hover:text-paper">Take the tour</span>
                  </button>
                </motion.li>
              </ul>
            </nav>

            <motion.aside
              {...reveal(2)}
              aria-label="Account"
              className="flex flex-col justify-between gap-10 lg:py-16"
            >
              <div className="rounded-[34px] border border-white/10 bg-white/[0.035] p-6 shadow-[inset_0_1px_0_rgb(255_255_255/0.08)] backdrop-blur-sm">
                {user?.signedIn ? (
                  <>
                    <div className="flex items-center gap-4">
                      <Avatar src={user.profile.avatar} name={user.profile.displayName} size={60} />
                      <div className="min-w-0">
                        <p className="truncate font-display text-2xl leading-tight">{user.profile.displayName}</p>
                        <p className="font-mono text-xs text-mute">@{user.profile.handle}</p>
                      </div>
                    </div>
                    <div className="mt-6 grid gap-2">
                      <MenuLink href="/dashboard" icon={<LayoutDashboard className="size-4" />} onClick={onClose} primary>Dashboard</MenuLink>
                      <MenuLink href={`/@${user.profile.handle}`} icon={<UserRound className="size-4" />} onClick={onClose}>My profile</MenuLink>
                      <MenuLink href="/dashboard/achievements" icon={<Trophy className="size-4" />} onClick={onClose}>Achievements</MenuLink>
                      {user.isAdmin && <MenuLink href="/admin" icon={<ShieldCheck className="size-4" />} onClick={onClose}>Admin</MenuLink>}
                      <button
                        type="button"
                        onClick={() => signOut({ callbackUrl: '/' })}
                        className="flex h-11 items-center gap-3 rounded-full px-4 text-sm text-mute transition-colors hover:text-paper"
                      >
                        <LogOut className="size-4" /> Log out
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="font-display text-3xl leading-tight">Views have value.</p>
                    <p className="mt-2 text-sm text-mute">Clip a campaign, post it, get paid for every thousand views.</p>
                    <div className="mt-6 grid gap-2">
                      <MenuLink href="/onboarding" onClick={onClose} primary>Get started</MenuLink>
                      <MenuLink href="/login" onClick={onClose}>Log in</MenuLink>
                    </div>
                  </>
                )}
              </div>

              <div>
                <div className="flex items-center gap-5 text-mute">
                  {(['discord', 'x', 'tiktok', 'instagram', 'youtube'] as const).map((n) => (
                    <a key={n} href={SITE.social[n]} aria-label={n} className="transition-all hover:-translate-y-0.5 hover:text-paper">
                      <BrandIcon name={n} className="size-5" />
                    </a>
                  ))}
                </div>
                <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-mute">
                  {LEGAL_LINKS.slice(0, 4).map((l) => (
                    <li key={l.href}>
                      <TransitionLink href={l.href} onClick={onClose} className="transition-colors hover:text-paper">{l.label}</TransitionLink>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-xs text-mute/70">© {new Date().getFullYear()} {SITE.name}</p>
              </div>
            </motion.aside>
          </div>
          <span className="sr-only">{hover}</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function MenuLink({ href, children, icon, onClick, primary }: { href: string; children: React.ReactNode; icon?: React.ReactNode; onClick: () => void; primary?: boolean }) {
  return (
    <TransitionLink
      href={href}
      onClick={onClick}
      className={cn(
        'group flex h-12 items-center justify-between rounded-full px-5 text-sm transition-all',
        primary ? 'bg-paper font-medium text-ink hover:bg-paper/85' : 'border border-white/12 hover:bg-white/8',
      )}
    >
      <span className="flex items-center gap-3">
        {icon}
        {children}
      </span>
      <ArrowUpRight className="size-4 opacity-60 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
    </TransitionLink>
  )
}
