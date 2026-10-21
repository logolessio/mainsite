'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, CornerDownLeft, Keyboard, Search, X } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { isInvitePath } from '@/lib/invite-shared'
import { EASE_OUT } from '@/lib/layout'
import { NAV_LINKS } from '@/lib/site'
import { cn } from '@/lib/utils'
import { useDialog } from '@/hooks/use-dialog'
import { useFeature } from './features-provider'
import { useNavUser } from './nav-user'
import { useTransitions } from './transition-provider'
import { LiquidGlass } from '@/components/ui/liquid-glass'

type C = { id: string; title: string; creator: string; type: string; cover: string; rate: number }
type Row = { key: string; label: string; sub: string; group: 'Campaigns' | 'Pages'; href: string; cover?: string }
// The dashboards have their own jump-to box, so this one stays out of them.
const HIDDEN = ['/dashboard', '/brand', '/admin', '/owner', '/dev', '/onboarding', '/@', '/u/', '/links', '/launch']

/** ⌘K (or /) opens a search over every live campaign and page. ? lists the shortcuts. */
export function Spotlight() {
  const on = true // search is part of the site, not an optional feature
  const pathname = usePathname()
  const { navigate } = useTransitions()
  const { user } = useNavUser()
  const admin = Boolean(user?.signedIn && user.isAdmin) // admins have the Tools button in the same corner
  const reels = useFeature('reels')
  const board = useFeature('leaderboard')
  const status = useFeature('status-page')
  const feed = useFeature('submissions-feed')
  const stats = useFeature('stats-page')
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [i, setI] = useState(0)
  const [camps, setCamps] = useState<C[] | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const box = useDialog<HTMLDivElement>(open, () => setOpen(false), { initial: 'none' })
  const active = on && !HIDDEN.some((p) => pathname.startsWith(p)) && !isInvitePath(pathname)
  const showPill = false // the floating Search button is gone; the shortcut (⌘K or /) still works

  useEffect(() => {
    if (!active) return
    const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      } else if (e.key === '/' && !typing(e.target) && !e.metaKey && !e.ctrlKey && !document.querySelector('[aria-modal="true"]')) {
        e.preventDefault()
        setOpen(true)
      } else if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active])

  useEffect(() => {
    if (!open) return
    setQ('')
    setI(0)
    window.setTimeout(() => input.current?.focus(), 30)
    if (!camps) fetch('/api/search').then((r) => r.json()).then((j: { campaigns: C[] }) => setCamps(j.campaigns)).catch(() => setCamps([]))
  }, [open, camps])
  useEffect(() => setI(0), [q])

  const pages = useMemo<Row[]>(() => {
    const base = NAV_LINKS.map((l) => ({ key: l.href, label: l.label, sub: l.href, group: 'Pages' as const, href: l.href }))
    return [
      ...base,
      ...(reels ? [{ key: 'p-reels', label: 'Reels: swipe through campaigns', sub: '/reels', group: 'Pages' as const, href: '/reels' }] : []),
      ...(board ? [{ key: 'p-board', label: 'Leaderboard', sub: '/leaderboard', group: 'Pages' as const, href: '/leaderboard' }] : []),
      ...(status ? [{ key: 'p-status', label: 'System status', sub: '/status', group: 'Pages' as const, href: '/status' }] : []),
      ...(feed ? [{ key: 'p-submissions', label: 'Submissions: watch and rate clips', sub: '/submissions', group: 'Pages' as const, href: '/submissions' }] : []),
      ...(stats ? [{ key: 'p-stats', label: 'Stats and leaderboards', sub: '/stats', group: 'Pages' as const, href: '/stats' }] : []),
      { key: 'p-pricing', label: 'Pricing and fees', sub: '/pricing', group: 'Pages', href: '/pricing' },
      { key: 'p-payouts', label: 'How payouts work', sub: '/payouts', group: 'Pages', href: '/payouts' },
      { key: 'p-trust', label: 'Fraud protection', sub: '/trust', group: 'Pages', href: '/trust' },
      user?.signedIn ? { key: 'p-dash', label: 'Your dashboard', sub: '/dashboard', group: 'Pages', href: '/dashboard' } : { key: 'p-login', label: 'Log in', sub: '/login', group: 'Pages', href: '/login' },
    ]
  }, [user, reels, board, status, feed, stats])

  const rows = useMemo<Row[]>(() => {
    const t = q.trim().toLowerCase()
    const campaigns: Row[] = (camps ?? []).map((c) => ({ key: c.id, label: c.title, sub: `${c.creator} · ${c.type} · $${c.rate.toFixed(2)}/1K`, group: 'Campaigns', href: `/campaign/${c.id}`, cover: c.cover }))
    const all = [...campaigns, ...pages]
    const hit = t ? all.filter((r) => `${r.label} ${r.sub}`.toLowerCase().includes(t)) : [...campaigns.slice(0, 5), ...pages.slice(0, 5)]
    return hit.slice(0, 9)
  }, [q, camps, pages])

  const go = useCallback((r?: Row) => {
    if (!r) return
    setOpen(false)
    navigate(r.href)
  }, [navigate])

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') (e.preventDefault(), setI((n) => Math.min(rows.length - 1, n + 1)))
    else if (e.key === 'ArrowUp') (e.preventDefault(), setI((n) => Math.max(0, n - 1)))
    else if (e.key === 'Enter') (e.preventDefault(), go(rows[i]))
  }

  if (!active) return null
  let lastGroup = ''
  return (
    <>
      {showPill && <LiquidGlass as="button" type="button" onClick={() => setOpen(true)} aria-label="Search" rootClassName={cn('fixed z-[55] hidden lg:block', admin ? 'bottom-3.5 left-28' : 'bottom-5 left-5')} className="flex h-11 items-center gap-3 pr-2 pl-4 text-sm text-mute transition-colors hover:text-paper" look={{ zRadius: 12 }}>
          <Search className="size-4" /> Search
          <kbd className="rounded-pill bg-white/[0.08] px-2.5 py-1 font-mono text-[11px]">⌘K</kbd>
        </LiquidGlass>}
      <AnimatePresence>
        {open && (
          <motion.div key="s" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="fixed inset-0 z-[130] flex items-start justify-center bg-black/65 px-4 pt-[14vh] backdrop-blur-sm" onMouseDown={() => setOpen(false)}>
            <motion.div ref={box} role="dialog" aria-modal="true" aria-label="Search" initial={{ opacity: 0, y: -16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.98 }} transition={{ duration: 0.25, ease: EASE_OUT }} onMouseDown={(e) => e.stopPropagation()} onKeyDown={onKey} className="w-full max-w-xl overflow-hidden rounded-[calc(2rem*var(--round,1))] border border-white/15 bg-[#0c0c0f]/95 shadow-[0_50px_110px_-30px_rgb(0_0_0/0.95)] backdrop-blur-xl">
              <div className="flex items-center gap-3 border-b border-line px-5">
                <Search aria-hidden="true" className="size-5 text-mute" />
                <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search campaigns, artists and pages" aria-label="Search" className="h-16 flex-1 bg-transparent text-lg outline-none placeholder:text-mute" />
                <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="grid size-8 place-items-center rounded-pill text-mute hover:bg-white/10"><X className="size-4" /></button>
              </div>
              <ul role="listbox" className="max-h-[52vh] overflow-y-auto p-2">
                {camps === null && <li className="px-4 py-8 text-center text-sm text-mute">Loading…</li>}
                {camps !== null && rows.length === 0 && <li className="px-4 py-10 text-center text-sm text-mute">Nothing matches “{q}”.</li>}
                {rows.map((r, idx) => {
                  const head = r.group !== lastGroup ? ((lastGroup = r.group), true) : false
                  return (
                    <li key={r.key} role="option" aria-selected={idx === i}>
                      {head && <p className="px-4 pt-3 pb-1 text-[10px] text-mute">{r.group}</p>}
                      <button type="button" onMouseMove={() => setI(idx)} onClick={() => go(r)} className={cn('relative flex h-14 w-full items-center gap-3 rounded-2xl px-3 text-left transition-colors', idx === i ? 'text-paper' : 'text-paper/80')}>
                        {idx === i && <motion.span layoutId="spot-hl" transition={{ duration: 0.16, ease: EASE_OUT }} className="absolute inset-0 rounded-2xl bg-white/[0.09]" />}
                        {r.cover ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={r.cover} alt="" className="relative size-10 shrink-0 rounded-md object-cover" />
                        ) : (
                          <span className="relative grid size-10 shrink-0 place-items-center rounded-xl bg-white/[0.06]"><ArrowUpRight className="size-4 text-mute" /></span>
                        )}
                        <span className="relative min-w-0 flex-1">
                          <span className="block truncate text-[15px]">{r.label}</span>
                          <span className="block truncate text-xs text-mute">{r.sub}</span>
                        </span>
                        {idx === i && <CornerDownLeft aria-hidden="true" className="relative size-4 text-mute" />}
                      </button>
                    </li>
                  )
                })}
              </ul>
              <p className="flex items-center justify-between border-t border-line px-5 py-3 text-xs text-mute">
                <span>↑ ↓ to move · Enter to open</span>
                <button type="button" onClick={() => { setOpen(false); window.dispatchEvent(new Event('logoless:help')) }} className="inline-flex items-center gap-1.5 hover:text-paper"><Keyboard className="size-3.5" /> All shortcuts</button>
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
