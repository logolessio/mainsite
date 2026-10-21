'use client'

import { AnimatePresence, motion } from 'framer-motion'
import {
  Activity, ArrowLeft, ArrowUpRight, AtSign, BookOpen, Clock, Code2, Compass, Contrast, Copy, CornerDownLeft, CreditCard, Eye, FileText, Flag, Heart, HelpCircle, Home,
  Image as ImageIcon, Keyboard, KeyRound, Layers, Link2, Lock, LogIn, LogOut, Mail, Megaphone, MessageSquareText, Moon, Palette, Pause, Plus, Receipt, Rocket,
  Scale, Search, Send, Settings, ShieldCheck, Sparkles, Target, Trash2, Trophy, Type, Unlink, UserRound, Users, Wallet, X, Clapperboard, BarChart3, Bell, CircleDollarSign, Globe,
  type LucideIcon,
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BrandIcon } from '@/components/brand-icon'
import { Icon, type IconName } from '@/components/icons'
import type { AppNavItem } from '@/components/app/nav-types'
import { useDialog } from '@/hooks/use-dialog'
import { getCalm, getContrast, getLargeText, getUnderline, setCalm, setContrast, setLargeText, setUnderline } from '@/lib/calm'
import { allowed, COMMANDS, type CmdIcon, type Command, GROUP_ORDER, suggestedIds, type Viewer } from '@/lib/commands'
import { haystack, type Haystack, parseQuery, score } from '@/lib/fuzzy'
import { EASE_OUT, SPRING_POP } from '@/lib/layout'
import { OWNER_URL, SITE_URL_FOR_STAFF } from '@/lib/staff-nav'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { useFeature, useFeatures } from './features-provider'
import { useNavUser } from './nav-user'
import { useTransitions } from './transition-provider'

const ICONS: Partial<Record<CmdIcon, LucideIcon>> = {
  search: Search, user: UserRound, image: ImageIcon, at: AtSign, text: Type, link: Link2, unlink: Unlink, shield: ShieldCheck, money: CircleDollarSign, wallet: Wallet,
  card: CreditCard, bell: Bell, settings: Settings, lock: Lock, key: KeyRound, trash: Trash2, logout: LogOut, login: LogIn, plus: Plus, megaphone: Megaphone,
  clapper: Clapperboard, chart: BarChart3, trophy: Trophy, heart: Heart, help: HelpCircle, mail: Mail, doc: FileText, palette: Palette, rocket: Rocket, code: Code2,
  eye: Eye, home: Home, sparkles: Sparkles, keyboard: Keyboard, moon: Moon, type: Type, contrast: Contrast, copy: Copy, users: Users, activity: Activity, send: Send,
  globe: Globe, compass: Compass, scale: Scale, book: BookOpen, flag: Flag, pause: Pause, clock: Clock, target: Target, receipt: Receipt, layers: Layers, answer: MessageSquareText,
}

function CmdGlyph({ icon }: { icon: CmdIcon }) {
  if (icon === 'tiktok' || icon === 'youtube' || icon === 'instagram') return <BrandIcon name={icon} className="size-4" />
  if (icon === 'discord') return <Icon name="Discord" className="size-4" />
  const C = ICONS[icon] ?? ArrowUpRight
  return <C aria-hidden="true" className="size-4" strokeWidth={1.75} />
}

type Camp = { id: string; title: string; creator: string; type: string; cover: string; rate: number }
type Faq = { q: string; a: string; topic: string }
type Row = {
  key: string
  label: string
  sub?: string
  group: string
  icon?: CmdIcon
  navIcon?: IconName
  cover?: string
  hint?: string
  answer?: string
  faq?: Faq
  /** The command it came from, remembered as recent. */
  cmd?: string
  hay: Haystack
  act: () => void
  rank?: number
}

const RECENT_KEY = 'logoless:cmd-recent'
const readRecent = (): string[] => {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]')
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, 6) : []
  } catch {
    return []
  }
}
const remember = (id: string) => {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify([id, ...readRecent().filter((x) => x !== id)].slice(0, 6)))
  } catch {
    /* private window: nothing remembered */
  }
}

const isStaffPath = (href: string) => /^\/(admin|dev|owner)(\/|$|\?|#)/.test(href)

/** Ask the home page to search its campaigns for these words (it listens; see components/browse/dashboard-view.tsx). */
export const BROWSE_SEARCH_EVENT = 'logoless:browse-search'

/**
 * ⌘K, /, or the search button: one box to find or do anything. With nothing typed it shows what you did last and what people like
 * you do most; typing searches every action the person is allowed to do, the pages, the live campaigns and the answers in the Q&A,
 * forgiving typos and other words for the same thing. Arrows move, Enter goes, Esc closes.
 *
 * `area` is the dashboard it was opened from ("Creator", "Brand", "Owner"), or null on the public site. `items` are that dashboard's pages.
 */
export function CommandPalette({ open, onClose, area = null, items = [], recents = [], onLogout }: { open: boolean; onClose: () => void; area?: string | null; items?: AppNavItem[]; recents?: string[]; onLogout?: () => void }) {
  const { navigate } = useTransitions()
  const pathname = usePathname()
  const { user } = useNavUser()
  const features = useFeatures()
  const full = useFeature('command-actions')
  const [q, setQ] = useState('')
  const [i, setI] = useState(0)
  const [camps, setCamps] = useState<Camp[] | null>(null)
  const [faq, setFaq] = useState<Faq[]>([])
  const [reading, setReading] = useState<Faq | null>(null)
  const [recent, setRecent] = useState<string[]>([])
  const [ownerHits, setOwnerHits] = useState<{ q: string; hits: { kind: 'person' | 'campaign'; id: string; label: string; sub: string; href: string }[] }>({ q: '', hits: [] })
  const input = useRef<HTMLInputElement>(null)
  const list = useRef<HTMLUListElement>(null)
  const closeOrBack = useCallback(() => (reading ? setReading(null) : onClose()), [reading, onClose])
  const box = useDialog<HTMLDivElement>(open, closeOrBack, { initial: 'none' })

  const viewer: Viewer = useMemo(() => ({ signedIn: Boolean(user?.signedIn), admin: Boolean(user?.signedIn && user.isAdmin), dev: Boolean(user?.signedIn && (user.isDev || user.isAdmin)) }), [user])
  const handle = user?.signedIn ? user.profile.handle : ''

  useEffect(() => {
    if (!open) return
    setQ('')
    setI(0)
    setReading(null)
    setRecent(readRecent())
    window.setTimeout(() => input.current?.focus(), 30)
    if (camps === null) fetch('/api/search').then((r) => r.json()).then((j: { campaigns?: Camp[] }) => setCamps(j.campaigns ?? [])).catch(() => setCamps([]))
    // the answers are only fetched the first time the box opens, so they cost nothing on a page where it never does
    if (full && faq.length === 0) {
      import('@/lib/faq')
        .then((m) => setFaq(Object.entries(m.FAQ).flatMap(([topic, list]) => list.map((f) => ({ ...f, topic })))))
        .catch(() => {})
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // the owner's search also looks through people and campaigns on the server, as the letters are typed
  useEffect(() => {
    const t = q.trim()
    if (!open || area !== 'Owner' || t.length < 2) return
    const timer = window.setTimeout(() => {
      fetch(`/api/admin/search?q=${encodeURIComponent(t)}`)
        .then((r) => (r.ok ? r.json() : { hits: [] }))
        .then((j: { hits?: typeof ownerHits.hits }) => setOwnerHits({ q: t, hits: j.hits ?? [] }))
        .catch(() => {})
    }, 160)
    return () => window.clearTimeout(timer)
  }, [q, open, area])

  /** Goes to an address, crossing between the public site and the owner dashboard (two addresses in production) when it has to. */
  const go = useCallback(
    (href: string) => {
      if (/^https?:\/\//.test(href)) return void window.open(href, '_blank', 'noopener,noreferrer')
      const staff = isStaffPath(href)
      if (staff && area !== 'Owner' && OWNER_URL) return window.location.assign(`${OWNER_URL}${href}`)
      if (!staff && area === 'Owner' && SITE_URL_FOR_STAFF !== '/') return window.location.assign(`${SITE_URL_FOR_STAFF}${href}`)
      navigate(href)
    },
    [area, navigate],
  )

  const runCommand = useCallback(
    (c: Command) => {
      remember(c.id)
      if (c.href) return go(c.href)
      const flip = (now: boolean, set: (v: boolean) => void, on: string, off: string) => (set(!now), toast.ok(now ? off : on))
      switch (c.run) {
        case 'help':
          return window.setTimeout(() => window.dispatchEvent(new Event('logoless:help')), 60)
        case 'profile-link':
          if (!handle) return
          void navigator.clipboard?.writeText(`${window.location.origin}/@${handle}`).catch(() => {})
          return toast.ok('Profile link copied')
        case 'my-profile':
          return handle ? go(`/@${handle}`) : go('/dashboard/profile')
        case 'logout':
          return onLogout ? onLogout() : void signOut({ callbackUrl: '/' })
        case 'calm':
          return flip(getCalm(), (v) => setCalm(v), 'Calm mode is on', 'Calm mode is off')
        case 'text-size':
          return flip(getLargeText(), setLargeText, 'Larger text is on', 'Text is back to normal')
        case 'contrast':
          return flip(getContrast(), setContrast, 'Higher contrast is on', 'Contrast is back to normal')
        case 'underline':
          return flip(getUnderline(), setUnderline, 'Links are underlined', 'Links are back to normal')
        case 'tour':
          return pathname === '/' ? window.setTimeout(() => window.dispatchEvent(new Event('logoless:tour')), 300) : go('/?tour=1')
        case 'copy-page':
          void navigator.clipboard?.writeText(window.location.href).catch(() => {})
          return toast.ok('Link copied')
        case 'top':
          return window.scrollTo({ top: 0, behavior: 'smooth' })
        case 'email-support':
          return window.location.assign('mailto:support@logoless.io')
      }
    },
    [go, handle, onLogout, pathname],
  )

  // everything this person may do here, worked out once per open (not per letter typed)
  const all = useMemo<Row[]>(() => {
    const cmds: Row[] = COMMANDS.filter((c) => allowed(c, viewer, features, full)).map((c) => ({
      key: `c:${c.id}`,
      cmd: c.id,
      label: c.label,
      sub: c.sub,
      group: c.group,
      icon: c.icon,
      rank: c.rank,
      hay: haystack(c.label, `${c.words ?? ''} ${c.group}`),
      act: () => runCommand(c),
    }))
    const pages: Row[] = items.map((it, n) => ({ key: `n:${it.href}`, label: it.label, sub: area ? `${area} · ${it.href}` : it.href, group: 'Go to', navIcon: it.icon, hint: n < 9 ? `g ${n + 1}` : undefined, hay: haystack(it.label, `${it.section ?? ''} ${area ?? ''}`), act: () => go(it.href), rank: 2 }))
    const answers: Row[] = full
      ? faq.map((f, n) => ({ key: `f:${n}`, label: f.q, sub: f.a.split(/(?<=[.!?])\s/)[0], group: 'Answers', icon: 'answer' as const, answer: f.a, faq: f, hay: haystack(f.q, f.topic, f.a), act: () => setReading(f) }))
      : []
    const campaigns: Row[] = (camps ?? []).map((c) => ({ key: `k:${c.id}`, label: c.title, sub: `${c.creator} · ${c.type} · $${c.rate.toFixed(2)} per 1K`, group: 'Campaigns', cover: c.cover, hay: haystack(c.title, `${c.creator} ${c.type} campaign`), act: () => go(`/campaign/${c.id}`) }))
    return [...pages, ...cmds, ...answers, ...campaigns]
  }, [viewer, features, full, items, area, faq, camps, runCommand, go])

  const rows = useMemo<(Row & { head?: string })[]>(() => {
    const t = q.trim()
    const byKey = new Map(all.map((r) => [r.key, r]))
    if (!t) {
      const out: (Row & { head?: string })[] = []
      const seen = new Set<string>()
      const push = (r: Row | undefined, head: string) => {
        if (!r || seen.has(r.key)) return
        seen.add(r.key)
        out.push({ ...r, head })
      }
      const lastRecent = [...recent.map((id) => byKey.get(`c:${id}`)), ...recents.map((h) => byKey.get(`n:${h}`))].filter(Boolean).slice(0, 3)
      lastRecent.forEach((r) => push(r, 'Recent'))
      suggestedIds(viewer, area).forEach((id) => push(byKey.get(`c:${id}`), 'Suggested'))
      all.filter((r) => r.group === 'Go to').forEach((r) => push(r, 'Pages'))
      if (!area) all.filter((r) => r.group === 'Campaigns').slice(0, 4).forEach((r) => push(r, 'Campaigns'))
      // name each group once, on its first row
      let last = ''
      return out.map((r) => {
        const show = r.head !== last
        last = r.head ?? ''
        return show ? r : { ...r, head: undefined }
      })
    }
    const pq = parseQuery(t)
    const order = (g: string) => {
      const n = GROUP_ORDER.indexOf(g as (typeof GROUP_ORDER)[number])
      return n < 0 ? 5 : n
    }
    const scored = all
      .map((r) => ({ r, s: score(pq, r.hay) }))
      .filter((x) => x.s > 0 && (x.r.group !== 'Campaigns' || t.length >= 2))
      // things you can do come a touch ahead of answers and campaigns on a near tie; the most used things win an exact tie
      .map((x) => ({ ...x, s: x.s + (x.r.group === 'Answers' ? -0.6 : x.r.group === 'Campaigns' ? -0.3 : 0.4) + (x.r.rank ?? 0) * 0.08 }))
      .sort((a, b) => b.s - a.s || order(a.r.group) - order(b.r.group))
    // only what is close to the best match, and only a few of each kind: a handful of good results, never a wall of loose ones
    const cutoff = Math.max(1.2, (scored[0]?.s ?? 0) * 0.45)
    const room: Record<string, number> = { Answers: 3, Campaigns: 3, other: 6 }
    const used: Record<string, number> = {}
    const hits = scored
      .filter((x) => {
        if (x.s < cutoff) return false
        const g = x.r.group === 'Answers' || x.r.group === 'Campaigns' ? x.r.group : 'other'
        used[g] = (used[g] ?? 0) + 1
        return used[g] <= room[g]
      })
      .slice(0, 9)
      .map((x) => x.r)
    const live: Row[] = area === 'Owner' && ownerHits.q === t ? ownerHits.hits.map((h) => ({ key: `o:${h.kind}:${h.id}`, label: h.label, sub: h.sub, group: h.kind === 'person' ? 'People' : 'Campaigns', icon: h.kind === 'person' ? ('users' as const) : ('megaphone' as const), hay: haystack(h.label), act: () => go(h.href) })) : []
    // never a dead end: there is always somewhere to take the words that were typed
    const fallback: Row[] = [
      { key: 'x:browse', label: `Search campaigns for “${t}”`, group: 'Search', icon: 'search', hay: haystack(''), act: () => searchCampaigns(t) },
      ...(full ? [{ key: 'x:faq', label: `Look for “${t}” in the Q&A`, group: 'Search', icon: 'help' as const, hay: haystack(''), act: () => go('/faq') }] : []),
      { key: 'x:ask', label: `Ask the team about “${t}”`, sub: 'We answer every message', group: 'Search', icon: 'mail', hay: haystack(''), act: () => go('/contact') },
      ...(area === 'Owner' && t.length >= 2
        ? [
            { key: 'x:people', label: `Find “${t}” in People`, group: 'Search', icon: 'users' as const, hay: haystack(''), act: () => go(`/admin/people?q=${encodeURIComponent(t)}`) },
            { key: 'x:text', label: `Find “${t}” in the site text`, group: 'Search', icon: 'text' as const, hay: haystack(''), act: () => go(`/admin/text?q=${encodeURIComponent(t)}`) },
          ]
        : []),
    ]
    const found = [...hits, ...live]
    const tail = found.length >= 6 ? fallback.slice(0, 1) : fallback
    return [...found.map((r, n) => (n === 0 ? { ...r, head: 'Best match' } : n === 1 ? { ...r, head: 'Results' } : r)), ...tail.map((r, n) => (n === 0 ? { ...r, head: 'Or' } : r))]

    function searchCampaigns(words: string) {
      try {
        const cur = JSON.parse(window.sessionStorage.getItem('ll:browse') ?? '{}') as Record<string, unknown>
        window.sessionStorage.setItem('ll:browse', JSON.stringify({ ...cur, q: words }))
      } catch {
        /* storage blocked: the page opens without the words */
      }
      if (pathname === '/') {
        window.dispatchEvent(new CustomEvent(BROWSE_SEARCH_EVENT, { detail: words }))
        document.getElementById('campaigns')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      } else go('/')
    }
  }, [q, all, recent, recents, viewer, area, ownerHits, full, go, pathname])

  useEffect(() => setI(0), [q])
  useEffect(() => {
    if (open) document.getElementById(`cmd-${i}`)?.scrollIntoView({ block: 'nearest' })
  }, [i, open])

  const choose = useCallback(
    (idx: number) => {
      const r = rows[idx]
      if (!r) return
      // an answer is read here, in the box, not on another page
      if (r.faq) return setReading(r.faq)
      onClose()
      if (r.cmd) remember(r.cmd)
      r.act()
    },
    [rows, onClose],
  )

  const related = useMemo(() => {
    if (!reading) return []
    const pq = parseQuery(reading.q)
    return faq
      .filter((f) => f.q !== reading.q)
      .map((f) => ({ f, s: score(pq, haystack(f.q, f.topic, f.a)) }))
      .filter((x) => x.s > 2)
      .sort((a, b) => b.s - a.s)
      .slice(0, 3)
      .map((x) => x.f)
  }, [reading, faq])

  const onKey = (e: React.KeyboardEvent) => {
    if (reading) return void (e.key === 'Enter' && e.preventDefault())
    const n = rows.length
    if (!n) return
    if (e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey) || (e.ctrlKey && e.key === 'n')) (e.preventDefault(), setI((v) => (v + 1) % n))
    else if (e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey) || (e.ctrlKey && e.key === 'p')) (e.preventDefault(), setI((v) => (v - 1 + n) % n))
    else if (e.key === 'Home' && !q) (e.preventDefault(), setI(0))
    else if (e.key === 'End' && !q) (e.preventDefault(), setI(n - 1))
    else if (e.key === 'Enter') (e.preventDefault(), choose(i))
  }

  const active = rows[i]
  const placeholder = !full ? 'Search campaigns and pages' : viewer.signedIn ? 'Search, or type what you want to do' : 'Search campaigns, pages and answers'

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="cmdk"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.16 } }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[130] flex items-start justify-center bg-black/55 px-3 pt-3 backdrop-blur-[6px] sm:px-4 sm:pt-[12vh]"
          onMouseDown={onClose}
        >
          <motion.div
            ref={box}
            role="dialog"
            aria-modal="true"
            aria-label="Search or do something"
            initial={{ opacity: 0, y: -14, scale: 0.975 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.985, transition: { duration: 0.14, ease: EASE_OUT } }}
            transition={SPRING_POP}
            onMouseDown={(e) => e.stopPropagation()}
            onKeyDown={onKey}
            // one radius for the box and, inside its 8px of padding, the same curve less 8px for every row, so the corners nest
            style={{ ['--cmd-r' as string]: 'calc(26px * var(--round, 1))' }}
            className="flex max-h-[calc(100dvh-24px)] w-full max-w-[640px] flex-col overflow-hidden rounded-[var(--cmd-r)] border border-white/[0.09] bg-[#0b0b0e]/[0.94] shadow-[0_1px_0_0_rgb(255_255_255/0.06)_inset,0_50px_120px_-30px_rgb(0_0_0/0.95),0_0_0_1px_rgb(0_0_0/0.5)] backdrop-blur-2xl backdrop-saturate-150 sm:max-h-[min(640px,76vh)]"
          >
            <div className="flex shrink-0 items-center gap-3 px-5">
              <Search aria-hidden="true" className="size-[18px] shrink-0 text-paper/45" />
              <input
                ref={input}
                value={q}
                onChange={(e) => (setQ(e.target.value), setReading(null))}
                placeholder={placeholder}
                aria-label="Search or do something"
                role="combobox"
                aria-expanded="true"
                aria-controls="cmd-list"
                aria-autocomplete="list"
                aria-activedescendant={active ? `cmd-${i}` : undefined}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="go"
                className="h-[60px] min-w-0 flex-1 bg-transparent text-[17px] outline-none placeholder:text-paper/35"
              />
              {q ? (
                <button type="button" aria-label="Clear" onClick={() => (setQ(''), input.current?.focus())} className="grid size-8 shrink-0 place-items-center rounded-pill text-paper/45 transition-colors hover:bg-white/10 hover:text-paper">
                  <X className="size-4" />
                </button>
              ) : (
                <kbd className="hidden shrink-0 rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[11px] text-paper/45 sm:inline">esc</kbd>
              )}
              <button type="button" aria-label="Close" onClick={onClose} className="grid size-8 shrink-0 place-items-center rounded-pill text-paper/45 transition-colors hover:bg-white/10 hover:text-paper sm:hidden">
                <X className="size-4" />
              </button>
            </div>
            <div aria-hidden="true" className="mx-5 h-px shrink-0 bg-white/[0.07]" />

            {reading && (
              <motion.div key={reading.q} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24, ease: EASE_OUT }} className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 [scrollbar-width:thin] sm:p-6">
                <button type="button" onClick={() => setReading(null)} className="inline-flex items-center gap-1.5 rounded-pill py-1 pr-2 text-[13px] text-paper/50 transition-colors hover:text-paper">
                  <ArrowLeft aria-hidden="true" className="size-3.5" /> Back to results
                </button>
                <p className="mt-5 text-xs text-paper/45">{reading.topic}</p>
                <h2 className="mt-1.5 font-display text-[1.65rem] leading-tight">{reading.q}</h2>
                <div className="mt-4 space-y-3 text-[15px] leading-relaxed text-paper/75">
                  {reading.a.split(/\n+/).map((p, n) => (
                    <p key={n}>{p}</p>
                  ))}
                </div>
                {related.length > 0 && (
                  <div className="mt-7">
                    <p className="mb-2 text-xs text-paper/45">People also ask</p>
                    <ul className="grid gap-1">
                      {related.map((f) => (
                        <li key={f.q}>
                          <button type="button" onClick={() => setReading(f)} className="flex w-full items-center justify-between gap-3 rounded-[calc(var(--cmd-r)-8px)] px-3 py-2.5 text-left text-[14px] text-paper/70 transition-colors hover:bg-white/[0.05] hover:text-paper">
                            <span>{f.q}</span>
                            <ArrowUpRight aria-hidden="true" className="size-3.5 shrink-0 text-paper/40" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="mt-7 flex flex-wrap gap-2">
                  <button type="button" onClick={() => (onClose(), go('/faq'))} className="inline-flex h-10 items-center rounded-pill bg-paper px-5 text-sm font-medium text-ink transition-colors hover:bg-paper/85">
                    Open the full Q&amp;A
                  </button>
                  <button type="button" onClick={() => (onClose(), go('/contact'))} className="inline-flex h-10 items-center rounded-pill border border-line-strong px-5 text-sm transition-colors hover:bg-white/[0.06]">
                    Ask the team
                  </button>
                </div>
              </motion.div>
            )}

            <ul ref={list} id="cmd-list" hidden={Boolean(reading)} role="listbox" aria-label="Results" className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 [scrollbar-width:thin]">
              {camps === null && !q && all.length === 0 && <li className="px-4 py-8 text-center text-sm text-mute">Loading…</li>}
              {rows.map((r, idx) => (
                <li key={r.key} role="presentation">
                  {r.head && <p className="px-3 pt-3 pb-1.5 text-xs text-paper/45 first:pt-1.5">{r.head}</p>}
                  <button
                    id={`cmd-${idx}`}
                    role="option"
                    aria-selected={idx === i}
                    type="button"
                    tabIndex={-1}
                    onMouseMove={() => i !== idx && setI(idx)}
                    onClick={() => choose(idx)}
                    className={cn('relative flex min-h-[52px] w-full items-center gap-3 rounded-[calc(var(--cmd-r)-8px)] px-3 py-2 text-left transition-colors duration-150', idx === i ? 'text-paper' : 'text-paper/75')}
                  >
                    {idx === i && <motion.span layoutId="cmd-hl" transition={{ type: 'spring', stiffness: 700, damping: 48, mass: 0.6 }} className="absolute inset-0 rounded-[inherit] bg-white/[0.075] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.05)]" />}
                    <span className={cn('relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-[calc(var(--cmd-r)-14px)] border transition-colors', idx === i ? 'border-white/15 bg-white/[0.08] text-paper' : 'border-white/[0.07] bg-white/[0.03] text-paper/60')}>
                      {r.cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.cover} alt="" className="size-full object-cover" />
                      ) : r.icon ? (
                        <CmdGlyph icon={r.icon} />
                      ) : r.navIcon ? (
                        <Icon name={r.navIcon} aria-hidden="true" className="size-4" />
                      ) : (
                        <ArrowUpRight aria-hidden="true" className="size-4" />
                      )}
                    </span>
                    <span className="relative min-w-0 flex-1">
                      <span className="block truncate text-[15px] leading-tight">{r.label}</span>
                      {r.sub && <span className="mt-0.5 block truncate text-[12.5px] text-paper/45">{r.sub}</span>}
                    </span>
                    {r.hint ? (
                      <kbd className="relative hidden shrink-0 rounded-md border border-white/10 px-1.5 py-0.5 font-mono text-[11px] text-paper/45 sm:inline">{r.hint}</kbd>
                    ) : q && r.group !== 'Search' ? (
                      <span className="relative hidden shrink-0 text-[11px] text-paper/35 sm:inline">{r.group}</span>
                    ) : null}
                    <CornerDownLeft aria-hidden="true" className={cn('relative size-3.5 shrink-0 text-paper/45 transition-opacity', idx === i ? 'opacity-100' : 'opacity-0')} />
                  </button>
                </li>
              ))}
            </ul>

            {/* an answer from the Q&A is read right here, without leaving the page */}
            <AnimatePresence initial={false}>
              {!reading && active?.answer && (
                <motion.div key="answer" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22, ease: EASE_OUT }} className="shrink-0 overflow-hidden">
                  <div aria-live="polite" className="mx-2 mb-2 max-h-40 overflow-y-auto rounded-[calc(var(--cmd-r)-8px)] border border-white/[0.07] bg-white/[0.03] px-4 py-3 text-[13.5px] leading-relaxed text-paper/70">
                    {active.answer}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex shrink-0 items-center justify-between gap-3 border-t border-white/[0.07] px-5 py-2.5 text-[12px] text-paper/40">
              <span className="hidden items-center gap-3 sm:flex">
                <span className="flex items-center gap-1"><Kbd>↑</Kbd><Kbd>↓</Kbd> move</span>
                <span className="flex items-center gap-1"><Kbd>↵</Kbd> open</span>
                <span className="flex items-center gap-1"><Kbd>esc</Kbd> close</span>
              </span>
              <span className="sm:hidden">{rows.length ? `${rows.length} ${rows.length === 1 ? 'result' : 'results'}` : ''}</span>
              <button type="button" onClick={() => (onClose(), window.setTimeout(() => window.dispatchEvent(new Event('logoless:help')), 60))} className="inline-flex items-center gap-1.5 rounded-pill px-2 py-1 transition-colors hover:bg-white/[0.06] hover:text-paper">
                <Keyboard aria-hidden="true" className="size-3.5" /> Shortcuts <Kbd>?</Kbd>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

const Kbd = ({ children }: { children: React.ReactNode }) => <kbd className="inline-grid h-5 min-w-5 place-items-center rounded-[5px] border border-white/10 bg-white/[0.04] px-1 font-mono text-[10.5px] text-paper/55">{children}</kbd>
