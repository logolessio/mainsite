'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowUpRight, Ellipsis, LogOut, Plus, Search, ShieldCheck, X } from 'lucide-react'
import { signOut } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '@/components/icons'
import { Logo } from '@/components/logo'
import { useFeature } from '@/components/shell/features-provider'
import { useNavUser } from '@/components/shell/nav-user'
import { NotificationBell } from '@/components/shell/notifications'
import { TransitionLink } from '@/components/shell/transition-link'
import { useTransitions } from '@/components/shell/transition-provider'
import { SPRING_GLIDE } from '@/lib/layout'
import { OWNER_URL, SITE_URL_FOR_STAFF } from '@/lib/staff-nav'
import { cn } from '@/lib/utils'
import { type AppNavItem, isActive } from './nav-types'
import { Palette } from './palette'
import { PRIMARY, Shortcuts } from './shortcuts'
import { useNavCounts } from './use-nav-counts'
import type { NavCounts } from '@/lib/nav-counts'

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

/** What is waiting on you, beside a menu item: a number, or a dot when there is simply something to do. It lights up with its item. */
function Badge({ c, lit }: { c?: NavCounts[string]; lit?: boolean }) {
  if (!c || (!c.n && !c.dot)) return null
  return c.n ? (
    <span aria-label={`${c.n} waiting`} className={cn('relative ml-auto grid h-5 min-w-5 place-items-center rounded-full border px-1.5 text-[11px] tabular-nums transition-colors duration-300', lit ? 'border-cyan-300/60 text-cyan-200' : 'border-white/20 text-paper/55')}>
      {c.n > 99 ? '99+' : c.n}
    </span>
  ) : (
    <span aria-label="Something to do" className={cn('relative ml-auto size-2 rounded-full transition-colors duration-300', lit ? 'bg-cyan-300' : 'bg-emerald-400')} />
  )
}

/**
 * One sidebar item. Its soft pill fades in when the pointer arrives and fades out a little slower when it leaves, so the highlight
 * seems to trail the pointer from one item to the next. When the pointer is away, the pill rests on the page you are on.
 */
function SideLink({ it, n, active, lit, c, hint, onEnter }: { it: AppNavItem; n: number; active: boolean; lit: boolean; c?: NavCounts[string]; hint: boolean; onEnter: () => void }) {
  return (
    <TransitionLink
      href={it.href}
      aria-current={active ? 'page' : undefined}
      onPointerEnter={(e) => e.pointerType !== 'touch' && onEnter()}
      onFocus={onEnter}
      className={cn('group relative flex h-10 items-center gap-3 rounded-full px-4 text-[15px] transition-colors duration-[450ms]', lit ? 'text-paper duration-[250ms]' : active ? 'text-paper/75' : 'text-paper/50')}
    >
      <motion.span aria-hidden="true" initial={false} animate={{ opacity: lit ? 1 : 0, scale: lit ? 1 : 0.97 }} transition={{ duration: lit ? 0.28 : 0.45, ease: [0.22, 1, 0.36, 1] }} className="pointer-events-none absolute inset-0 rounded-full bg-white/[0.07]" />
      <motion.span aria-hidden="true" initial={false} animate={{ opacity: lit ? 1 : 0 }} transition={{ duration: lit ? 0.34 : 0.45, delay: lit ? 0.07 : 0, ease: 'easeOut' }} className="pointer-events-none absolute inset-0 rounded-full border border-white/[0.14]" />
      <Icon name={it.icon} aria-hidden="true" className="relative size-[18px] shrink-0" />
      <span className="relative">{it.label}</span>
      <Badge c={c} lit={lit} />
      {hint && n < 9 && !c && <kbd aria-hidden="true" className="relative ml-auto rounded border border-line px-1 font-mono text-[10px] text-paper/40 opacity-0 transition-opacity group-hover:opacity-100">g {n + 1}</kbd>}
    </TransitionLink>
  )
}

const RECENT_KEY = (area: string) => `ll:recent:${area}`

export function DashShell({ area, items, children }: { area: string; items: AppNavItem[]; children: React.ReactNode }) {
  const pathname = usePathname()
  const { user } = useNavUser()
  const { phase } = useTransitions()
  const reduced = useReducedMotion()
  const shortcuts = useFeature('dash-shortcuts')
  const [palette, setPalette] = useState(false)
  const [help, setHelp] = useState(false)
  const [more, setMore] = useState(false)
  const [recents, setRecents] = useState<string[]>([])
  const [hot, setHot] = useState<string | null>(null) // the sidebar item the pointer (or the keyboard) is on
  const [lifted, setLifted] = useState(false) // the page has scrolled under the top bar
  const top = useRef<HTMLSpanElement>(null)
  const signedIn = user?.signedIn ? user : null
  // the owner dashboard holds the admin and developer pages; its "back" goes to the public site, which is a different address
  const staffArea = area === 'Owner' || area === 'Admin' || area === 'Dev'
  const showOwner = Boolean(signedIn?.isAdmin || signedIn?.isDev) && !staffArea
  const siteHref = staffArea ? SITE_URL_FOR_STAFF : '/'
  const ownerHref = OWNER_URL ? `${OWNER_URL}/` : '/owner'
  const current = useMemo(() => [...items].reverse().find((it) => isActive(pathname, it)) ?? items[0], [items, pathname])
  const logout = () => signOut({ callbackUrl: '/' })
  const counts = useNavCounts(area, pathname, Boolean(signedIn))
  const primary = PRIMARY[area]
  const openSearch = useCallback(() => setPalette(true), [])

  useEffect(() => {
    const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPalette((v) => !v)
      } else if (e.key === '/' && !shortcuts && !e.metaKey && !e.ctrlKey && !e.altKey && !typing(e.target)) {
        // with the shortcuts switched off, "/" still opens search: it is the one every site has
        e.preventDefault()
        setPalette(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [shortcuts])
  useEffect(() => setMore(false), [pathname])
  useEffect(() => {
    const el = top.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([e]) => setLifted(!e.isIntersecting), { rootMargin: '-8px 0px 0px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // where you were last, so the search box can offer it first
  useEffect(() => {
    try {
      const raw = JSON.parse(window.localStorage.getItem(RECENT_KEY(area)) ?? '[]') as unknown
      const before = Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string') : []
      setRecents(before.filter((h) => h !== current.href))
      window.localStorage.setItem(RECENT_KEY(area), JSON.stringify([current.href, ...before.filter((h) => h !== current.href)].slice(0, 6)))
    } catch {
      /* private window: no recents, nothing breaks */
    }
  }, [area, current.href])

  const name = signedIn?.profile.displayName ?? ''
  const initial = (name || signedIn?.profile.handle || '?').slice(0, 1).toUpperCase()
  const bottom = items.slice(0, 4)

  return (
    <div className="relative z-10 min-h-dvh md:pl-[248px]">
      {/* ---------- sidebar (larger screens) ---------- */}
      <aside aria-label={`${area} navigation`} className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r border-line bg-black/80 md:flex">
        <div className="flex h-[72px] shrink-0 items-center border-b border-line px-6">
          <Go href={siteHref} aria-label="logoless home">
            <Logo className="h-9 md:h-9" />
          </Go>
        </div>
        <p className="px-6 pt-7 pb-3 text-[13px] text-paper/40">{area}</p>
        <nav className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-3 pb-4">
          <ul className="grid gap-0.5" onPointerLeave={() => setHot(null)} onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node | null) && setHot(null)}>
            {items.map((it, n) => {
              const active = isActive(pathname, it)
              const heading = it.section && it.section !== items[n - 1]?.section
              const lit = (hot ?? current.href) === it.href
              return (
                <li key={it.href}>
                  {heading && <p className="px-4 pt-5 pb-1.5 text-[12px] text-paper/35">{it.section}</p>}
                  <SideLink it={it} n={n} active={active} lit={lit} c={counts[it.href]} hint={shortcuts} onEnter={() => setHot(it.href)} />
                </li>
              )
            })}
          </ul>
        </nav>
        <div className="shrink-0 border-t border-line p-3">
          {showOwner && (
            <Go href={ownerHref} className="flex h-10 items-center gap-3 rounded-full px-4 text-[15px] text-paper/50 transition-colors duration-[450ms] hover:bg-white/[0.07] hover:text-paper hover:duration-[250ms]">
              <ShieldCheck aria-hidden="true" className="size-[18px]" /> Owner dashboard
            </Go>
          )}
          <Go href={siteHref} className="flex h-10 items-center gap-3 rounded-full px-4 text-[15px] text-paper/50 transition-colors duration-[450ms] hover:bg-white/[0.07] hover:text-paper hover:duration-[250ms]">
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
      <span ref={top} aria-hidden="true" className="pointer-events-none absolute top-0 left-0 h-px w-px" />
      <header className={cn('sticky top-0 z-30 flex h-[72px] items-center justify-between border-b bg-ink/90 px-5 transition-[box-shadow,border-color] duration-300 md:px-10', lifted ? 'border-line-strong shadow-[0_14px_30px_-18px_rgb(0_0_0/0.9)]' : 'border-line')}>
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
          <span className="flex-1">Search, or do something</span>
          <kbd className="rounded-md border border-line px-1.5 py-0.5 font-mono text-[11px]">/</kbd>
        </button>
        <div className="flex items-center gap-2">
          {primary && (
            <TransitionLink href={primary.href} aria-label={primary.label} className="hidden h-10 items-center gap-2 rounded-full bg-paper px-5 text-[15px] font-medium text-ink transition-colors hover:bg-paper/85 md:inline-flex">
              <Plus aria-hidden="true" className="size-4" /> {primary.label}
            </TransitionLink>
          )}
          <button type="button" onClick={() => setPalette(true)} aria-label="Search or jump" className="grid size-10 place-items-center rounded-full border border-line text-paper/60 transition-colors hover:text-paper md:hidden">
            <Search aria-hidden="true" className="size-4" />
          </button>
          {primary && (
            <TransitionLink href={primary.href} aria-label={primary.label} className="grid size-10 place-items-center rounded-full bg-paper text-ink md:hidden">
              <Plus aria-hidden="true" className="size-4" />
            </TransitionLink>
          )}
          <NotificationBell />
        </div>
      </header>

      <main tabIndex={-1} className="px-5 pt-10 pb-32 md:px-10 md:pt-14 md:pb-24">
        <p aria-live="polite" role="status" className="sr-only">{current.label}</p>
        {/* only the page changes between pages: the sidebar and the bars stay exactly where they are.
            The old page dims while the next one loads, and the new one eases in from that same dim, so nothing ever flashes. */}
        <motion.div
          key={pathname}
          initial={reduced || (typeof document !== 'undefined' && document.documentElement.dataset.vtPage === '1') ? false : { opacity: 0.35, y: 8 }}
          animate={phase === 'exiting' ? { opacity: 0.35, y: 0 } : { opacity: 1, y: 0 }}
          transition={phase === 'exiting' ? { duration: 0.14, ease: 'easeOut' } : { duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="page-root mx-auto max-w-[1160px]"
        >
          {children}
        </motion.div>
      </main>

      {/* ---------- tab bar (phones) ---------- */}
      <nav aria-label={`${area} navigation`} className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-ink/95 md:hidden">
        {bottom.map((it) => {
          const active = isActive(pathname, it)
          return (
            <TransitionLink key={it.href} href={it.href} aria-current={active ? 'page' : undefined} className={cn('flex h-16 flex-1 flex-col items-center justify-center gap-1 text-[11px] transition-colors', active ? 'text-paper' : 'text-paper/45')}>
              <span className="relative">
                {active && <motion.span layoutId="tab-marker" aria-hidden="true" transition={SPRING_GLIDE} className="absolute -top-[13px] left-1/2 h-[3px] w-8 -translate-x-1/2 rounded-full bg-paper" />}
                <Icon name={it.icon} aria-hidden="true" className="size-5" />
                {(counts[it.href]?.n || counts[it.href]?.dot) && <span aria-hidden="true" className="absolute -top-1 -right-2 grid h-4 min-w-4 place-items-center rounded-full bg-paper px-1 text-[10px] font-medium text-ink">{counts[it.href]?.n ? (counts[it.href]!.n! > 9 ? '9+' : counts[it.href]!.n) : ''}</span>}
              </span>
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
                    <Badge c={counts[it.href]} />
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

      {shortcuts && <Shortcuts items={items} area={area} help={help} setHelp={setHelp} openSearch={openSearch} />}
      <Palette open={palette} onClose={() => setPalette(false)} items={items} area={area} onLogout={logout} recents={recents} handle={signedIn?.profile.handle} onHelp={() => (setPalette(false), setHelp(true))} />
    </div>
  )
}
