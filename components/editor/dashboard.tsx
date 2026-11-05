'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, BarChart3, Check, Copy, CornerDownLeft, Ellipsis, ExternalLink, Eye, ImageIcon, LayoutDashboard, LayoutGrid, Link2, Loader2, type LucideIcon, LogOut, MousePointer2, Palette, Pencil, Search, Settings2, Sparkles, User, X } from 'lucide-react'
import { signOut } from 'next-auth/react'
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * The working area: a solid sidebar with the whole menu in view (little numbers beside what has something in it, "g" and a letter to jump), a slim bar
 * across the top with a jump box (⌘K), and the page. Pills for what you press, rounded panels for the rest. On phones the sidebar becomes a tab bar.
 */
export const NAV = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, key: 'o', words: 'home start welcome checklist' },
  { id: 'links', label: 'Links', icon: Link2, key: 'l', section: 'Your page', words: 'add link buttons socials video music' },
  { id: 'profile', label: 'Profile', icon: User, key: 'p', words: 'name bio picture avatar username address' },
  { id: 'layout', label: 'Layout', icon: LayoutGrid, key: 'a', words: 'arrange poster bento stack orbit index terminal' },
  { id: 'style', label: 'Style', icon: Palette, key: 's', words: 'font colour color theme buttons roundness' },
  { id: 'background', label: 'Background', icon: ImageIcon, key: 'b', words: 'shader video image blur picture' },
  { id: 'cursor', label: 'Cursor', icon: MousePointer2, key: 'c', words: 'pointer trail arrow' },
  { id: 'effects', label: 'Effects', icon: Sparkles, key: 'e', words: 'tilt grain enter screen reveal spotlight' },
  { id: 'insights', label: 'Insights', icon: BarChart3, key: 'i', section: 'Results', words: 'stats views clicks analytics numbers' },
  { id: 'settings', label: 'Settings', icon: Settings2, key: 't', section: 'Account', words: 'share search title description log out account' },
] as const satisfies readonly { id: string; label: string; icon: LucideIcon; key: string; section?: string; words: string }[]

export type DashId = (typeof NAV)[number]['id']
/** What is waiting beside a menu item: a number, or a dot when there is simply something to do. */
export type NavCount = { n?: number; dot?: boolean }
export type DashUser = { name: string; handle: string; avatar: string | null }
export type SaveState = { dirty: boolean; saving: boolean; onSave: () => void }

function Badge({ c, lit }: { c?: NavCount; lit?: boolean }) {
  if (!c || (!c.n && !c.dot)) return null
  return c.n ? (
    <span aria-label={`${c.n} here`} className={cn('ml-auto grid h-5 min-w-5 place-items-center rounded-full border px-1.5 text-[0.66rem] tabular-nums', lit ? 'border-white/40 text-white' : 'border-white/15 text-white/55')}>
      {c.n > 99 ? '99+' : c.n}
    </span>
  ) : (
    <span aria-label="Something to do" className="ml-auto size-2 rounded-full bg-white" />
  )
}

function SideLink({ it, active, c, onGo }: { it: (typeof NAV)[number]; active: boolean; c?: NavCount; onGo: (id: DashId) => void }) {
  return (
    <button type="button" onClick={() => onGo(it.id)} aria-current={active ? 'page' : undefined} className={cn('group relative flex h-10 w-full items-center gap-3 rounded-full px-4 text-left text-[0.82rem] transition-colors duration-200', active ? 'bg-white/[0.09] text-white' : 'text-white/55 hover:bg-white/[0.05] hover:text-white')}>
      <it.icon aria-hidden="true" className="size-[1.05rem] shrink-0" strokeWidth={1.6} />
      <span>{it.label}</span>
      <Badge c={c} lit={active} />
      {!c?.n && !c?.dot && (
        <kbd aria-hidden="true" className="ml-auto rounded-md border border-white/15 px-1.5 text-[0.6rem] text-white/40 opacity-0 transition-opacity group-hover:opacity-100">
          g {it.key}
        </kbd>
      )}
    </button>
  )
}

function Avatar({ user, className }: { user: DashUser; className?: string }) {
  return (
    <span className={cn('grid shrink-0 place-items-center overflow-hidden rounded-full border border-[var(--ed-line2)] bg-white/[0.05] text-[0.85rem]', className)}>
      {user.avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.avatar} alt="" className="size-full object-cover" />
      ) : (
        (user.name || user.handle || '?').slice(0, 1).toUpperCase()
      )}
    </span>
  )
}

type Cmd = { id: string; label: string; hint?: string; icon: LucideIcon; run: () => void; words?: string }

/** The jump box: every page of the dashboard and a few things to do, found by typing. Opens with ⌘K or /. */
function Jump({ open, onClose, cmds }: { open: boolean; onClose: () => void; cmds: Cmd[] }) {
  const [q, setQ] = useState('')
  const [at, setAt] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const list = useMemo(() => {
    const t = q.trim().toLowerCase()
    return t ? cmds.filter((c) => `${c.label} ${c.words ?? ''}`.toLowerCase().includes(t)) : cmds
  }, [q, cmds])
  useEffect(() => {
    if (!open) return
    setQ('')
    setAt(0)
    const id = window.setTimeout(() => input.current?.focus(), 30)
    return () => window.clearTimeout(id)
  }, [open])
  useEffect(() => setAt(0), [q])
  const run = (c?: Cmd) => {
    if (!c) return
    onClose()
    c.run()
  }
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="fixed inset-0 z-[70] flex items-start justify-center bg-black/70 px-4 pt-[14vh] backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
          <motion.div initial={{ y: 12, opacity: 0, scale: 0.98 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 6, opacity: 0 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }} role="dialog" aria-modal="true" aria-label="Jump to" className="w-full max-w-[34rem] overflow-hidden rounded-3xl border border-white/12 bg-[#0d0d0d] shadow-[0_30px_80px_-20px_rgb(0_0_0/0.9)]">
            <div className="flex h-14 items-center gap-3 border-b border-[var(--ed-line)] px-5">
              <Search aria-hidden="true" className="size-4 text-white/50" />
              <input
                ref={input}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') (e.preventDefault(), setAt((i) => Math.min(list.length - 1, i + 1)))
                  else if (e.key === 'ArrowUp') (e.preventDefault(), setAt((i) => Math.max(0, i - 1)))
                  else if (e.key === 'Enter') (e.preventDefault(), run(list[at]))
                  else if (e.key === 'Escape') onClose()
                }}
                placeholder="Jump to a page or do something"
                aria-label="Jump to a page or do something"
                className="min-w-0 flex-1 rounded-none bg-transparent text-[0.88rem] outline-none placeholder:text-white/30"
              />
              <kbd className="rounded-md border border-white/15 px-1.5 py-0.5 text-[0.62rem] text-white/45">esc</kbd>
            </div>
            <ul role="listbox" className="ed-scroll max-h-[22rem] overflow-y-auto p-2">
              {list.length === 0 && <li className="px-4 py-6 text-center text-[0.82rem] text-white/45">Nothing like that here.</li>}
              {list.map((c, i) => (
                <li key={c.id} role="option" aria-selected={i === at}>
                  <button type="button" onPointerMove={() => setAt(i)} onClick={() => run(c)} className={cn('flex h-11 w-full items-center gap-3 rounded-xl px-3.5 text-left text-[0.84rem] transition-colors', i === at ? 'bg-white/[0.09] text-white' : 'text-white/70')}>
                    <c.icon aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.6} />
                    <span className="flex-1">{c.label}</span>
                    {c.hint && <span className="text-[0.66rem] text-white/35">{c.hint}</span>}
                    {i === at && <CornerDownLeft aria-hidden="true" className="size-3.5 text-white/60" />}
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

export function DashShell({ tab, onGo, counts, user, save, canPreview, view, onView, children }: { tab: DashId; onGo: (id: DashId) => void; counts: Partial<Record<DashId, NavCount>>; user: DashUser; save: SaveState; canPreview: boolean; view: 'edit' | 'preview'; onView: (v: 'edit' | 'preview') => void; children: ReactNode }) {
  const [jump, setJump] = useState(false)
  const [more, setMore] = useState(false)
  const current = NAV.find((n) => n.id === tab) ?? NAV[0]
  const url = `logoless.io/${user.handle}`
  const [copied, setCopied] = useState(false)
  const copy = () => {
    void navigator.clipboard?.writeText(`https://${url}`)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1400)
  }

  // ⌘K or / opens the jump box; "g" then a letter goes to a page
  useEffect(() => {
    let armed = 0
    const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        return setJump((v) => !v)
      }
      if (e.metaKey || e.ctrlKey || e.altKey || typing(e.target) || document.querySelector('[aria-modal="true"]')) return
      if (e.key === '/') {
        e.preventDefault()
        return setJump(true)
      }
      if (e.key === 'g') {
        armed = performance.now()
        return
      }
      if (armed && performance.now() - armed < 1200) {
        armed = 0
        const it = NAV.find((n) => n.key === e.key)
        if (it) onGo(it.id)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onGo])
  useEffect(() => setMore(false), [tab])

  const cmds = useMemo<Cmd[]>(
    () => [
      ...NAV.map((n) => ({ id: n.id, label: n.label, hint: `g ${n.key}`, icon: n.icon, words: n.words, run: () => onGo(n.id) })),
      { id: 'view', label: 'View my page', icon: ExternalLink, words: 'open live', run: () => void window.open(`/${user.handle}`, '_blank', 'noopener') },
      { id: 'copy', label: 'Copy my link', hint: url, icon: Copy, words: 'share url', run: copy },
      ...(save.dirty ? [{ id: 'save', label: 'Save changes', hint: '⌘S', icon: Check, run: save.onSave }] : []),
      { id: 'site', label: 'Back to the site', icon: ArrowUpRight, words: 'home', run: () => void (window.location.href = '/') },
      { id: 'out', label: 'Log out', icon: LogOut, words: 'sign out', run: () => void signOut({ callbackUrl: '/' }) },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onGo, user.handle, url, save.dirty, save.onSave],
  )

  const bottom: DashId[] = ['overview', 'links', 'layout', 'insights']
  let lastSection = ''
  return (
    <main className="ed fixed inset-0 flex flex-col md:pl-[256px]">
      {/* ---------- sidebar (larger screens) ---------- */}
      <aside aria-label="Dashboard" className="fixed inset-y-0 left-0 z-40 hidden w-[256px] flex-col border-r border-[var(--ed-line)] bg-[#080808] md:flex">
        <div className="flex h-16 shrink-0 items-center px-6">
          <a href="/" aria-label="logoless home" className="disp text-[1.35rem]">
            logoless
          </a>
        </div>
        <button type="button" onClick={copy} title="Copy your link" className="group mx-3 flex h-12 items-center gap-2 rounded-2xl border border-[var(--ed-line2)] bg-white/[0.03] px-4 text-left text-[0.76rem] text-white/70 transition-[border-color,color,background] duration-200 hover:border-white/30 hover:text-white">
          <span className="min-w-0 flex-1 truncate">{url}</span>
          {copied ? <Check aria-hidden="true" className="size-3.5 shrink-0" /> : <Copy aria-hidden="true" className="size-3.5 shrink-0 text-white/40 group-hover:text-white" />}
        </button>
        <nav aria-label="Pages" className="ed-scroll min-h-0 flex-1 overflow-y-auto px-3 pt-3 pb-4">
          <ul className="grid gap-0.5">
            {NAV.map((it) => {
              const heading = 'section' in it && it.section !== lastSection ? it.section : null
              if ('section' in it) lastSection = it.section
              return (
                <li key={it.id}>
                  {heading && <p className="px-4 pt-5 pb-1.5 text-[0.72rem] text-white/35">{heading}</p>}
                  <SideLink it={it} active={tab === it.id} c={counts[it.id]} onGo={onGo} />
                </li>
              )
            })}
          </ul>
        </nav>
        <div className="shrink-0 border-t border-[var(--ed-line)] p-3">
          <a href={`/${user.handle}`} target="_blank" rel="noreferrer" className="flex h-10 items-center gap-3 rounded-full px-4 text-[0.8rem] text-white/55 transition-colors hover:bg-white/[0.05] hover:text-white">
            <ExternalLink aria-hidden="true" className="size-4" strokeWidth={1.6} /> View my page
          </a>
          <a href="/" className="flex h-10 items-center gap-3 rounded-full px-4 text-[0.8rem] text-white/55 transition-colors hover:bg-white/[0.05] hover:text-white">
            <ArrowUpRight aria-hidden="true" className="size-4" strokeWidth={1.6} /> Back to the site
          </a>
        </div>
        <div className="shrink-0 border-t border-[var(--ed-line)] p-3">
          <div className="flex items-center gap-3 rounded-2xl border border-[var(--ed-line)] bg-white/[0.02] p-2.5">
            <Avatar user={user} className="size-10" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[0.84rem] leading-tight">{user.name || 'You'}</span>
              <span className="block truncate text-[0.72rem] text-white/45">@{user.handle}</span>
            </span>
            <button type="button" onClick={() => void signOut({ callbackUrl: '/' })} aria-label="Log out" title="Log out" className="grid size-9 shrink-0 place-items-center rounded-full text-white/50 transition-colors hover:bg-white/10 hover:text-white">
              <LogOut aria-hidden="true" className="size-4" strokeWidth={1.6} />
            </button>
          </div>
        </div>
      </aside>

      {/* ---------- top bar ---------- */}
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-[var(--ed-line)] px-4 md:px-8">
        <a href="/" aria-label="logoless home" className="disp text-[1.2rem] md:hidden">
          logoless
        </a>
        <p className="hidden items-center gap-2 text-[0.8rem] text-white/45 md:flex">
          <span>Dashboard</span>
          <span aria-hidden="true">/</span>
          <span className="text-white">{current.label}</span>
        </p>
        <button type="button" onClick={() => setJump(true)} aria-label="Jump to a page or do something" className="group mx-auto hidden h-10 w-full max-w-[28rem] min-w-0 items-center gap-3 rounded-full border border-[var(--ed-line2)] bg-white/[0.03] px-4 text-left text-[0.8rem] text-white/45 transition-[border-color,color] duration-200 hover:border-white/30 hover:text-white/80 md:flex">
          <Search aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.6} />
          <span className="flex-1 truncate">Jump to a page or do something</span>
          <kbd className="rounded-md border border-white/15 px-1.5 py-0.5 text-[0.62rem] text-white/45">⌘K</kbd>
        </button>
        <div className="ml-auto flex items-center gap-2 md:ml-0">
          {canPreview && (
            <div className="flex overflow-hidden rounded-full border border-[var(--ed-line2)] lg:hidden">
              {(['edit', 'preview'] as const).map((v) => (
                <button key={v} type="button" onClick={() => onView(v)} aria-pressed={view === v} aria-label={v === 'edit' ? 'Edit' : 'Preview'} className={cn('grid h-9 w-10 place-items-center rounded-full transition-colors', view === v ? 'bg-[#ececec] text-[#0a0a0a]' : 'text-white/55')}>
                  {v === 'edit' ? <Pencil className="size-4" strokeWidth={1.6} /> : <Eye className="size-4" strokeWidth={1.6} />}
                </button>
              ))}
            </div>
          )}
          <button type="button" onClick={() => setJump(true)} aria-label="Jump to" className="grid size-9 place-items-center rounded-full border border-[var(--ed-line2)] text-white/70 md:hidden">
            <Search className="size-4" strokeWidth={1.6} />
          </button>
          <a href={`/${user.handle}`} target="_blank" rel="noreferrer" className="hidden h-9 items-center gap-1.5 rounded-full px-4 text-[0.8rem] text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white lg:inline-flex">
            <ExternalLink className="size-3.5" /> View
          </a>
          <button type="button" onClick={save.onSave} disabled={!save.dirty || save.saving} className={cn('inline-flex h-9 min-w-[5.75rem] items-center justify-center gap-2 rounded-full px-5 text-[0.8rem] transition-[background,color,border-color] duration-200', save.dirty ? 'bg-[#ececec] font-medium text-[#0a0a0a] hover:bg-white' : 'border border-[var(--ed-line2)] text-white/50')}>
            {save.saving ? <Loader2 className="size-4 animate-spin" /> : save.dirty ? 'Save' : (
              <>
                <Check className="size-3.5" /> Saved
              </>
            )}
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 pb-14 md:pb-0">{children}</div>

      {/* ---------- tab bar (phones) ---------- */}
      <nav aria-label="Pages" className="fixed inset-x-0 bottom-0 z-40 flex h-14 border-t border-[var(--ed-line)] bg-[#080808] md:hidden">
        {bottom.map((id) => {
          const it = NAV.find((n) => n.id === id)!
          const c = counts[id]
          return (
            <button key={id} type="button" onClick={() => onGo(id)} aria-current={tab === id ? 'page' : undefined} className={cn('relative flex flex-1 flex-col items-center justify-center gap-1 rounded-none text-[0.64rem] transition-colors', tab === id ? 'text-white' : 'text-white/45')}>
              {tab === id && <span aria-hidden="true" className="absolute inset-x-6 top-0 h-[2px] rounded-full bg-white" />}
              <span className="relative">
                <it.icon aria-hidden="true" className="size-[1.1rem]" strokeWidth={1.6} />
                {(c?.n || c?.dot) && <span aria-hidden="true" className="absolute -top-0.5 -right-1.5 size-1.5 rounded-full bg-white" />}
              </span>
              {it.label}
            </button>
          )
        })}
        <button type="button" onClick={() => setMore((v) => !v)} aria-expanded={more} aria-label="More" className={cn('flex flex-1 flex-col items-center justify-center gap-1 rounded-none text-[0.64rem] transition-colors', more ? 'text-white' : 'text-white/45')}>
          <Ellipsis aria-hidden="true" className="size-[1.1rem]" strokeWidth={1.6} />
          More
        </button>
      </nav>

      <AnimatePresence>
        {more && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="fixed inset-0 z-50 flex flex-col bg-[#080808] md:hidden">
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-[var(--ed-line)] px-4">
              <span className="flex items-center gap-3">
                <Avatar user={user} className="size-9" />
                <span className="text-[0.84rem]">@{user.handle}</span>
              </span>
              <button type="button" aria-label="Close" onClick={() => setMore(false)} className="grid size-9 place-items-center rounded-full border border-[var(--ed-line2)] text-white/70">
                <X aria-hidden="true" className="size-4" />
              </button>
            </div>
            <ul className="ed-scroll flex-1 overflow-y-auto px-4 py-2">
              {NAV.map((it) => (
                <li key={it.id} className="border-b border-[var(--ed-line)]">
                  <button type="button" onClick={() => (setMore(false), onGo(it.id))} className={cn('flex h-14 w-full items-center gap-4 rounded-none text-left text-[1rem]', tab === it.id ? 'text-white' : 'text-white/60')}>
                    <it.icon aria-hidden="true" className="size-5" strokeWidth={1.6} />
                    <span>{it.label}</span>
                    <Badge c={counts[it.id]} />
                  </button>
                </li>
              ))}
              <li className="border-b border-[var(--ed-line)]">
                <a href={`/${user.handle}`} target="_blank" rel="noreferrer" className="flex h-14 items-center gap-4 text-[1rem] text-white/60">
                  <ExternalLink aria-hidden="true" className="size-5" strokeWidth={1.6} /> View my page
                </a>
              </li>
              <li className="border-b border-[var(--ed-line)]">
                <a href="/" className="flex h-14 items-center gap-4 text-[1rem] text-white/60">
                  <ArrowUpRight aria-hidden="true" className="size-5" strokeWidth={1.6} /> Back to the site
                </a>
              </li>
              <li>
                <button type="button" onClick={() => void signOut({ callbackUrl: '/' })} className="flex h-14 w-full items-center gap-4 rounded-none text-left text-[1rem] text-white/60">
                  <LogOut aria-hidden="true" className="size-5" strokeWidth={1.6} /> Log out
                </button>
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      <Jump open={jump} onClose={() => setJump(false)} cmds={cmds} />
    </main>
  )
}
