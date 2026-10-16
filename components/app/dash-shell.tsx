'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowUpRight, Ellipsis, LogOut, Search, ShieldCheck, X } from 'lucide-react'
import { signOut } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { Icon } from '@/components/icons'
import { Logo } from '@/components/logo'
import { useFeature } from '@/components/shell/features-provider'
import { useNavUser } from '@/components/shell/nav-user'
import { NotificationBell } from '@/components/shell/notifications'
import { TransitionLink } from '@/components/shell/transition-link'
import { useTransitions } from '@/components/shell/transition-provider'
import { OWNER_URL, SITE_URL_FOR_STAFF } from '@/lib/staff-nav'
import { cn } from '@/lib/utils'
import { type AppNavItem, isActive } from './nav-types'
import { Palette } from './palette'
import { Shortcuts } from './shortcuts'

/**
 * The working area: a solid sidebar with the whole menu in plain view, a slim bar across the top, and the page.
 * Square, flat and quiet. On phones the sidebar becomes a tab bar along the bottom.
 */
/** A link that may leave this address (the owner dashboard and the public site are different addresses). */
function Go({ href, children, ...rest }: { href: string; children: React.ReactNode } & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>) {
  return href.startsWith('http') ? (
    <a href={href} {...rest}>
      {children}
    </a>
  ) : (
    <TransitionLink href={href} {...rest}>
      {children}
    </TransitionLink>
  )
}

export function DashShell({ area, items, children }: { area: string; items: AppNavItem[]; children: React.ReactNode }) {
  const pathname = usePathname()
  const { user } = useNavUser()
  const { phase } = useTransitions()
  const reduced = useReducedMotion()
  const shortcuts = useFeature('dash-shortcuts')
  const [palette, setPalette] = useState(false)
  const [more, setMore] = useState(false)
  const signedIn = user?.signedIn ? user : null
  // the owner dashboard holds the admin and developer pages; its "back" goes to the public site, which is a different address
  const staffArea = area === 'Owner' || area === 'Admin' || area === 'Dev'
  const showOwner = Boolean(signedIn?.isAdmin || signedIn?.isDev) && !staffArea
  const siteHref = staffArea ? SITE_URL_FOR_STAFF : '/'
  const ownerHref = OWNER_URL ? `${OWNER_URL}/` : '/owner'
  const current = useMemo(() => [...items].reverse().find((it) => isActive(pathname, it)) ?? items[0], [items, pathname])
  const logout = () => signOut({ callbackUrl: '/' })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPalette((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  useEffect(() => setMore(false), [pathname])

  const name = signedIn?.profile.displayName ?? ''
  const initial = (name || signedIn?.profile.handle || '?').slice(0, 1).toUpperCase()
  const bottom = items.slice(0, 4)

  return (
    <div className="relative z-10 min-h-dvh md:pl-[248px]">
      {/* ---------- sidebar (larger screens) ---------- */}
      <aside aria-label={`${area} navigation`} className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r border-line bg-black/45 backdrop-blur-2xl md:flex">
        <div className="flex h-[72px] shrink-0 items-center border-b border-line px-6">
          <Go href={siteHref} aria-label="logoless home">
            <Logo className="h-9 md:h-9" />
          </Go>
        </div>
        <p className="px-6 pt-7 pb-3 text-[13px] text-paper/40">{area}</p>
        <nav className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-3 pb-4">
          <ul className="grid gap-0.5">
            {items.map((it, n) => {
              const active = isActive(pathname, it)
              const heading = it.section && it.section !== items[n - 1]?.section
              return (
                <li key={it.href}>
                  {heading && <p className="px-3 pt-5 pb-1.5 text-[12px] text-paper/35">{it.section}</p>}
                  <TransitionLink href={it.href} aria-current={active ? 'page' : undefined} className={cn('group relative flex h-10 items-center gap-3 rounded-xl px-3 text-[15px] transition-colors', active ? 'bg-paper text-ink' : 'text-paper/55 hover:bg-white/[0.06] hover:text-paper')}>
                    <Icon name={it.icon} aria-hidden="true" className="size-[18px] shrink-0" />
                    <span>{it.label}</span>
                  </TransitionLink>
                </li>
              )
            })}
          </ul>
        </nav>
        <div className="shrink-0 border-t border-line p-3">
          {showOwner && (
            <Go href={ownerHref} className="flex h-10 items-center gap-3 rounded-xl px-3 text-[15px] text-paper/55 transition-colors hover:bg-white/[0.03] hover:text-paper">
              <ShieldCheck aria-hidden="true" className="size-[18px]" /> Owner dashboard
            </Go>
          )}
          <Go href={siteHref} className="flex h-10 items-center gap-3 rounded-xl px-3 text-[15px] text-paper/55 transition-colors hover:bg-white/[0.03] hover:text-paper">
            <ArrowUpRight aria-hidden="true" className="size-[18px]" /> Back to the site
          </Go>
        </div>
        {signedIn && (
          <div className="shrink-0 p-3">
            <div className="flex items-center gap-3 rounded-2xl border border-line bg-white/[0.03] p-3">
              <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full border border-line-strong bg-white/[0.05] text-sm">
                {signedIn.profile.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={signedIn.profile.avatar} alt="" className="size-full object-cover" />
                ) : (
                  initial
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] leading-tight">{name || 'You'}</span>
                <span className="block truncate text-[13px] text-paper/45">@{signedIn.profile.handle}</span>
              </span>
              <button type="button" onClick={logout} aria-label="Log out" title="Log out" className="grid size-9 shrink-0 place-items-center rounded-full text-paper/50 transition-colors hover:bg-white/[0.07] hover:text-paper">
                <LogOut aria-hidden="true" className="size-4" />
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* ---------- top bar ---------- */}
      <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-line bg-ink/75 px-5 backdrop-blur-xl md:px-10">
        <div className="flex items-center gap-4">
          <Go href={siteHref} aria-label="logoless home" className="md:hidden">
            <Logo className="h-8" />
          </Go>
          <p className="hidden items-center gap-2 text-[15px] text-paper/45 md:flex">
            <span>{area}</span>
            <span aria-hidden="true">/</span>
            <span className="text-paper">{current.label}</span>
          </p>
        </div>
        <button type="button" onClick={() => setPalette(true)} className="mx-6 hidden h-11 w-full max-w-md items-center gap-3 rounded-full border border-line bg-white/[0.03] px-5 text-left text-[15px] text-paper/45 transition-colors hover:border-line-strong hover:text-paper md:flex">
          <Search aria-hidden="true" className="size-4" />
          <span className="flex-1">Search or jump to a page</span>
          <kbd className="rounded-md border border-line px-1.5 py-0.5 font-mono text-[11px]">⌘K</kbd>
        </button>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setPalette(true)} aria-label="Jump to" className="grid size-10 place-items-center rounded-full border border-line text-paper/60 transition-colors hover:text-paper md:hidden">
            <Search aria-hidden="true" className="size-4" />
          </button>
          <NotificationBell />
        </div>
      </header>

      <main className="px-5 pt-10 pb-32 md:px-10 md:pt-14 md:pb-24">
        {/* only the page changes between pages: the sidebar and the bars stay exactly where they are.
            The old page dims while the next one loads, and the new one eases in from that same dim, so nothing ever flashes. */}
        <motion.div
          key={pathname}
          initial={reduced ? false : { opacity: 0.35, y: 8 }}
          animate={phase === 'exiting' ? { opacity: 0.35, y: 0 } : { opacity: 1, y: 0 }}
          transition={phase === 'exiting' ? { duration: 0.14, ease: 'easeOut' } : { duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-[1160px]"
        >
          {children}
        </motion.div>
      </main>

      {/* ---------- tab bar (phones) ---------- */}
      <nav aria-label={`${area} navigation`} className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-ink/95 backdrop-blur-xl md:hidden">
        {bottom.map((it) => {
          const active = isActive(pathname, it)
          return (
            <TransitionLink key={it.href} href={it.href} aria-current={active ? 'page' : undefined} className={cn('flex h-16 flex-1 flex-col items-center justify-center gap-1 text-[11px] transition-colors', active ? 'text-paper' : 'text-paper/45')}>
              <Icon name={it.icon} aria-hidden="true" className="size-5" />
              <span className="max-w-full truncate px-1">{it.label}</span>
            </TransitionLink>
          )
        })}
        <button type="button" aria-label="More" aria-expanded={more} onClick={() => setMore((v) => !v)} className={cn('flex h-16 flex-1 flex-col items-center justify-center gap-1 text-[11px] transition-colors', more ? 'text-paper' : 'text-paper/45')}>
          <Ellipsis aria-hidden="true" className="size-5" />
          More
        </button>
      </nav>

      <AnimatePresence>
        {more && (
          <motion.div key="more" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="fixed inset-0 z-50 flex flex-col bg-ink/90 backdrop-blur-2xl md:hidden">
            <div className="flex h-[72px] shrink-0 items-center justify-between border-b border-line px-5">
              <p className="text-[15px] text-paper/45">{area}</p>
              <button type="button" aria-label="Close" onClick={() => setMore(false)} className="grid size-10 place-items-center rounded-full border border-line text-paper/70">
                <X aria-hidden="true" className="size-4" />
              </button>
            </div>
            <ul className="no-scrollbar flex-1 overflow-y-auto px-5 py-4">
              {items.map((it) => (
                <li key={it.href} className="border-b border-line">
                  <TransitionLink href={it.href} onClick={() => setMore(false)} className={cn('flex h-14 items-center gap-4 text-lg', isActive(pathname, it) ? 'text-paper' : 'text-paper/60')}>
                    <Icon name={it.icon} aria-hidden="true" className="size-5" />
                    <span>{it.label}</span>
                  </TransitionLink>
                </li>
              ))}
              {showOwner && (
                <li className="border-b border-line">
                  <Go href={ownerHref} onClick={() => setMore(false)} className="flex h-14 items-center gap-4 text-lg text-paper/60">
                    <ShieldCheck aria-hidden="true" className="size-5" /> Owner dashboard
                  </Go>
                </li>
              )}
              <li className="border-b border-line">
                <Go href={siteHref} onClick={() => setMore(false)} className="flex h-14 items-center gap-4 text-lg text-paper/60">
                  <ArrowUpRight aria-hidden="true" className="size-5" /> Back to the site
                </Go>
              </li>
              <li>
                <button type="button" onClick={logout} className="flex h-14 w-full items-center gap-4 text-left text-lg text-paper/60">
                  <LogOut aria-hidden="true" className="size-5" /> Log out
                </button>
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      {shortcuts && <Shortcuts items={items} area={area} />}
      <Palette open={palette} onClose={() => setPalette(false)} items={items} area={area} onLogout={logout} />
    </div>
  )
}
