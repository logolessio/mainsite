'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, BarChart3, Check, Copy, CornerDownLeft, Ellipsis, ExternalLink, Eye, ImageIcon, LayoutDashboard, LayoutGrid, Link2, Loader2, type LucideIcon, LogOut, MousePointer2, Palette, Pencil, Search, Settings2, Sparkles, User, X } from 'lucide-react'
import { signOut } from 'next-auth/react'
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * The working area, laid out the way the old dashboard was: a solid sidebar with the whole menu in view (little numbers beside what has something in
 * it, "g" and a letter to jump), a slim bar across the top with a jump box (⌘K), and the page. Square and flat. On phones the sidebar becomes a tab bar.
 */
export const NAV = [
  { id: 'overview', label: 'overview', icon: LayoutDashboard, key: 'o', words: 'home start welcome checklist' },
  { id: 'links', label: 'links', icon: Link2, key: 'l', section: 'your page', words: 'add link buttons socials video music' },
  { id: 'profile', label: 'profile', icon: User, key: 'p', words: 'name bio picture avatar username address' },
  { id: 'layout', label: 'layout', icon: LayoutGrid, key: 'a', words: 'arrange poster bento stack orbit index terminal' },
  { id: 'style', label: 'style', icon: Palette, key: 's', words: 'font colour color theme buttons roundness' },
  { id: 'background', label: 'background', icon: ImageIcon, key: 'b', words: 'shader video image blur picture' },
  { id: 'cursor', label: 'cursor', icon: MousePointer2, key: 'c', words: 'pointer trail arrow' },
  { id: 'effects', label: 'effects', icon: Sparkles, key: 'e', words: 'tilt grain enter screen reveal spotlight' },
  { id: 'insights', label: 'insights', icon: BarChart3, key: 'i', section: 'results', words: 'stats views clicks analytics numbers' },
  { id: 'settings', label: 'settings', icon: Settings2, key: 't', section: 'account', words: 'share search title description log out account' },
] as const satisfies readonly { id: string; label: string; icon: LucideIcon; key: string; section?: string; words: string }[]

export type DashId = (typeof NAV)[number]['id']
/** What is waiting beside a menu item: a number, or a dot when there is simply something to do. */
export type NavCount = { n?: number; dot?: boolean }
export type DashUser = { name: string; handle: string; avatar: string | null }
export type SaveState = { dirty: boolean; saving: boolean; onSave: () => void }

function Badge({ c, lit }: { c?: NavCount; lit?: boolean }) {
  if (!c || (!c.n && !c.dot)) return null
  return c.n ? (
    <span aria-label={`${c.n} here`} className={cn('ml-auto grid h-5 min-w-5 place-items-center border px-1.5 text-[0.62rem] tabular-nums', lit ? 'border-white/70 text-white' : 'border-white/25 text-white/55')}>
      {c.n > 99 ? '99+' : c.n}
    </span>
  ) : (
    <span aria-label="something to do" className="ml-auto size-2 bg-white" />
  )
}

function SideLink({ it, active, c, onGo }: { it: (typeof NAV)[number]; active: boolean; c?: NavCount; onGo: (id: DashId) => void }) {
  return (
    <button type="button" onClick={() => onGo(it.id)} aria-current={active ? 'page' : undefined} className={cn('group relative flex h-10 w-full items-center gap-3 px-5 text-left text-[0.8rem] transition-colors duration-200', active ? 'bg-white/[0.08] text-white' : 'text-white/55 hover:bg-white/[0.05] hover:text-white')}>
      <span aria-hidden="true" className={cn('absolute inset-y-0 left-0 w-[2px] bg-white transition-opacity duration-200', active ? 'opacity-100' : 'opacity-0')} />
      <it.icon aria-hidden="true" className="size-[1.05rem] shrink-0" strokeWidth={1.6} />
      <span>{it.label}</span>
      <Badge c={c} lit={active} />
      {!c?.n && !c?.dot && (
        <kbd aria-hidden="true" className="ml-auto border border-white/20 px-1 text-[0.58rem] text-white/45 opacity-0 transition-opacity group-hover:opacity-100">
          g {it.key}
        </kbd>
      )}
    </button>
  )
}

function Avatar({ user, className }: { user: DashUser; className?: string }) {
  return (
    <span className={cn('grid shrink-0 place-items-center overflow-hidden border border-[var(--ed-line2)] bg-white/[0.05] text-[0.85rem]', className)}>
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
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="fixed inset-0 z-[70] flex items-start justify-center bg-black/75 px-4 pt-[14vh]" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
          <motion.div initial={{ y: 10 }} animate={{ y: 0 }} exit={{ y: 6 }} transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }} role="dialog" aria-modal="true" aria-label="jump to" className="w-full max-w-[34rem] border border-white/40 bg-black shadow-[7px_7px_0_rgb(255_255_255/0.14)]">
            <div className="flex h-12 items-center gap-3 border-b border-[var(--ed-line2)] px-4">
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
                placeholder="jump to a page or do something"
                aria-label="jump to a page or do something"
                className="min-w-0 flex-1 bg-transparent text-[0.86rem] outline-none placeholder:text-white/30"
              />
              <kbd className="border border-white/20 px-1.5 py-0.5 text-[0.6rem] text-white/45">esc</kbd>
            </div>
            <ul role="listbox" className="ed-scroll max-h-[22rem] overflow-y-auto py-1.5">
              {list.length === 0 && <li className="px-4 py-6 text-center text-[0.8rem] text-white/45">nothing like that here.</li>}
              {list.map((c, i) => (
                <li key={c.id} role="option" aria-selected={i === at}>
                  <button type="button" onPointerMove={() => setAt(i)} onClick={() => run(c)} className={cn('flex h-10 w-full items-center gap-3 px-4 text-left text-[0.82rem] transition-colors', i === at ? 'bg-white text-black' : 'text-white/75')}>
                    <c.icon aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.6} />
                    <span className="flex-1">{c.label}</span>
                    {c.hint && <span className={cn('text-[0.62rem]', i === at ? 'text-black/55' : 'text-white/35')}>{c.hint}</span>}
                    {i === at && <CornerDownLeft aria-hidden="true" className="size-3.5" />}
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
      { id: 'view', label: 'view my page', icon: ExternalLink, words: 'open live', run: () => void window.open(`/${user.handle}`, '_blank', 'noopener') },
      { id: 'copy', label: 'copy my link', hint: url, icon: Copy, words: 'share url', run: copy },
      ...(save.dirty ? [{ id: 'save', label: 'save changes', hint: '⌘S', icon: Check, run: save.onSave }] : []),
      { id: 'site', label: 'back to the site', icon: ArrowUpRight, words: 'home', run: () => void (window.location.href = '/') },
      { id: 'out', label: 'log out', icon: LogOut, words: 'sign out', run: () => void signOut({ callbackUrl: '/' }) },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onGo, user.handle, url, save.dirty, save.onSave],
  )

  const bottom: DashId[] = ['overview', 'links', 'layout', 'insights']
  let lastSection = ''
  return (
    <main className="ed fixed inset-0 flex flex-col md:pl-[248px]">
      {/* ---------- sidebar (larger screens) ---------- */}
      <aside aria-label="dashboard" className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r border-[var(--ed-line)] bg-black md:flex">
        <div className="flex h-16 shrink-0 items-center border-b border-[var(--ed-line)] px-5">
          <a href="/" aria-label="logoless home" className="disp text-[1.25rem] text-white">
            logoless
          </a>
        </div>
        <button type="button" onClick={copy} title="copy your link" className="group mx-3 mt-4 flex h-11 items-center gap-2 border border-[var(--ed-line2)] px-3 text-left text-[0.74rem] text-white/70 transition-colors hover:border-white/60 hover:text-white">
          <span className="min-w-0 flex-1 truncate">{url}</span>
          {copied ? <Check aria-hidden="true" className="size-3.5 shrink-0" /> : <Copy aria-hidden="true" className="size-3.5 shrink-0 text-white/40 group-hover:text-white" />}
        </button>
        <nav aria-label="pages" className="ed-scroll min-h-0 flex-1 overflow-y-auto pt-3 pb-4">
          <ul className="grid gap-0.5">
            {NAV.map((it) => {
              const heading = 'section' in it && it.section !== lastSection ? it.section : null
              if ('section' in it) lastSection = it.section
              return (
                <li key={it.id}>
                  {heading && <p className="px-5 pt-5 pb-1.5 text-[0.62rem] tracking-[0.18em] text-white/35 uppercase">{heading}</p>}
                  <SideLink it={it} active={tab === it.id} c={counts[it.id]} onGo={onGo} />
                </li>
              )
            })}
          </ul>
        </nav>
        <div className="shrink-0 border-t border-[var(--ed-line)] p-3">
          <a href={`/${user.handle}`} target="_blank" rel="noreferrer" className="flex h-9 items-center gap-3 px-2 text-[0.78rem] text-white/55 transition-colors hover:bg-white/[0.05] hover:text-white">
            <ExternalLink aria-hidden="true" className="size-4" strokeWidth={1.6} /> view my page
          </a>
          <a href="/" className="flex h-9 items-center gap-3 px-2 text-[0.78rem] text-white/55 transition-colors hover:bg-white/[0.05] hover:text-white">
            <ArrowUpRight aria-hidden="true" className="size-4" strokeWidth={1.6} /> back to the site
          </a>
        </div>
        <div className="shrink-0 border-t border-[var(--ed-line)] p-3">
          <div className="flex items-center gap-3 border border-[var(--ed-line)] p-2.5">
            <Avatar user={user} className="size-10" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[0.82rem] leading-tight">{user.name || 'you'}</span>
              <span className="block truncate text-[0.7rem] text-white/45">@{user.handle}</span>
            </span>
            <button type="button" onClick={() => void signOut({ callbackUrl: '/' })} aria-label="log out" title="log out" className="grid size-9 shrink-0 place-items-center text-white/50 transition-colors hover:bg-white/10 hover:text-white">
              <LogOut aria-hidden="true" className="size-4" strokeWidth={1.6} />
            </button>
          </div>
        </div>
      </aside>

      {/* ---------- top bar ---------- */}
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-[var(--ed-line)] px-4 md:px-8">
        <a href="/" aria-label="logoless home" className="disp text-[1.1rem] md:hidden">
          logoless
        </a>
        <p className="hidden items-center gap-2 text-[0.78rem] text-white/45 md:flex">
          <span>dashboard</span>
          <span aria-hidden="true">/</span>
          <span className="text-white">{current.label}</span>
        </p>
        <button type="button" onClick={() => setJump(true)} aria-label="jump to a page or do something" className="group mx-auto hidden h-10 w-full max-w-[28rem] min-w-0 items-center gap-3 border border-[var(--ed-line2)] px-3.5 text-left text-[0.78rem] text-white/45 transition-colors hover:border-white/55 hover:text-white/80 md:flex">
          <Search aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.6} />
          <span className="flex-1 truncate">jump to a page or do something</span>
          <kbd className="border border-white/20 px-1.5 py-0.5 text-[0.6rem] text-white/45">⌘K</kbd>
        </button>
        <div className="ml-auto flex items-center gap-2 md:ml-0">
          {canPreview && (
            <div className="flex border border-[var(--ed-line2)] lg:hidden">
              {(['edit', 'preview'] as const).map((v) => (
                <button key={v} type="button" onClick={() => onView(v)} aria-pressed={view === v} aria-label={v} className={cn('grid h-9 w-9 place-items-center transition-colors', view === v ? 'bg-white text-black' : 'text-white/55')}>
                  {v === 'edit' ? <Pencil className="size-4" strokeWidth={1.6} /> : <Eye className="size-4" strokeWidth={1.6} />}
                </button>
              ))}
            </div>
          )}
          <button type="button" onClick={() => setJump(true)} aria-label="jump to" className="grid size-9 place-items-center border border-[var(--ed-line2)] text-white/70 md:hidden">
            <Search className="size-4" strokeWidth={1.6} />
          </button>
          <a href={`/${user.handle}`} target="_blank" rel="noreferrer" className="cap hidden h-9 items-center gap-1.5 px-3 text-white/60 transition-colors hover:text-white lg:inline-flex">
            <ExternalLink className="size-3.5" /> view
          </a>
          <button type="button" onClick={save.onSave} disabled={!save.dirty || save.saving} className={cn('cap inline-flex h-9 min-w-[5.5rem] items-center justify-center gap-2 px-5 transition-all', save.dirty ? 'bg-white text-black hover:opacity-85' : 'border border-[var(--ed-line2)] text-white/50')}>
            {save.saving ? <Loader2 className="size-4 animate-spin" /> : save.dirty ? 'save' : (
              <>
                <Check className="size-3.5" /> saved
              </>
            )}
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 pb-14 md:pb-0">{children}</div>

      {/* ---------- tab bar (phones) ---------- */}
      <nav aria-label="pages" className="fixed inset-x-0 bottom-0 z-40 flex h-14 border-t border-[var(--ed-line)] bg-black md:hidden">
        {bottom.map((id) => {
          const it = NAV.find((n) => n.id === id)!
          const c = counts[id]
          return (
            <button key={id} type="button" onClick={() => onGo(id)} aria-current={tab === id ? 'page' : undefined} className={cn('relative flex flex-1 flex-col items-center justify-center gap-1 text-[0.62rem] transition-colors', tab === id ? 'text-white' : 'text-white/45')}>
              {tab === id && <span aria-hidden="true" className="absolute inset-x-5 top-0 h-[2px] bg-white" />}
              <span className="relative">
                <it.icon aria-hidden="true" className="size-[1.1rem]" strokeWidth={1.6} />
                {(c?.n || c?.dot) && <span aria-hidden="true" className="absolute -top-0.5 -right-1.5 size-1.5 bg-white" />}
              </span>
              {it.label}
            </button>
          )
        })}
        <button type="button" onClick={() => setMore((v) => !v)} aria-expanded={more} aria-label="more" className={cn('flex flex-1 flex-col items-center justify-center gap-1 text-[0.62rem] transition-colors', more ? 'text-white' : 'text-white/45')}>
          <Ellipsis aria-hidden="true" className="size-[1.1rem]" strokeWidth={1.6} />
          more
        </button>
      </nav>

      <AnimatePresence>
        {more && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="fixed inset-0 z-50 flex flex-col bg-black md:hidden">
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-[var(--ed-line)] px-4">
              <span className="flex items-center gap-3">
                <Avatar user={user} className="size-9" />
                <span className="text-[0.82rem]">@{user.handle}</span>
              </span>
              <button type="button" aria-label="close" onClick={() => setMore(false)} className="grid size-9 place-items-center border border-[var(--ed-line2)] text-white/70">
                <X aria-hidden="true" className="size-4" />
              </button>
            </div>
            <ul className="ed-scroll flex-1 overflow-y-auto px-4 py-2">
              {NAV.map((it) => (
                <li key={it.id} className="border-b border-[var(--ed-line)]">
                  <button type="button" onClick={() => (setMore(false), onGo(it.id))} className={cn('flex h-14 w-full items-center gap-4 text-left text-[1rem]', tab === it.id ? 'text-white' : 'text-white/60')}>
                    <it.icon aria-hidden="true" className="size-5" strokeWidth={1.6} />
                    <span>{it.label}</span>
                    <Badge c={counts[it.id]} />
                  </button>
                </li>
              ))}
              <li className="border-b border-[var(--ed-line)]">
                <a href={`/${user.handle}`} target="_blank" rel="noreferrer" className="flex h-14 items-center gap-4 text-[1rem] text-white/60">
                  <ExternalLink aria-hidden="true" className="size-5" strokeWidth={1.6} /> view my page
                </a>
              </li>
              <li className="border-b border-[var(--ed-line)]">
                <a href="/" className="flex h-14 items-center gap-4 text-[1rem] text-white/60">
                  <ArrowUpRight aria-hidden="true" className="size-5" strokeWidth={1.6} /> back to the site
                </a>
              </li>
              <li>
                <button type="button" onClick={() => void signOut({ callbackUrl: '/' })} className="flex h-14 w-full items-center gap-4 text-left text-[1rem] text-white/60">
                  <LogOut aria-hidden="true" className="size-5" strokeWidth={1.6} /> log out
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
