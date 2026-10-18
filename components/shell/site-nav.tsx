'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { usePathname } from 'next/navigation'
import { isInvitePath } from '@/lib/invite-shared'
import { useEffect, useRef, useState } from 'react'
import { BrandIcon } from '@/components/brand-icon'
import { Logo } from '@/components/logo'
import { EASE_OUT } from '@/lib/layout'
import { NAV_LINKS } from '@/lib/site'
import { cn } from '@/lib/utils'
import { TransitionLink } from './transition-link'
import { T } from './copy-provider'
import { NavUserActions, useNavUser } from './nav-user'
import { SiteMenu } from './site-menu'
import { useFeature } from './features-provider'
import { useTransitions } from './transition-provider'

const HIDDEN = ['/onboarding', '/dashboard', '/brand', '/admin', '/owner', '/dev', '/@', '/u/', '/links']
export const TOUR_EVENT = 'logoless:tour'


export function SiteNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const { navigate } = useTransitions()
  const { user, hint } = useNavUser()
  const board = useFeature('leaderboard')
  const reels = useFeature('reels')
  const links = [...NAV_LINKS, ...(reels ? [{ label: 'Reels', href: '/reels' }] : []), ...(board ? [{ label: 'Leaderboard', href: '/leaderboard' }] : []), (user ? user.signedIn : hint) ? { label: 'Dashboard', href: '/dashboard' } : { label: 'Log in', href: '/login' }]
  const toggleRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        toggleRef.current?.focus()
      }
    }
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (HIDDEN.some((p) => pathname.startsWith(p)) || isInvitePath(pathname)) return null

  const startTour = () => {
    setOpen(false)
    if (pathname === '/') window.setTimeout(() => window.dispatchEvent(new Event(TOUR_EVENT)), 350)
    else navigate('/?tour=1')
  }

  return (
    <>
      <header data-site-nav className="pointer-events-none fixed inset-x-0 top-0 z-50">
        <div
          aria-hidden="true"
          className={cn('absolute inset-0 h-28 bg-gradient-to-b from-ink from-40% via-ink/85 to-transparent transition-opacity duration-300', open && 'opacity-0')}
        />
        <nav aria-label="Main" className="relative flex h-20 w-full items-center justify-between px-4 md:px-6">
          <TransitionLink
            href="/"
            data-tour="logo"
            className="pointer-events-auto"
            aria-label="logoless home"
            onClick={() => setOpen(false)}
          >
            <Logo />
          </TransitionLink>

          <div className="pointer-events-auto flex items-center gap-2 md:gap-3">
            {user?.signedIn ? (
              <NavUserActions onNavigate={() => setOpen(false)} menuOpen={open} />
            ) : user === null && hint ? (
              // the server knows someone is signed in; the bell and picture arrive in a moment, so their places are kept and nothing jumps
              <>
                <span aria-hidden="true" className="size-11" />
                <TransitionLink href="/dashboard" data-tour="get-started" onClick={() => setOpen(false)} className="inline-flex h-11 items-center rounded-pill bg-paper px-4 text-sm font-medium text-ink transition-colors hover:bg-paper/85 md:px-5">
                  Dashboard
                </TransitionLink>
                <span aria-hidden="true" className="size-11" />
              </>
            ) : (
              <TransitionLink
                href="/onboarding"
                data-tour="get-started"
                onClick={() => setOpen(false)}
                className="inline-flex h-11 items-center rounded-pill bg-paper px-5 text-sm font-medium text-ink transition-colors hover:bg-paper/85"
              >
                Get started
              </TransitionLink>
            )}
            <button
              ref={toggleRef}
              type="button"
              data-tour="nav"
              aria-expanded={open}
              aria-controls="site-menu"
              aria-label={open ? 'Close menu' : 'Open menu'}
              onClick={() => setOpen((v) => !v)}
              className="grid size-11 place-items-center rounded-pill bg-[#1a1a1d] transition-colors hover:bg-[#242428]"
            >
              <MenuGlyph open={open} />
            </button>
          </div>
        </nav>
      </header>

      <SiteMenu open={open} onClose={() => setOpen(false)} onTour={startTour} />
    </>
  )
}

function MenuGlyph({ open }: { open: boolean }) {
  const t = { type: 'spring' as const, stiffness: 500, damping: 34 }
  // three lines that cross into an X
  return (
    <span aria-hidden="true" className="relative block h-[14px] w-5">
      <motion.span animate={open ? { top: 6, rotate: 45 } : { top: 0, rotate: 0 }} transition={t} className="absolute left-0 block h-[1.5px] w-5 rounded-pill bg-paper" />
      <motion.span animate={open ? { opacity: 0, scaleX: 0.2 } : { opacity: 1, scaleX: 1 }} transition={{ duration: 0.18 }} className="absolute top-[6px] left-0 block h-[1.5px] w-5 rounded-pill bg-paper" />
      <motion.span animate={open ? { top: 6, rotate: -45 } : { top: 12, rotate: 0 }} transition={t} className="absolute left-0 block h-[1.5px] w-5 rounded-pill bg-paper" />
    </span>
  )
}
