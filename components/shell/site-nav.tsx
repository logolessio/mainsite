'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { BrandIcon } from '@/components/brand-icon'
import { Logo } from '@/components/logo'
import { EASE_OUT } from '@/lib/layout'
import { NAV_LINKS } from '@/lib/site'
import { cn } from '@/lib/utils'
import { TransitionLink } from './transition-link'
import { T } from './copy-provider'
import { NavUserActions, useNavUser } from './nav-user'
import { useTransitions } from './transition-provider'

const HIDDEN = ['/onboarding', '/dashboard', '/brand', '/admin']
export const TOUR_EVENT = 'logoless:tour'


export function SiteNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const { navigate } = useTransitions()
  const { user } = useNavUser()
  const links = [...NAV_LINKS, user?.signedIn ? { label: 'Dashboard', href: '/dashboard' } : { label: 'Log in', href: '/login' }]
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

  if (HIDDEN.some((p) => pathname.startsWith(p))) return null

  const startTour = () => {
    setOpen(false)
    if (pathname === '/') window.setTimeout(() => window.dispatchEvent(new Event(TOUR_EVENT)), 350)
    else navigate('/?tour=1')
  }

  return (
    <>
      <header className="pointer-events-none fixed inset-x-0 top-0 z-50">
        <div
          aria-hidden="true"
          className="absolute inset-0 h-28 bg-gradient-to-b from-ink from-40% via-ink/85 to-transparent"
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

          <div className="pointer-events-auto flex items-center gap-3">
            {user?.signedIn ? (
              <NavUserActions onNavigate={() => setOpen(false)} />
            ) : (
              <TransitionLink
                href="/onboarding"
                data-tour="get-started"
                onClick={() => setOpen(false)}
                aria-hidden={user === null}
                tabIndex={user === null ? -1 : undefined}
                className={cn(
                  'inline-flex h-11 items-center rounded-full bg-paper px-5 text-sm font-medium text-ink transition-all hover:bg-paper/85',
                  user === null && 'pointer-events-none opacity-0',
                )}
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
              className="glass relative grid size-11 place-items-center"
            >
              <MenuGlyph open={open} />
            </button>
          </div>
        </nav>
      </header>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="scrim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-ink/75"
            />
            <motion.aside
              key="panel"
              id="site-menu"
              aria-label="Menu"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%', transition: { duration: 0.3, ease: [0.4, 0, 1, 1] } }}
              transition={{ duration: 0.55, ease: EASE_OUT }}
              className="fixed inset-y-0 right-0 z-40 flex w-full max-w-[460px] flex-col overflow-y-auto border-l border-line bg-surface px-8 pt-28 pb-8"
            >
              <motion.ul
                initial="hidden"
                animate="show"
                variants={{ show: { transition: { staggerChildren: 0.06, delayChildren: 0.18 } } }}
                className="flex flex-col"
              >
                {links.map((link, i) => (
                  <motion.li
                    key={link.href}
                    variants={{
                      hidden: { opacity: 0, y: 28 },
                      show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_OUT } },
                    }}
                    className="border-b border-line"
                  >
                    <TransitionLink
                      href={link.href}
                      onClick={() => setOpen(false)}
                      aria-current={pathname === link.href ? 'page' : undefined}
                      className="group flex items-baseline justify-between py-3"
                    >
                      <span className="font-display text-4xl md:text-5xl transition-transform duration-300 group-hover:translate-x-2">
                        <T>{link.label}</T>
                      </span>
                      <span className="font-mono text-xs text-mute">0{i + 1}</span>
                    </TransitionLink>
                  </motion.li>
                ))}
                <motion.li
                  variants={{
                    hidden: { opacity: 0, y: 28 },
                    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_OUT } },
                  }}
                >
                  <button
                    type="button"
                    onClick={startTour}
                    className="group flex w-full items-baseline justify-between py-4 text-left"
                  >
                    <span className="font-display text-4xl md:text-5xl text-mute transition-all duration-300 group-hover:translate-x-2 group-hover:text-paper">
                      Take the tour
                    </span>
                    <span className="font-mono text-xs text-mute">0{links.length + 1}</span>
                  </button>
                </motion.li>
              </motion.ul>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { delay: 0.5 } }}
                className="mt-auto flex items-end justify-between gap-4"
              >
                <p className="max-w-[22ch] text-sm leading-relaxed text-mute">
                  Clip campaigns. Post them. Get paid for every thousand views.
                </p>
                <div className="flex items-center gap-4 text-mute">
                  <BrandIcon name="tiktok" />
                  <BrandIcon name="youtube" />
                  <BrandIcon name="discord" />
                </div>
              </motion.div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

function MenuGlyph({ open }: { open: boolean }) {
  const t = { duration: 0.35, ease: EASE_OUT }
  return (
    <span aria-hidden="true" className="relative block h-3 w-4">
      <motion.span
        animate={open ? { top: 5, rotate: 45 } : { top: 0, rotate: 0 }}
        transition={t}
        className="absolute left-0 block h-px w-4 bg-paper"
      />
      <motion.span
        animate={open ? { opacity: 0, scaleX: 0 } : { opacity: 1, scaleX: 1 }}
        transition={t}
        className="absolute top-[5px] left-0 block h-px w-4 origin-right bg-paper"
      />
      <motion.span
        animate={open ? { top: 5, rotate: -45 } : { top: 10, rotate: 0 }}
        transition={t}
        className="absolute left-0 block h-px w-4 bg-paper"
      />
    </span>
  )
}
