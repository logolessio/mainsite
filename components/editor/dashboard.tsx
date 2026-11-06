'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, BarChart3, Check, ChevronDown, ChevronsUpDown, CircleDot, CircleUserRound, Copy, CornerDownLeft, Ellipsis, ExternalLink, Eye, Files, IdCard, ImageIcon, LayoutDashboard, Link2, Loader2, LogOut, MousePointer2, Music2, Pencil, QrCode, Redo2, Search, Settings2, Sparkles, Tag, Type, Undo2, Video, X, type LucideIcon } from 'lucide-react'
import { signOut } from 'next-auth/react'
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * The working area, laid out like a studio: a sidebar in labelled groups (Profile opens into its five sections), a bar across the top with where you are,
 * a box to find any setting by typing (⌘K) and the button to see your page, then the settings in numbered sections beside the live page. On phones the
 * sidebar becomes a tab bar.
 */
export const NAV = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, key: 'o', words: 'home start welcome checklist' },
  { id: 'insights', label: 'Analytics', icon: BarChart3, key: 'i', words: 'insights stats views clicks analytics numbers' },
  { id: 'you', label: 'You', icon: CircleUserRound, key: 'y', words: 'profile name bio picture avatar pfp username address' },
  { id: 'card', label: 'Card', icon: IdCard, key: 'c', words: 'look template theme preset layout banner 3d tilt shape drag resize' },
  { id: 'page', label: 'Page', icon: ImageIcon, key: 'b', words: 'background video image gif youtube blur effects snow embers smoke' },
  { id: 'text', label: 'Text & color', icon: Type, key: 't', words: 'font typeface colour color theme buttons roundness size icons' },
  { id: 'music', label: 'Music & widgets', icon: Music2, key: 'm', words: 'song audio mp3 flac wav cursor trail click enter screen player' },
  { id: 'links', label: 'Links', icon: Link2, key: 'l', words: 'add link buttons socials video music' },
  { id: 'pages', label: 'Pages', icon: Files, key: 'p', words: 'about subpage menu website extra' },
  { id: 'share', label: 'Share', icon: QrCode, key: 's', words: 'qr code link copy' },
  { id: 'settings', label: 'Settings', icon: Settings2, key: 'e', words: 'title description search log out account storage' },
] as const satisfies readonly { id: string; label: string; icon: LucideIcon; key: string; words: string }[]

export type DashId = (typeof NAV)[number]['id']
const byId = (id: DashId) => NAV.find((n) => n.id === id)!

/** The five sections that live under Profile. */
export const PROFILE = ['you', 'card', 'page', 'text', 'music'] as const satisfies readonly DashId[]
export const isProfile = (t: DashId) => (PROFILE as readonly string[]).includes(t)
/** The pages that edit the page and show it beside them (the others are full width). */
export const EDIT_TABS: readonly DashId[] = [...PROFILE, 'links', 'pages']

/** What is waiting beside a menu item: a number, or a dot when there is simply something to do. */
export type NavCount = { n?: number; dot?: boolean }
export type DashUser = { name: string; handle: string; avatar: string | null }
export type SaveState = { dirty: boolean; saving: boolean; onSave: () => void }
export type HistoryState = { canUndo: boolean; canRedo: boolean; undo: () => void; redo: () => void }

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

/** The little caps that name a group of the sidebar. */
const Label = ({ children }: { children: ReactNode }) => <p className="mono px-3 pt-5 pb-2 text-[0.62rem] tracking-[0.22em] text-white/35 uppercase">{children}</p>

function Item({ icon: Icon, label, on, c, onClick, right, hint }: { icon: LucideIcon; label: string; on: boolean; c?: NavCount; onClick: () => void; right?: ReactNode; hint?: string }) {
  return (
    <button type="button" onClick={onClick} aria-current={on ? 'page' : undefined} title={hint} className={cn('group relative flex h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-[0.88rem] transition-colors duration-200', on ? 'bg-white/[0.07] text-white' : 'text-white/60 hover:bg-white/[0.04] hover:text-white')}>
      <Icon aria-hidden="true" className="size-[1.1rem] shrink-0" strokeWidth={1.6} />
      <span className="truncate">{label}</span>
      <Badge c={c} lit={on} />
      {right}
    </button>
  )
}

/** One of the five sections under Profile: a rail down the side, and the one you are on is lit. */
function Sub({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-current={on ? 'page' : undefined} className={cn('relative flex h-9 w-full items-center rounded-lg pl-5 text-left text-[0.86rem] transition-colors duration-200', on ? 'text-white' : 'text-white/50 hover:text-white')}>
      {on && <span aria-hidden="true" className="absolute top-1.5 bottom-1.5 -left-px w-[2px] rounded-full bg-white" />}
      {label}
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

const HEAD: Record<DashId, { eyebrow: string; title: string; line: string }> = {
  overview: { eyebrow: 'Main', title: 'Overview', line: 'Where you are and what is next.' },
  insights: { eyebrow: 'Main', title: 'Analytics', line: 'Who looked, and what they pressed.' },
  you: { eyebrow: 'Customize', title: 'Profile customization', line: 'Customize every part of your page. Changes wait for you to press Save.' },
  card: { eyebrow: 'Customize', title: 'Profile customization', line: 'Customize every part of your page. Changes wait for you to press Save.' },
  page: { eyebrow: 'Customize', title: 'Profile customization', line: 'Customize every part of your page. Changes wait for you to press Save.' },
  text: { eyebrow: 'Customize', title: 'Profile customization', line: 'Customize every part of your page. Changes wait for you to press Save.' },
  music: { eyebrow: 'Customize', title: 'Profile customization', line: 'Customize every part of your page. Changes wait for you to press Save.' },
  links: { eyebrow: 'Customize', title: 'Links', line: 'What people can open from your page: links, socials, songs, videos and more.' },
  pages: { eyebrow: 'Customize', title: 'Pages', line: 'Extra pages for your site, like About or Work, with a menu across the top.' },
  share: { eyebrow: 'Tools', title: 'Share', line: 'Your link, and a code to put anywhere.' },
  settings: { eyebrow: 'Account', title: 'Settings', line: 'Search, sharing, storage and your account.' },
}

/** The top of a settings page: where it is, what it is called, and (under Profile) the pills that move between its five sections. */
export function PageHead({ tab, onGo, counts }: { tab: DashId; onGo: (id: DashId) => void; counts: Partial<Record<DashId, NavCount>> }) {
  const h = HEAD[tab]
  return (
    <div className="border-b border-[var(--ed-line)] px-6 pt-8 pb-6">
      <p className="mono flex items-center gap-2 text-[0.68rem] tracking-[0.2em] text-white/55 uppercase">
        <span aria-hidden="true" className="text-[0.55rem]">
          ✕
        </span>
        {h.eyebrow}
      </p>
      <h1 className="mt-3 text-[2.35rem] leading-[1.02] font-semibold tracking-[-0.045em] text-balance text-white xl:text-[2.7rem]">{h.title}</h1>
      <p className="mt-3 max-w-[34rem] text-[0.92rem] leading-snug text-white/65">{h.line}</p>
      {isProfile(tab) && (
        <div role="tablist" aria-label="Profile" className="ed-scroll mt-6 flex gap-1 overflow-x-auto rounded-full border border-[var(--ed-line2)] bg-white/[0.02] p-1">
          {PROFILE.map((id) => {
            const it = byId(id)
            const on = tab === id
            const c = counts[id]
            return (
              <button key={id} type="button" role="tab" aria-selected={on} onClick={() => onGo(id)} className={cn('relative inline-flex h-10 flex-auto items-center justify-center gap-2 rounded-full px-3 text-[0.8rem] whitespace-nowrap transition-[background,color] duration-200', on ? 'bg-white text-black' : 'text-white/60 hover:bg-white/[0.06] hover:text-white')}>
                <it.icon aria-hidden="true" className="hidden size-[0.95rem] min-[1700px]:block" strokeWidth={1.7} />
                {it.label}
                {(c?.n || c?.dot) && <span aria-hidden="true" className={cn('size-1.5 rounded-full', on ? 'bg-black' : 'bg-white')} />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

/** Things to do, not pages: they turn up when you search, beside the pages and the settings. */
const ACTIONS: { id: string; label: string; icon: LucideIcon; go: DashId; add?: string; words: string }[] = [
  { id: 'link', label: 'Add a link', icon: Link2, go: 'links', add: 'link', words: 'new button url website' },
  { id: 'song', label: 'Add a song to the page', icon: Music2, go: 'links', add: 'music', words: 'music spotify soundcloud apple audio player search' },
  { id: 'picture', label: 'Add a picture', icon: ImageIcon, go: 'links', add: 'image', words: 'image gif photo' },
  { id: 'video', label: 'Add a video', icon: Video, go: 'links', add: 'video', words: 'youtube vimeo tiktok' },
  { id: 'tags', label: 'Add tags', icon: Tag, go: 'links', add: 'tags', words: 'labels skills' },
  { id: 'status', label: 'Add a status', icon: CircleDot, go: 'links', add: 'status', words: 'open for work available busy' },
  { id: 'subpage', label: 'Add a page (About, Work…)', icon: Files, go: 'pages', words: 'subpage menu website' },
  { id: 'yt', label: 'Put a YouTube video behind the page', icon: Video, go: 'page', words: 'background video autoplay' },
  { id: 'upload-song', label: 'Upload your own song (mp3, wav, flac)', icon: Music2, go: 'music', words: 'audio background music metadata cover album' },
  { id: 'click', label: 'Add a click effect', icon: MousePointer2, go: 'music', words: 'cursor trail confetti ripple' },
]

/** Every setting, so typing what you want ("blur", "volume", "tilt") takes you straight to it. `sec` is the title of its section. */
const SETTINGS: { label: string; go: DashId; sec: string; words: string; icon: LucideIcon }[] = [
  { label: 'Profile picture or GIF', go: 'you', sec: 'Picture', words: 'avatar pfp photo gif upload', icon: CircleUserRound },
  { label: 'Name and bio', go: 'you', sec: 'You', words: 'display name bio about', icon: CircleUserRound },
  { label: 'Your address (username)', go: 'you', sec: 'Your address', words: 'handle url link username', icon: CircleUserRound },
  { label: 'Looks (one-tap themes)', go: 'card', sec: 'Looks', words: 'template theme preset', icon: IdCard },
  { label: 'Layout', go: 'card', sec: 'Layout', words: 'classic card side canvas list cover minimal', icon: IdCard },
  { label: 'Drag and resize the page', go: 'card', sec: 'Layout', words: 'canvas free move arrange wix', icon: IdCard },
  { label: 'Card, banner and shape', go: 'card', sec: 'Card', words: 'banner width roundness border frosted glass gif', icon: IdCard },
  { label: '3D tilt and depth', go: 'card', sec: '3D', words: 'tilt float shine perspective', icon: IdCard },
  { label: 'Background (picture, GIF, video)', go: 'page', sec: 'Background', words: 'wallpaper gif video youtube gradient colour', icon: ImageIcon },
  { label: 'Blur, dim and grain', go: 'page', sec: 'Finish', words: 'overlay darken noise vignette', icon: ImageIcon },
  { label: 'Effects (snow, embers, smoke)', go: 'page', sec: 'Effects', words: 'rain stars particles aurora petals', icon: Sparkles },
  { label: 'Colours', go: 'text', sec: 'Your colours', words: 'accent text background palette', icon: Type },
  { label: 'Font', go: 'text', sec: 'Typeface', words: 'typeface type text', icon: Type },
  { label: 'Buttons and roundness', go: 'text', sec: 'Buttons', words: 'links shape pill outline', icon: Type },
  { label: 'Sizes', go: 'text', sec: 'Sizes', words: 'bigger smaller scale spacing name bio icons', icon: Type },
  { label: 'Background music', go: 'music', sec: 'Music', words: 'audio song upload mp3 flac wav volume loop cover album metadata player', icon: Music2 },
  { label: 'Music player style', go: 'music', sec: 'Player', words: 'vinyl card bar pill hidden widget position', icon: Music2 },
  { label: 'Cursor', go: 'music', sec: 'Cursor', words: 'pointer arrow custom', icon: MousePointer2 },
  { label: 'Cursor trail', go: 'music', sec: 'Trail', words: 'sparkles comet follow', icon: MousePointer2 },
  { label: 'Click effects', go: 'music', sec: 'On click', words: 'confetti ripple burst', icon: MousePointer2 },
  { label: 'Enter screen', go: 'music', sec: 'Enter screen', words: 'click to enter gate splash', icon: Sparkles },
  { label: 'Page reveal and typing', go: 'music', sec: 'Arriving', words: 'animation typewriter intro', icon: Sparkles },
  { label: 'Spotlight and parallax', go: 'music', sec: 'Movement', words: 'magnetic mouse follow', icon: Sparkles },
  { label: 'Film, grain and scanlines', go: 'music', sec: 'Film', words: 'vhs retro noise', icon: Sparkles },
]

type Cmd = { id: string; label: string; hint?: string; icon: LucideIcon; run: () => void; words?: string }

/** Finds any page, setting or thing to do by typing. Opens with ⌘K or /. */
function Jump({ open, onClose, cmds }: { open: boolean; onClose: () => void; cmds: Cmd[] }) {
  const [q, setQ] = useState('')
  const [at, setAt] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const list = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return cmds.slice(0, 12)
    const parts = t.split(/\s+/)
    return cmds.filter((c) => parts.every((p) => `${c.label} ${c.words ?? ''}`.toLowerCase().includes(p))).slice(0, 30)
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
          <motion.div initial={{ y: 12, opacity: 0, scale: 0.98 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 6, opacity: 0 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }} role="dialog" aria-modal="true" aria-label="Find a setting" className="dash ed w-full max-w-xl overflow-hidden rounded-2xl border border-[var(--ed-line2)] bg-[#0b0b0b] shadow-[0_40px_120px_rgb(0_0_0/0.8)]">
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
                placeholder="Find a setting, a page, or something to do"
                aria-label="Find a setting, a page, or something to do"
                className="min-w-0 flex-1 rounded-none bg-transparent text-[0.92rem] outline-none placeholder:text-white/30"
              />
              <kbd className="mono rounded-md border border-white/15 px-1.5 py-0.5 text-[0.62rem] text-white/45">esc</kbd>
            </div>
            <ul role="listbox" className="ed-scroll max-h-[22rem] overflow-y-auto p-2">
              {list.length === 0 && <li className="px-4 py-6 text-center text-[0.84rem] text-white/45">Nothing like that here.</li>}
              {list.map((c, i) => (
                <li key={c.id} role="option" aria-selected={i === at}>
                  <button type="button" onPointerMove={() => setAt(i)} onClick={() => run(c)} className={cn('flex h-11 w-full items-center gap-3 rounded-xl px-3.5 text-left text-[0.86rem] transition-colors', i === at ? 'bg-white/[0.09] text-white' : 'text-white/70')}>
                    <c.icon aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.6} />
                    <span className="flex-1">{c.label}</span>
                    {c.hint && <span className="mono text-[0.64rem] text-white/35">{c.hint}</span>}
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

/** Opens a section by its title and brings it into view (used after the search jumps to a setting). */
export function revealSection(title: string) {
  window.setTimeout(() => {
    window.dispatchEvent(new CustomEvent('ll:open', { detail: title }))
    window.setTimeout(() => document.querySelector(`[data-sec="${CSS.escape(title)}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
  }, 380)
}

export function DashShell({ tab, onGo, counts, user, save, history, canPreview, view, onView, children }: { tab: DashId; onGo: (id: DashId) => void; counts: Partial<Record<DashId, NavCount>>; user: DashUser; save: SaveState; history?: HistoryState; canPreview: boolean; view: 'edit' | 'preview'; onView: (v: 'edit' | 'preview') => void; children: ReactNode }) {
  const [jump, setJump] = useState(false)
  const [more, setMore] = useState(false)
  const [menu, setMenu] = useState(false)
  const [openProfile, setOpenProfile] = useState(true)
  const current = byId(tab)
  const last = useRef<DashId>('you') // the section of Profile you were last in
  useEffect(() => {
    if (isProfile(tab)) {
      last.current = tab
      setOpenProfile(true)
    }
  }, [tab])
  const url = `logoless.io/${user.handle}`
  const [copied, setCopied] = useState(false)
  const copy = () => {
    void navigator.clipboard?.writeText(`https://${url}`)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1400)
  }
  const menuRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!menu) return
    const off = (e: PointerEvent) => !menuRef.current?.contains(e.target as Node) && setMenu(false)
    window.addEventListener('pointerdown', off)
    return () => window.removeEventListener('pointerdown', off)
  }, [menu])

  // ⌘K or / opens the search; "g" then a letter goes to a page
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

  const cmds = useMemo<Cmd[]>(() => {
    const add = (name: string) => {
      try {
        window.sessionStorage.setItem('ll:add', name)
      } catch {
        /* then it is not added for them */
      }
      window.setTimeout(() => window.dispatchEvent(new CustomEvent('ll:add', { detail: name })), 350)
    }
    return [
      ...ACTIONS.map((a) => ({
        id: `do-${a.id}`,
        label: a.label,
        icon: a.icon,
        words: a.words,
        run: () => {
          onGo(a.go)
          if (a.add) add(a.add)
        },
      })),
      ...SETTINGS.map((s, i) => ({
        id: `set-${i}`,
        label: s.label,
        hint: `${byId(s.go).label}`,
        icon: s.icon,
        words: s.words,
        run: () => {
          onGo(s.go)
          revealSection(s.sec)
        },
      })),
      ...NAV.map((n) => ({ id: n.id, label: n.label, hint: `g ${n.key}`, icon: n.icon, words: n.words, run: () => onGo(n.id) })),
      { id: 'view', label: 'View my profile', icon: ExternalLink, words: 'open live', run: () => void window.open(`/${user.handle}`, '_blank', 'noopener') },
      { id: 'copy', label: 'Copy my link', hint: url, icon: Copy, words: 'share url', run: copy },
      ...(save.dirty ? [{ id: 'save', label: 'Save changes', hint: '⌘S', icon: Check, run: save.onSave }] : []),
      { id: 'site', label: 'Back to the site', icon: ArrowUpRight, words: 'home', run: () => void (window.location.href = '/') },
      { id: 'out', label: 'Log out', icon: LogOut, words: 'sign out', run: () => void signOut({ callbackUrl: '/' }) },
    ]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onGo, user.handle, url, save.dirty, save.onSave])

  const crumbs = ['Dashboard', ...(isProfile(tab) ? ['Profile'] : []), current.label]
  const item = (id: DashId) => {
    const it = byId(id)
    return <Item key={id} icon={it.icon} label={it.label} on={tab === id} c={counts[id]} onClick={() => onGo(id)} hint={`g ${it.key}`} />
  }

  return (
    <main className="dash ed fixed inset-0 flex flex-col md:pl-[248px]">
      {/* ---------- sidebar (larger screens) ---------- */}
      <aside aria-label="Dashboard" className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r border-[var(--ed-line)] bg-[#070707] md:flex">
        <div className="flex h-[4.5rem] shrink-0 items-center px-6">
          <a href="/" aria-label="logoless home" className="disp text-[1.4rem]">
            logoless
          </a>
        </div>
        <nav aria-label="Pages" className="ed-scroll min-h-0 flex-1 overflow-y-auto px-3 pb-4">
          <Label>Main</Label>
          <ul className="grid gap-0.5">
            <li>{item('overview')}</li>
            <li>{item('insights')}</li>
          </ul>
          <Label>Customize</Label>
          <ul className="grid gap-0.5">
            <li>
              <Item icon={IdCard} label="Profile" on={false} c={isProfile(tab) ? undefined : counts.you} onClick={() => (isProfile(tab) ? setOpenProfile((v) => !v) : onGo(last.current))} right={<ChevronDown aria-hidden="true" className={cn('ml-auto size-4 text-white/45 transition-transform duration-300', !openProfile && '-rotate-90')} />} />
              {openProfile && (
                <div className="mt-0.5 mb-1 ml-[1.35rem] grid gap-0.5 border-l border-white/10">
                  {PROFILE.map((id) => (
                    <Sub key={id} label={byId(id).label} on={tab === id} onClick={() => onGo(id)} />
                  ))}
                </div>
              )}
            </li>
            <li>{item('links')}</li>
            <li>{item('pages')}</li>
          </ul>
          <Label>Tools</Label>
          <ul className="grid gap-0.5">
            <li>{item('share')}</li>
          </ul>
          <Label>Account</Label>
          <ul className="grid gap-0.5">
            <li>{item('settings')}</li>
          </ul>
        </nav>
        <div ref={menuRef} className="relative shrink-0 p-3">
          {menu && (
            <div className="absolute inset-x-3 bottom-[calc(100%-0.25rem)] overflow-hidden rounded-2xl border border-[var(--ed-line2)] bg-[#0d0d0d] p-1.5 shadow-[0_20px_60px_rgb(0_0_0/0.7)]">
              <a href={`/${user.handle}`} target="_blank" rel="noreferrer" className="flex h-10 items-center gap-3 rounded-xl px-3 text-[0.84rem] text-white/75 transition-colors hover:bg-white/[0.06] hover:text-white">
                <ExternalLink aria-hidden="true" className="size-4" strokeWidth={1.6} /> View my profile
              </a>
              <button type="button" onClick={copy} className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-[0.84rem] text-white/75 transition-colors hover:bg-white/[0.06] hover:text-white">
                {copied ? <Check aria-hidden="true" className="size-4" /> : <Copy aria-hidden="true" className="size-4" strokeWidth={1.6} />} {copied ? 'Copied' : 'Copy my link'}
              </button>
              <a href="/" className="flex h-10 items-center gap-3 rounded-xl px-3 text-[0.84rem] text-white/75 transition-colors hover:bg-white/[0.06] hover:text-white">
                <ArrowUpRight aria-hidden="true" className="size-4" strokeWidth={1.6} /> Back to the site
              </a>
              <button type="button" onClick={() => void signOut({ callbackUrl: '/' })} className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-[0.84rem] text-white/75 transition-colors hover:bg-white/[0.06] hover:text-white">
                <LogOut aria-hidden="true" className="size-4" strokeWidth={1.6} /> Log out
              </button>
            </div>
          )}
          <button type="button" onClick={() => setMenu((v) => !v)} aria-expanded={menu} aria-haspopup="menu" className="flex w-full items-center gap-3 rounded-2xl border border-[var(--ed-line)] bg-white/[0.02] p-2.5 text-left transition-colors hover:bg-white/[0.05]">
            <Avatar user={user} className="size-10" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[0.88rem] leading-tight">{user.name || 'You'}</span>
              <span className="mono block truncate text-[0.68rem] text-white/45">/{user.handle}</span>
            </span>
            <ChevronsUpDown aria-hidden="true" className="size-4 shrink-0 text-white/45" />
          </button>
        </div>
      </aside>

      {/* ---------- top bar ---------- */}
      <header className="flex h-[4.5rem] shrink-0 items-center gap-2 border-b border-[var(--ed-line)] px-3 sm:gap-3 sm:px-4 md:px-8">
        <a href="/" aria-label="logoless home" className="disp text-[1.2rem] md:hidden">
          logoless
        </a>
        <p className="mono hidden items-center gap-2.5 text-[0.7rem] tracking-[0.16em] text-white/45 uppercase md:flex">
          {crumbs.map((c, i) => (
            <span key={c} className="flex items-center gap-2.5">
              {i > 0 && <span aria-hidden="true">/</span>}
              <span className={i === crumbs.length - 1 ? 'text-white' : undefined}>{c}</span>
            </span>
          ))}
        </p>
        <div className="ml-auto flex items-center gap-2">
          <button type="button" onClick={() => setJump(true)} aria-label="Find a setting" className="group hidden h-11 w-[17rem] min-w-0 items-center gap-3 rounded-full border border-[var(--ed-line2)] bg-white/[0.03] px-4 text-left text-[0.86rem] text-white/50 transition-colors hover:border-white/30 hover:text-white md:flex">
            <Search aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.6} />
            <span className="flex-1 truncate">Find a setting</span>
            <kbd className="mono rounded-md border border-white/15 px-1.5 py-0.5 text-[0.62rem] text-white/45">⌘K</kbd>
          </button>
          {canPreview && (
            <div className="flex overflow-hidden rounded-full border border-[var(--ed-line2)] lg:hidden">
              {(['edit', 'preview'] as const).map((v) => (
                <button key={v} type="button" onClick={() => onView(v)} aria-pressed={view === v} aria-label={v === 'edit' ? 'Edit' : 'Preview'} className={cn('grid h-9 w-10 place-items-center rounded-full transition-colors', view === v ? 'bg-white text-black' : 'text-white/60')}>
                  {v === 'edit' ? <Pencil className="size-4" strokeWidth={1.6} /> : <Eye className="size-4" strokeWidth={1.6} />}
                </button>
              ))}
            </div>
          )}
          <button type="button" onClick={() => setJump(true)} aria-label="Find a setting" className="grid size-9 place-items-center rounded-full border border-[var(--ed-line2)] text-white/70 md:hidden">
            <Search className="size-4" strokeWidth={1.6} />
          </button>
          {history && (
            <div className="hidden items-center sm:flex">
              <button type="button" onClick={history.undo} disabled={!history.canUndo} aria-label="Undo" title="Undo (⌘Z)" className="grid size-9 place-items-center rounded-full text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white disabled:opacity-25 disabled:hover:bg-transparent">
                <Undo2 className="size-4" strokeWidth={1.7} />
              </button>
              <button type="button" onClick={history.redo} disabled={!history.canRedo} aria-label="Redo" title="Redo (⇧⌘Z)" className="grid size-9 place-items-center rounded-full text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white disabled:opacity-25 disabled:hover:bg-transparent">
                <Redo2 className="size-4" strokeWidth={1.7} />
              </button>
            </div>
          )}
          <button type="button" onClick={save.onSave} disabled={!save.dirty || save.saving} className={cn('inline-flex h-9 min-w-[4.5rem] items-center justify-center gap-2 rounded-full border px-3.5 text-[0.82rem] sm:min-w-[5.5rem] sm:px-5 transition-[background,color,border-color] duration-200', save.dirty ? 'border-white bg-white text-black hover:bg-white/90' : 'border-[var(--ed-line2)] text-white/55')}>
            {save.saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : save.dirty ? (
              'Save'
            ) : (
              <>
                <Check className="size-3.5" /> Saved
              </>
            )}
          </button>
          <a href={`/${user.handle}`} target="_blank" rel="noreferrer" className="hidden h-11 items-center gap-2.5 rounded-full bg-white py-0 pr-1.5 pl-5 text-[0.86rem] font-medium text-black transition-colors hover:bg-white/90 lg:inline-flex">
            View profile
            <span className="grid size-8 place-items-center rounded-full bg-black text-white">
              <Eye className="size-4" strokeWidth={1.7} />
            </span>
          </a>
        </div>
      </header>

      <div className="min-h-0 flex-1 pb-14 md:pb-0">{children}</div>

      {/* ---------- tab bar (phones) ---------- */}
      <nav aria-label="Pages" className="fixed inset-x-0 bottom-0 z-40 flex h-14 border-t border-[var(--ed-line)] bg-[#070707] md:hidden">
        {([['overview', 'overview'], ['customize', 'you'], ['links', 'links'], ['pages', 'pages']] as const).map(([k, to]) => {
          const it = k === 'customize' ? { label: 'Customize', icon: IdCard } : byId(to)
          const target: DashId = k === 'customize' ? last.current : to
          const on = k === 'customize' ? isProfile(tab) : tab === to
          const c = k === 'customize' ? counts.you : counts[to]
          return (
            <button key={k} type="button" onClick={() => onGo(target)} aria-current={on ? 'page' : undefined} className={cn('relative flex flex-1 flex-col items-center justify-center gap-1 rounded-none text-[0.6rem] transition-colors', on ? 'text-white' : 'text-white/45')}>
              {on && <span aria-hidden="true" className="absolute inset-x-4 top-0 h-[2px] rounded-full bg-white" />}
              <span className="relative">
                <it.icon aria-hidden="true" className="size-[1.1rem]" strokeWidth={1.6} />
                {(c?.n || c?.dot) && <span aria-hidden="true" className="absolute -top-0.5 -right-1.5 size-1.5 rounded-full bg-white" />}
              </span>
              {it.label}
            </button>
          )
        })}
        <button type="button" onClick={() => setMore((v) => !v)} aria-expanded={more} aria-label="More" className={cn('flex flex-1 flex-col items-center justify-center gap-1 rounded-none text-[0.6rem] transition-colors', more ? 'text-white' : 'text-white/45')}>
          <Ellipsis aria-hidden="true" className="size-[1.1rem]" strokeWidth={1.6} />
          More
        </button>
      </nav>

      <AnimatePresence>
        {more && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="fixed inset-0 z-50 flex flex-col bg-[#070707] md:hidden">
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-[var(--ed-line)] px-4">
              <span className="flex items-center gap-3">
                <Avatar user={user} className="size-9" />
                <span className="mono text-[0.8rem]">/{user.handle}</span>
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
                  <ExternalLink aria-hidden="true" className="size-5" strokeWidth={1.6} /> View my profile
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
