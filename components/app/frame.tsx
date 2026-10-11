'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowUpRight, CornerDownLeft, Ellipsis, LogOut, Search, X } from 'lucide-react'
import { signOut } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Icon, type IconName } from '@/components/icons'
import { Logo } from '@/components/logo'
import { NotificationBell } from '@/components/shell/notifications'
import { TransitionLink } from '@/components/shell/transition-link'
import { useTransitions } from '@/components/shell/transition-provider'
import { EASE_OUT } from '@/lib/layout'
import { cn } from '@/lib/utils'

export type AppNavItem = { label: string; href: string; icon: IconName; exact?: boolean }

const SPRING = { type: 'spring' as const, stiffness: 420, damping: 34, mass: 0.8 }
const isActive = (pathname: string, it: AppNavItem) => (it.exact ? pathname === it.href : pathname === it.href || pathname.startsWith(`${it.href}/`))

/**
 * The shell around every working area (clipper, brand, admin): a quiet top bar, the page, and a floating
 * liquid-glass pill along the bottom that holds the navigation. ⌘K opens a jump-to box.
 */
export function AppFrame({ area, items, children }: { area: string; items: AppNavItem[]; children: React.ReactNode }) {
  const pathname = usePathname()
  const reduced = useReducedMotion()
  const [palette, setPalette] = useState(false)
  const [more, setMore] = useState(false)

  const current = useMemo(() => [...items].reverse().find((it) => isActive(pathname, it)) ?? items[0], [items, pathname])

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

  const logout = () => signOut({ callbackUrl: '/' })
  const phoneItem = (i: number) => (i >= 4 ? 'hidden' : 'flex')
  const [panelOpen, setPanelOpen] = useState(false)
  const edge = useRef<HTMLDivElement>(null)
  const panel = useRef<HTMLElement>(null)
  const inside = (el: HTMLElement | null, t: EventTarget | null) => Boolean(el && t instanceof Node && el.contains(t))

  return (
    <div className="relative z-10 min-h-dvh">
      {/* ---------- top bar ---------- */}
      <header className="sticky top-0 z-30 flex h-[88px] items-center justify-between bg-gradient-to-b from-ink from-55% to-transparent px-5 pb-3 md:px-10">
        <div className="flex items-center gap-4">
          <TransitionLink href="/" aria-label="logoless home" className="shrink-0">
            <Logo className="h-10 md:h-11" />
          </TransitionLink>
          <span aria-hidden="true" className="hidden h-5 w-px bg-line-strong md:block" />
          <div className="hidden items-center gap-2 text-sm text-mute md:flex">
            <span>{area}</span>
            <span aria-hidden="true">/</span>
            <AnimatePresence mode="wait" initial={false}>
              <motion.span key={current.label} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }} className="text-paper">
                {current.label}
              </motion.span>
            </AnimatePresence>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <button type="button" onClick={() => setPalette(true)} aria-label="Jump to…" className="glass-liquid flex h-10 items-center gap-3 rounded-full pr-2 pl-4 text-sm text-mute transition-colors hover:text-paper max-md:size-10 max-md:justify-center max-md:p-0">
            <Search aria-hidden="true" className="size-4" />
            <span className="hidden md:inline">Jump to…</span>
            <kbd className="hidden rounded-full bg-white/[0.08] px-2.5 py-1 font-mono text-[11px] md:inline">⌘K</kbd>
          </button>
          <NotificationBell />
        </div>
      </header>

      <main className="px-5 pt-4 pb-40 md:pr-10 md:pb-16 md:pl-[108px] md:pt-6">
        <div className="mx-auto max-w-[1160px]">{children}</div>
      </main>

      {/* ---------- the floating glass pill ---------- */}
      <nav aria-label={`${area} navigation`} className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-3 md:hidden">
        <motion.div layout transition={reduced ? { duration: 0 } : SPRING} initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="pointer-events-auto relative isolate flex max-w-full items-center gap-0.5 rounded-full p-1.5">
          <span aria-hidden="true" className="glass-liquid pointer-events-none absolute inset-0 -z-10 rounded-full shadow-[0_24px_60px_-18px_rgb(0_0_0/0.95)] backdrop-blur-xl backdrop-saturate-150" />
          {items.map((it, i) => {
            const active = isActive(pathname, it)
            return (
              <TransitionLink key={it.href} href={it.href} aria-label={it.label} aria-current={active ? 'page' : undefined} className={cn('group relative h-11 items-center rounded-full px-3.5 transition-transform duration-300 hover:scale-110 active:scale-95', phoneItem(i))}>
                {active && <motion.span layoutId={`${area}-dock-pill`} transition={SPRING} className="absolute inset-0 rounded-full bg-white/[0.16] shadow-[inset_0_1px_0_rgb(255_255_255/0.25)]" />}
                <Icon name={it.icon} aria-hidden="true" className={cn('relative size-5 shrink-0 transition-colors', active ? 'text-paper' : 'text-mute group-hover:text-paper')} />
                <AnimatePresence initial={false}>
                  {active && (
                    <motion.span initial={{ width: 0, opacity: 0 }} animate={{ width: 'auto', opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.28, ease: EASE_OUT }} className="relative overflow-hidden pl-2 text-sm whitespace-nowrap text-paper">
                      {it.label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {!active && (
                  <span className="glass-liquid pointer-events-none absolute bottom-full left-1/2 mb-3 -translate-x-1/2 translate-y-1 rounded-full px-3 py-1.5 text-xs whitespace-nowrap text-paper opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100">{it.label}</span>
                )}
              </TransitionLink>
            )
          })}
          <span aria-hidden="true" className="mx-1 h-6 w-px shrink-0 bg-line-strong" />
          <button type="button" aria-label="More" aria-expanded={more} onClick={() => setMore((v) => !v)} className={cn('relative grid h-11 w-11 place-items-center rounded-full transition-transform duration-300 hover:scale-110 active:scale-95', more ? 'bg-white/[0.16] text-paper' : 'text-mute hover:text-paper')}>
            <Ellipsis className="size-5" />
          </button>
        </motion.div>
      </nav>


      {/* ---------- the slide-out glass panel (larger screens) ---------- */}
      <AnimatePresence>
        {panelOpen && <motion.div key="scrim" aria-hidden="true" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="pointer-events-none fixed inset-0 z-30 hidden bg-black/45 md:block" />}
      </AnimatePresence>
      {/* an invisible strip along the screen edge: pushing the cursor all the way left opens the panel */}
      <div
        ref={edge}
        aria-hidden="true"
        onMouseEnter={() => setPanelOpen(true)}
        onMouseLeave={(e) => !inside(panel.current, e.relatedTarget) && setPanelOpen(false)}
        className="fixed top-[84px] bottom-0 left-0 z-[39] hidden w-5 md:block"
      />
      <motion.aside
        ref={panel}
        aria-label={`${area} navigation`}
        initial={false}
        animate={{ width: panelOpen ? 264 : 72 }}
        transition={reduced ? { duration: 0 } : SPRING}
        onMouseEnter={() => setPanelOpen(true)}
        onMouseLeave={(e) => !inside(edge.current, e.relatedTarget) && setPanelOpen(false)}
        onFocusCapture={() => setPanelOpen(true)}
        onBlurCapture={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPanelOpen(false)
        }}
        className="glass-liquid fixed top-[84px] bottom-4 left-3 z-40 hidden flex-col rounded-[2rem] border-paper/30 p-2.5 shadow-[0_0_0_1px_rgb(0_0_0/0.9),0_0_0_2px_rgb(243_242_238/0.07),24px_0_70px_-18px_rgb(0_0_0/0.95)] backdrop-blur-xl backdrop-saturate-150 md:flex"
      >
        <motion.p animate={{ opacity: panelOpen ? 1 : 0, height: panelOpen ? 36 : 0 }} transition={{ duration: 0.2 }} className="overflow-hidden px-4 pt-3 text-[11px] font-medium tracking-[0.16em] whitespace-nowrap text-mute uppercase">
          {area}
        </motion.p>
        <nav className="my-auto flex max-h-full flex-col gap-0.5 overflow-x-hidden overflow-y-auto py-2">
          {items.map((it) => {
            const active = isActive(pathname, it)
            return (
              <TransitionLink key={it.href} href={it.href} aria-label={it.label} aria-current={active ? 'page' : undefined} className="group relative flex h-11 shrink-0 items-center rounded-full pl-[14px] text-[15px] whitespace-nowrap">
                {active && <motion.span layoutId={`${area}-panel-pill`} transition={SPRING} className="absolute inset-0 rounded-full bg-white/[0.16] shadow-[inset_0_1px_0_rgb(255_255_255/0.25)]" />}
                <span className="absolute inset-0 rounded-full bg-white/0 transition-colors group-hover:bg-white/[0.06]" />
                <Icon name={it.icon} aria-hidden="true" className={cn('relative size-5 shrink-0 transition-all duration-300 group-hover:scale-110', active ? 'text-paper' : 'text-mute group-hover:text-paper')} />
                <motion.span animate={{ opacity: panelOpen ? 1 : 0, x: panelOpen ? 0 : -10 }} transition={{ duration: 0.22, delay: panelOpen ? 0.05 : 0 }} className={cn('relative ml-4', active ? 'text-paper' : 'text-mute group-hover:text-paper')}>
                  {it.label}
                </motion.span>
              </TransitionLink>
            )
          })}
        </nav>
        <span aria-hidden="true" className="mx-3 my-2 h-px shrink-0 bg-line-strong" />
        <button type="button" aria-label="Jump to…" onClick={() => setPalette(true)} className="group relative flex h-11 shrink-0 items-center rounded-full pl-[14px] text-left text-[15px] whitespace-nowrap text-mute transition-colors hover:bg-white/[0.06] hover:text-paper">
          <Search aria-hidden="true" className="size-5 shrink-0" />
          <motion.span animate={{ opacity: panelOpen ? 1 : 0, x: panelOpen ? 0 : -10 }} transition={{ duration: 0.22 }} className="ml-4 flex flex-1 items-center justify-between pr-3">
            Jump to…
            <kbd className="rounded-full bg-white/[0.08] px-2 py-0.5 font-mono text-[11px]">⌘K</kbd>
          </motion.span>
        </button>
        <button type="button" aria-label="More" aria-expanded={more} onClick={() => setMore((v) => !v)} className={cn('group relative flex h-11 shrink-0 items-center rounded-full pl-[14px] text-left text-[15px] whitespace-nowrap transition-colors hover:bg-white/[0.06] hover:text-paper', more ? 'bg-white/[0.12] text-paper' : 'text-mute')}>
          <Ellipsis aria-hidden="true" className="size-5 shrink-0" />
          <motion.span animate={{ opacity: panelOpen ? 1 : 0, x: panelOpen ? 0 : -10 }} transition={{ duration: 0.22 }} className="ml-4">
            Account
          </motion.span>
        </button>
      </motion.aside>

      <AnimatePresence>
        {more && (
          <>
            <motion.div key="more-bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} onClick={() => setMore(false)} className="fixed inset-0 z-40 bg-black/40" />
            <motion.div
              key="more"
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              transition={{ duration: 0.28, ease: EASE_OUT }}
              className="glass-liquid fixed bottom-24 left-1/2 z-50 w-[min(24rem,calc(100vw-1.5rem))] -translate-x-1/2 rounded-[2rem] p-3 backdrop-blur-xl md:top-1/2 md:bottom-auto md:left-[96px] md:w-72 md:translate-x-0 md:-translate-y-1/2"
            >
              {items.length > 4 && (
                <div className="mb-2 grid grid-cols-3 gap-2 md:hidden">
                  {items.slice(4).map((it) => (
                    <TransitionLink key={it.href} href={it.href} onClick={() => setMore(false)} className={cn('flex flex-col items-center gap-2 rounded-2xl px-2 py-4 text-center text-xs', isActive(pathname, it) ? 'bg-white/[0.14] text-paper' : 'bg-white/[0.05] text-mute')}>
                      <Icon name={it.icon} aria-hidden="true" className="size-5" />
                      {it.label}
                    </TransitionLink>
                  ))}
                </div>
              )}
              <div className="grid gap-1 text-[15px]">
                <TransitionLink href="/" onClick={() => setMore(false)} className="flex h-12 items-center gap-3 rounded-2xl px-4 text-mute transition-colors hover:bg-white/[0.07] hover:text-paper">
                  <ArrowUpRight aria-hidden="true" className="size-5" /> Back to site
                </TransitionLink>
                <button type="button" onClick={logout} className="flex h-12 items-center gap-3 rounded-2xl px-4 text-left text-mute transition-colors hover:bg-white/[0.07] hover:text-paper">
                  <LogOut aria-hidden="true" className="size-5" /> Log out
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <Palette open={palette} onClose={() => setPalette(false)} items={items} area={area} onLogout={logout} />
    </div>
  )
}

/** ⌘K: type to filter, arrows to move, Enter to go. */
function Palette({ open, onClose, items, area, onLogout }: { open: boolean; onClose: () => void; items: AppNavItem[]; area: string; onLogout: () => void }) {
  const { navigate } = useTransitions()
  const [q, setQ] = useState('')
  const [i, setI] = useState(0)
  const input = useRef<HTMLInputElement>(null)

  const rows = useMemo(() => {
    const all = [
      ...items.map((it) => ({ key: it.href, label: it.label, icon: it.icon as IconName | null, hint: area, run: () => navigate(it.href) })),
      { key: 'site', label: 'Back to the site', icon: null as IconName | null, hint: 'Go', run: () => navigate('/') },
      { key: 'out', label: 'Log out', icon: null as IconName | null, hint: 'Account', run: onLogout },
    ]
    const t = q.trim().toLowerCase()
    return t ? all.filter((r) => r.label.toLowerCase().includes(t)) : all
  }, [items, q, area, navigate, onLogout])

  useEffect(() => {
    if (open) {
      setQ('')
      setI(0)
      window.setTimeout(() => input.current?.focus(), 30)
    }
  }, [open])
  useEffect(() => setI(0), [q])

  const go = useCallback(
    (idx: number) => {
      const r = rows[idx]
      if (!r) return
      onClose()
      r.run()
    },
    [rows, onClose],
  )

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
    else if (e.key === 'ArrowDown') (e.preventDefault(), setI((n) => Math.min(rows.length - 1, n + 1)))
    else if (e.key === 'ArrowUp') (e.preventDefault(), setI((n) => Math.max(0, n - 1)))
    else if (e.key === 'Enter') (e.preventDefault(), go(i))
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div key="p" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="fixed inset-0 z-[70] flex items-start justify-center bg-black/55 px-4 pt-[16vh]" onMouseDown={onClose}>
          <motion.div
            role="dialog"
            aria-label="Jump to"
            initial={{ opacity: 0, y: -14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.25, ease: EASE_OUT }}
            onMouseDown={(e) => e.stopPropagation()}
            onKeyDown={onKey}
            className="glass-liquid w-full max-w-lg rounded-[2rem] backdrop-blur-xl shadow-[0_40px_100px_-20px_rgb(0_0_0/0.95)]"
          >
            <div className="flex items-center gap-3 border-b border-line px-5">
              <Search aria-hidden="true" className="size-5 text-mute" />
              <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Where to?" aria-label="Where to?" className="h-14 flex-1 bg-transparent text-base outline-none placeholder:text-mute" />
              <button type="button" aria-label="Close" onClick={onClose} className="grid size-8 place-items-center rounded-full text-mute hover:bg-white/10">
                <X className="size-4" />
              </button>
            </div>
            <ul role="listbox" className="max-h-[50vh] overflow-y-auto p-2">
              {rows.length === 0 && <li className="px-4 py-8 text-center text-sm text-mute">Nothing matches.</li>}
              {rows.map((r, idx) => (
                <li key={r.key} role="option" aria-selected={idx === i}>
                  <button type="button" onMouseMove={() => setI(idx)} onClick={() => go(idx)} className={cn('relative flex h-12 w-full items-center gap-3 rounded-2xl px-4 text-left text-[15px] transition-colors', idx === i ? 'text-paper' : 'text-mute')}>
                    {idx === i && <motion.span layoutId="palette-hl" transition={{ duration: 0.18, ease: EASE_OUT }} className="absolute inset-0 rounded-2xl bg-white/[0.1]" />}
                    <span className="relative grid size-5 place-items-center">{r.icon ? <Icon name={r.icon} aria-hidden="true" className="size-[18px]" /> : <ArrowUpRight className="size-[18px]" />}</span>
                    <span className="relative flex-1">{r.label}</span>
                    <span className="relative text-xs text-mute">{r.hint}</span>
                    {idx === i && <CornerDownLeft aria-hidden="true" className="relative size-4 text-mute" />}
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
