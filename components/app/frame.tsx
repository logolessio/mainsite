'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowUpRight, CornerDownLeft, Ellipsis, LogOut, Search, X } from 'lucide-react'
import { signOut } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Icon, type IconName } from '@/components/icons'
import { Logo } from '@/components/logo'
import { TransitionLink } from '@/components/shell/transition-link'
import { useTransitions } from '@/components/shell/transition-provider'
import { EASE_OUT } from '@/lib/layout'
import { cn } from '@/lib/utils'

export type AppNavItem = { label: string; href: string; icon: IconName; exact?: boolean }

const RAIL = 84
const RAIL_OPEN = 268
const SPRING = { type: 'spring' as const, stiffness: 380, damping: 36, mass: 0.8 }

const isActive = (pathname: string, it: AppNavItem) => (it.exact ? pathname === it.href : pathname === it.href || pathname.startsWith(`${it.href}/`))

/**
 * The shell around every working area (clipper, brand, admin).
 *  - Desktop: a slim icon rail that opens on hover, with a sliding highlight, plus a top bar and a ⌘K jump-to palette.
 *  - Phones: a floating dock along the bottom, with a sheet for everything else.
 */
export function AppFrame({ area, items, children }: { area: string; items: AppNavItem[]; children: React.ReactNode }) {
  const pathname = usePathname()
  const reduced = useReducedMotion()
  const [open, setOpen] = useState(false) // rail expanded
  const [palette, setPalette] = useState(false)
  const [more, setMore] = useState(false)

  const current = useMemo(() => [...items].reverse().find((it) => isActive(pathname, it)) ?? items[0], [items, pathname])

  // ⌘K / Ctrl+K anywhere in a working area.
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

  return (
    <div className="relative z-10 min-h-dvh lg:pl-[84px]">
      {/* ---------- desktop rail ---------- */}
      <motion.aside
        aria-label={`${area} navigation`}
        initial={false}
        animate={{ width: open ? RAIL_OPEN : RAIL }}
        transition={reduced ? { duration: 0 } : SPRING}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocusCapture={() => setOpen(true)}
        onBlurCapture={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false)
        }}
        className={cn('fixed inset-y-0 left-0 z-40 hidden flex-col overflow-hidden border-r border-line bg-[#070708] transition-shadow duration-300 lg:flex', open && 'shadow-[28px_0_70px_-34px_rgb(0_0_0/0.95)]')}
      >
        <div className="relative h-20 shrink-0">
          <TransitionLink href="/" aria-label="logoless home" className="absolute inset-0 flex items-center">
            <motion.span
              aria-hidden="true"
              animate={{ opacity: open ? 0 : 1, scale: open ? 0.8 : 1 }}
              transition={{ duration: 0.2 }}
              className="absolute left-[20px] grid size-11 place-items-center rounded-2xl bg-paper text-2xl leading-none font-semibold text-ink italic"
            >
              l
            </motion.span>
            <motion.span animate={{ opacity: open ? 1 : 0, x: open ? 0 : -8 }} transition={{ duration: 0.25, delay: open ? 0.06 : 0 }} className="absolute left-6">
              <Logo className="h-8" />
            </motion.span>
          </TransitionLink>
        </div>

        <motion.p animate={{ opacity: open ? 1 : 0 }} transition={{ duration: 0.2 }} className="mb-2 h-4 px-7 text-[11px] font-medium tracking-[0.14em] whitespace-nowrap text-mute uppercase">
          {area}
        </motion.p>

        <nav className="flex flex-1 flex-col gap-1 px-3">
          {items.map((it) => {
            const active = isActive(pathname, it)
            return (
              <TransitionLink
                key={it.href}
                href={it.href}
                aria-current={active ? 'page' : undefined}
                aria-label={it.label}
                className={cn('group relative flex h-11 items-center rounded-xl pl-[15px] text-[15px] whitespace-nowrap transition-colors', active ? 'text-paper' : 'text-mute hover:text-paper')}
              >
                {active && (
                  <>
                    <motion.span layoutId={`${area}-rail-pill`} transition={SPRING} className="absolute inset-0 rounded-xl bg-white/[0.08]" />
                    <motion.span layoutId={`${area}-rail-bar`} transition={SPRING} className="absolute top-1/2 -left-3 h-5 w-[3px] -translate-y-1/2 rounded-full bg-paper" />
                  </>
                )}
                <span className="absolute inset-0 rounded-xl bg-white/0 transition-colors group-hover:bg-white/[0.04]" />
                <Icon name={it.icon} aria-hidden="true" className="relative size-5 shrink-0 transition-transform duration-300 group-hover:scale-110" />
                <motion.span animate={{ opacity: open ? 1 : 0, x: open ? 0 : -10 }} transition={{ duration: 0.22, delay: open ? 0.04 : 0 }} className="relative ml-4">
                  {it.label}
                </motion.span>
              </TransitionLink>
            )
          })}
        </nav>

        <div className="flex flex-col gap-1 border-t border-line p-3">
          <RailButton icon={<Search className="size-5" />} label="Jump to…" hint="⌘K" open={open} onClick={() => setPalette(true)} />
          <TransitionLink href="/" className="group relative flex h-11 items-center rounded-xl pl-[15px] text-[15px] whitespace-nowrap text-mute transition-colors hover:bg-white/[0.04] hover:text-paper">
            <ArrowUpRight aria-hidden="true" className="size-5 shrink-0" />
            <motion.span animate={{ opacity: open ? 1 : 0, x: open ? 0 : -10 }} transition={{ duration: 0.22 }} className="ml-4">
              Back to site
            </motion.span>
          </TransitionLink>
          <RailButton icon={<LogOut className="size-5" />} label="Log out" open={open} onClick={logout} />
        </div>
      </motion.aside>

      {/* ---------- phones: top bar ---------- */}
      <div className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-line bg-ink/95 px-5 lg:hidden">
        <TransitionLink href="/" aria-label="logoless home">
          <Logo className="h-7" />
        </TransitionLink>
        <button type="button" aria-label="Jump to…" onClick={() => setPalette(true)} className="grid size-10 place-items-center rounded-full bg-white/[0.06]">
          <Search className="size-[18px]" />
        </button>
      </div>

      <div className="min-w-0">
        {/* ---------- desktop top bar ---------- */}
        <div className="sticky top-0 z-30 hidden h-[72px] items-center justify-between px-10 lg:flex">
          <div className="flex items-center gap-2 text-sm text-mute">
            <span>{area}</span>
            <span aria-hidden="true">/</span>
            <AnimatePresence mode="wait" initial={false}>
              <motion.span key={current.label} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }} className="text-paper">
                {current.label}
              </motion.span>
            </AnimatePresence>
          </div>
          <button
            type="button"
            onClick={() => setPalette(true)}
            className="group flex h-10 items-center gap-3 rounded-full border border-line-strong bg-[#0a0a0b] pr-2 pl-4 text-sm text-mute transition-colors hover:border-paper/40 hover:text-paper"
          >
            <Search aria-hidden="true" className="size-4" />
            Jump to…
            <kbd className="rounded-full bg-white/[0.07] px-2.5 py-1 font-mono text-[11px] text-mute">⌘K</kbd>
          </button>
        </div>

        <main className="px-5 pt-6 pb-32 md:px-10 lg:pt-2 lg:pb-16">
          <div className="mx-auto max-w-[1160px]">{children}</div>
        </main>
      </div>

      {/* ---------- phones: floating dock ---------- */}
      <nav aria-label={`${area} dock`} className="fixed inset-x-4 bottom-4 z-40 flex justify-center lg:hidden">
        <div className="flex items-center gap-1 rounded-full border border-line-strong bg-[#0b0b0c]/95 p-1.5 shadow-[0_18px_50px_-12px_rgb(0_0_0/0.9)]">
          {items.slice(0, 4).map((it) => {
            const active = isActive(pathname, it)
            return (
              <TransitionLink key={it.href} href={it.href} aria-label={it.label} aria-current={active ? 'page' : undefined} className="relative flex h-11 items-center rounded-full px-3.5 text-paper">
                {active && <motion.span layoutId={`${area}-dock-pill`} transition={SPRING} className="absolute inset-0 rounded-full bg-white/[0.12]" />}
                <Icon name={it.icon} aria-hidden="true" className={cn('relative size-5 shrink-0', !active && 'text-mute')} />
                <AnimatePresence initial={false}>
                  {active && (
                    <motion.span initial={{ width: 0, opacity: 0 }} animate={{ width: 'auto', opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.25, ease: EASE_OUT }} className="relative overflow-hidden pl-2 text-sm whitespace-nowrap">
                      {it.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </TransitionLink>
            )
          })}
          <button type="button" aria-label="More" onClick={() => setMore(true)} className="grid h-11 w-11 place-items-center rounded-full text-mute">
            <Ellipsis className="size-5" />
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {more && (
          <>
            <motion.div key="m-bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMore(false)} className="fixed inset-0 z-50 bg-black/70 lg:hidden" />
            <motion.div
              key="m-sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.4, ease: EASE_OUT }}
              className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border-t border-line-strong bg-[#0b0b0c] p-5 pb-8 lg:hidden"
            >
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />
              <div className="grid grid-cols-3 gap-2">
                {items.map((it) => (
                  <TransitionLink key={it.href} href={it.href} onClick={() => setMore(false)} className={cn('flex flex-col items-center gap-2 rounded-2xl px-2 py-4 text-center text-xs', isActive(pathname, it) ? 'bg-white/[0.1] text-paper' : 'bg-white/[0.04] text-mute')}>
                    <Icon name={it.icon} aria-hidden="true" className="size-5" />
                    {it.label}
                  </TransitionLink>
                ))}
              </div>
              <div className="mt-4 flex gap-2 text-sm">
                <TransitionLink href="/" onClick={() => setMore(false)} className="flex h-11 flex-1 items-center justify-center rounded-full bg-white/[0.06]">
                  Back to site
                </TransitionLink>
                <button type="button" onClick={logout} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-white/[0.06]">
                  <LogOut className="size-4" /> Log out
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

function RailButton({ icon, label, hint, open, onClick }: { icon: React.ReactNode; label: string; hint?: string; open: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="group relative flex h-11 items-center rounded-xl pl-[15px] text-left text-[15px] whitespace-nowrap text-mute transition-colors hover:bg-white/[0.04] hover:text-paper">
      <span className="shrink-0">{icon}</span>
      <motion.span animate={{ opacity: open ? 1 : 0, x: open ? 0 : -10 }} transition={{ duration: 0.22 }} className="ml-4 flex flex-1 items-center justify-between pr-3">
        {label}
        {hint && <kbd className="rounded-full bg-white/[0.07] px-2 py-0.5 font-mono text-[11px]">{hint}</kbd>}
      </motion.span>
    </button>
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
        <motion.div key="p" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="fixed inset-0 z-[70] flex items-start justify-center bg-black/65 px-4 pt-[16vh]" onMouseDown={onClose}>
          <motion.div
            role="dialog"
            aria-label="Jump to"
            initial={{ opacity: 0, y: -14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.25, ease: EASE_OUT }}
            onMouseDown={(e) => e.stopPropagation()}
            onKeyDown={onKey}
            className="w-full max-w-lg overflow-hidden rounded-3xl border border-line-strong bg-[#0b0b0c] shadow-[0_40px_100px_-20px_rgb(0_0_0/0.95)]"
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
                  <button
                    type="button"
                    onMouseMove={() => setI(idx)}
                    onClick={() => go(idx)}
                    className={cn('relative flex h-12 w-full items-center gap-3 rounded-2xl px-4 text-left text-[15px] transition-colors', idx === i ? 'text-paper' : 'text-mute')}
                  >
                    {idx === i && <motion.span layoutId="palette-hl" transition={{ duration: 0.18, ease: EASE_OUT }} className="absolute inset-0 rounded-2xl bg-white/[0.08]" />}
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
