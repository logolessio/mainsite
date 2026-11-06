'use client'

import './editor.css'
import { AnimatePresence, motion } from 'framer-motion'
import { ExternalLink, Loader2, Monitor, Move, Smartphone } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BioPage } from '@/components/bio/bio-page'
import type { Arrange, EditPart, Grab } from '@/components/bio/context'
import { type BioConfig, DEFAULT_BIO, type FreeBox, MAX_PAGES, newId, pageSlug } from '@/lib/bio'
import { measureFlow } from '@/lib/arrange'
import type { BioStats } from '@/lib/bio-store'
import { cn } from '@/lib/utils'
import { LinksPanel } from './panel-links'
import { BackgroundPanel, LayoutPanel, StylePanel } from './panel-design'
import { TemplatesPanel } from './panel-templates'
import { CursorPanel, EffectsGroup, ScreenGroups } from './panel-fx'
import { MusicGroups } from './panel-music'
import { PagesPanel, SharePanel } from './panel-site'
import { InsightsPanel, ProfilePanel, SettingsPanel } from './panel-account'
import { type DashId, DashShell, EDIT_TABS, NAV, type NavCount, PageHead } from './dashboard'
import { OverviewPanel } from './overview'
import { Onboarding } from './onboarding'
import type { EditorApi, ProfileDraft } from './types'

type Tab = DashId
const TAB_IDS = NAV.map((n) => n.id) as readonly Tab[]
/** The pages that edit the page and show it beside them (the others are full width). */
const EDITS: readonly Tab[] = EDIT_TABS

type Loaded = { config: BioConfig; saved: boolean; profile: Omit<ProfileDraft, 'newAvatar'>; stats: BioStats }

const EMPTY_STATS: BioStats = { views: 0, clicks: 0, days: [], links: {} }

/** The site as seen from one page: that page's own things in place of the home page's (everything else about the site is shared). */
const withPage = (c: BioConfig, id: string): BioConfig => {
  const p = id ? c.pages?.find((x) => x.id === id) : undefined
  return p ? { ...c, blocks: p.blocks, free: p.free } : c
}
/** And back: what was done to the view of a page is put into that page, and the home page's own things are left as they were. */
const mergeBack = (c: BioConfig, n: BioConfig, id: string): BioConfig => {
  if (!id || !c.pages?.some((p) => p.id === id)) return n
  return { ...n, blocks: c.blocks, free: c.free, pages: c.pages.map((p) => (p.id === id ? { ...p, blocks: n.blocks, free: n.free } : p)) }
}

export function Editor({ claim }: { claim: string | null }) {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [cfg, setCfg] = useState<BioConfig>(DEFAULT_BIO)
  const [profile, setProfileState] = useState<ProfileDraft>({ handle: '', name: '', bio: '', avatar: null, hasAvatar: false })
  const [stats, setStats] = useState<BioStats>(EMPTY_STATS)
  const [base, setBase] = useState('')
  const [tab, setTabState] = useState<Tab>('overview')
  const [device, setDevice] = useState<'desktop' | 'phone'>('desktop')
  const [mobileView, setMobileView] = useState<'edit' | 'preview'>('edit')
  const [sel, setSel] = useState<string | null>(null)
  const [page, setPage] = useState('') // the page being edited (its id); empty is the home page
  const [snap, setSnap] = useState(true)
  const [handoff, setHandoff] = useState<Grab | null>(null)
  const keepDevice = useRef(false)
  const [saving, setSaving] = useState(false)
  const [tour, setTour] = useState(false)
  const [fresh, setFresh] = useState(false)
  const [note, setNote] = useState('')
  const noteTimer = useRef(0)
  const first = useRef(true)

  const snapshot = useCallback((c: BioConfig, p: ProfileDraft) => JSON.stringify({ c, n: p.name, b: p.bio, h: p.handle, a: p.newAvatar ?? null }), [])
  const toast = useCallback((m: string) => {
    setNote(m)
    window.clearTimeout(noteTimer.current)
    noteTimer.current = window.setTimeout(() => setNote(''), 3600)
  }, [])

  // the page you are on lives in the address (#links), so a reload or a shared link comes back to it
  const setTab = useCallback((t: Tab) => {
    setTabState(t)
    setMobileView('edit')
    try {
      window.history.replaceState(null, '', `#${t}`)
    } catch {
      /* nothing to do */
    }
  }, [])
  useEffect(() => {
    const h = window.location.hash.slice(1) as Tab
    if (TAB_IDS.includes(h)) setTabState(h)
  }, [])

  // load (and claim the name picked on the sign-up, once)
  useEffect(() => {
    let live = true
    ;(async () => {
      try {
        if (claim) await fetch('/api/me/bio/claim', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ handle: claim }) }).catch(() => null)
        const r = await fetch('/api/me/bio', { cache: 'no-store' })
        if (r.status === 401) return void (window.location.href = '/login?next=/editor')
        const j = (await r.json()) as Loaded
        if (!live) return
        setCfg(j.config)
        past.current = []
        future.current = []
        setProfileState({ ...j.profile })
        setStats(j.stats)
        setBase(snapshot(j.config, j.profile))
        setFresh(!j.saved)
        try {
          if (!j.saved && !window.localStorage.getItem(`ll:tour:${j.profile.handle}`)) setTour(true)
        } catch {
          if (!j.saved) setTour(true)
        }
        setState('ready')
        if (claim) window.history.replaceState(null, '', '/editor')
      } catch {
        if (live) setState('error')
      }
    })()
    return () => {
      live = false
    }
  }, [claim, snapshot])

  const dirty = state === 'ready' && snapshot(cfg, profile) !== base
  useEffect(() => {
    if (!dirty) return
    const f = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', f)
    return () => window.removeEventListener('beforeunload', f)
  }, [dirty])

  // every change goes through `commit`, which keeps what the page was so ⌘Z can bring it back (quick changes, like dragging a slider, count as one)
  const cfgRef = useRef(cfg)
  cfgRef.current = cfg
  const past = useRef<BioConfig[]>([])
  const future = useRef<BioConfig[]>([])
  const lastAt = useRef(0)
  const [, bump] = useState(0)
  const commit = useCallback((f: (c: BioConfig) => BioConfig) => {
    const c = cfgRef.current
    const n = f(c)
    if (n === c) return
    const now = Date.now()
    if (past.current.length === 0 || now - lastAt.current > 700) {
      past.current.push(c)
      if (past.current.length > 100) past.current.shift()
    }
    lastAt.current = now
    future.current = []
    cfgRef.current = n
    setCfg(n)
    bump((v) => v + 1)
  }, [])
  const undo = useCallback(() => {
    const p = past.current.pop()
    if (!p) return
    future.current.push(cfgRef.current)
    cfgRef.current = p
    lastAt.current = 0
    setCfg(p)
    bump((v) => v + 1)
  }, [])
  const redo = useCallback(() => {
    const n = future.current.pop()
    if (!n) return
    past.current.push(cfgRef.current)
    cfgRef.current = n
    lastAt.current = 0
    setCfg(n)
    bump((v) => v + 1)
  }, [])
  const set: EditorApi['set'] = useCallback((f) => commit((c) => mergeBack(c, f(withPage(c, page)), page)), [commit, page])
  // a click on a part of the preview opens what changes it
  const onPart = useCallback((p: EditPart) => setTab(p === 'profile' ? 'you' : p === 'links' ? 'links' : p === 'card' ? 'card' : 'page'), [setTab])
  const up: EditorApi['up'] = useCallback((k, patch) => set((c) => ({ ...c, [k]: { ...c[k], ...patch } })), [set])
  const setProfile = useCallback((p: Partial<ProfileDraft>) => setProfileState((x) => ({ ...x, ...p })), [])
  // "Drag and resize": any layout becomes free pieces, each exactly where it is now (the pieces are read off the preview), and back again
  const before = useRef<BioConfig['layout']>('classic')
  const dragMode = useCallback(
    (on: boolean, from?: Grab) => {
      const c = cfgRef.current
      if (on && c.layout !== 'canvas') {
        if (from) {
          keepDevice.current = true
          setHandoff(from)
        }
        const root = document.querySelector<HTMLElement>('section[aria-label="preview"] .bio-root')
        const left = c.layout === 'card' || c.layout === 'side' || c.layout === 'cover' || c.layout === 'minimal'
        const placed = root ? measureFlow(root, left ? 'l' : 'c') : null
        before.current = c.layout
        set((x) => ({ ...x, layout: 'canvas', free: { ...(x.free ?? {}), ...(placed ?? {}) } }))
      } else if (!on && c.layout === 'canvas') {
        set((x) => ({ ...x, layout: before.current === 'canvas' ? 'classic' : before.current }))
      }
    },
    [set],
  )
  // the other pages of the site: add, rename, move, remove
  const pages: EditorApi['pages'] = useMemo(
    () => ({
      add: (title) => {
        const id = newId()
        commit((c) => {
          const list = c.pages ?? []
          if (list.length >= MAX_PAGES) return c
          let slug = pageSlug(title) || 'page'
          while (list.some((p) => p.slug === slug)) slug = `${slug.slice(0, 26)}-${list.length + 2}`
          return { ...c, pages: [...list, { id, slug, title: title.trim().slice(0, 30) || 'New page', blocks: [] }] }
        })
        return id
      },
      patch: (id, p) =>
        commit((c) => ({
          ...c,
          pages: (c.pages ?? []).map((x) => (x.id === id ? { ...x, ...(p.title !== undefined ? { title: p.title.slice(0, 30) } : {}), ...(p.slug !== undefined ? { slug: pageSlug(p.slug) || x.slug } : {}) } : x)),
        })),
      move: (id, dir) =>
        commit((c) => {
          const l = [...(c.pages ?? [])]
          const i = l.findIndex((x) => x.id === id)
          const j = i + dir
          if (i < 0 || j < 0 || j >= l.length) return c
          ;[l[i], l[j]] = [l[j], l[i]]
          return { ...c, pages: l }
        }),
      remove: (id) => {
        commit((c) => ({ ...c, pages: (c.pages ?? []).filter((x) => x.id !== id) }))
        setPage((p) => (p === id ? '' : p))
      },
    }),
    [commit],
  )
  // the page being edited, as the panels and the preview see it
  const view = useMemo(() => withPage(cfg, page), [cfg, page])
  const current = cfg.pages?.find((p) => p.id === page)?.slug ?? ''
  useEffect(() => {
    if (page && !cfg.pages?.some((p) => p.id === page)) setPage('') // the page was removed (or undone away)
  }, [cfg.pages, page])
  const api: EditorApi = useMemo(() => ({ cfg: view, set, up, profile, setProfile, stats, toast, sel, setSel, snap, setSnap, dragMode, page, setPage, pages }), [view, set, up, profile, setProfile, stats, toast, sel, snap, dragMode, page, pages])
  const arrange = useMemo(
    () => ({ pending: handoff, done: () => setHandoff(null), selected: sel, select: setSel, snap, patch: (k: string, box: FreeBox) => set((c) => ({ ...c, free: { ...(c.free ?? {}), [k]: box } })) }),
    [sel, snap, set, handoff],
  )
  // choosing the canvas layout switches the preview to the phone, the size it is meant to be arranged at
  const lastLayout = useRef(cfg.layout)
  useEffect(() => {
    if (cfg.layout === 'canvas' && lastLayout.current !== 'canvas' && !keepDevice.current) setDevice('phone')
    keepDevice.current = false
    if (cfg.layout !== 'canvas') setSel(null)
    lastLayout.current = cfg.layout
  }, [cfg.layout])

  const save = async (force = false): Promise<boolean> => {
    if (saving || (!dirty && !force)) return false
    setSaving(true)
    try {
      const body = { config: cfg, profile: { displayName: profile.name, bio: profile.bio, handle: profile.handle, ...(profile.newAvatar !== undefined ? { avatar: profile.newAvatar } : {}) } }
      const r = await fetch('/api/me/bio', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
      const j = (await r.json().catch(() => ({}))) as Loaded & { error?: string }
      if (!r.ok) throw new Error(j.error ?? "couldn't save that. try again.")
      setCfg(j.config)
      const p = { ...j.profile } as ProfileDraft
      setProfileState(p)
      setBase(snapshot(j.config, p))
      setFresh(false)
      toast('saved')
      setSaving(false)
      return true
    } catch (e) {
      toast(e instanceof Error ? e.message : "couldn't save that. try again.")
    }
    setSaving(false)
    return false
  }
  const endTour = () => {
    setTour(false)
    try {
      window.localStorage.setItem(`ll:tour:${profile.handle}`, '1')
    } catch {
      /* a private window: it asks again next time */
    }
  }
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        void save()
      }
      // ⌘Z and ⇧⌘Z undo and redo the page (inside a text box they stay the box's own)
      const t = e.target
      const typing = t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))
      if ((e.metaKey || e.ctrlKey) && !e.altKey && !typing && !document.querySelector('[aria-modal="true"]')) {
        const k = e.key.toLowerCase()
        if (k === 'z') {
          e.preventDefault()
          if (e.shiftKey) redo()
          else undo()
        } else if (k === 'y') {
          e.preventDefault()
          redo()
        }
      }
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  })

  const data = useMemo(
    () => ({
      handle: profile.handle,
      name: profile.name || 'Your name',
      bio: profile.bio,
      avatar: profile.newAvatar ? `/api/img/${profile.newAvatar}` : profile.hasAvatar && profile.avatar?.startsWith('/api/img/') ? profile.avatar : null,
      config: view,
      current,
      views: cfg.meta.views ? stats.views : null,
      badges: cfg.meta.badges ? [{ id: 'uid', label: '1', hint: 'Account number' }] : [],
    }),
    [profile, view, current, cfg.meta, stats.views],
  )

  if (state !== 'ready') {
    return (
      <main className={cn('ed grid min-h-dvh place-items-center')}>
        {state === 'loading' ? <Loader2 className="size-5 animate-spin text-white/50" /> : <p className="text-sm text-white/60">the editor didn't load. reload the page and try again.</p>}
      </main>
    )
  }

  const panel = (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }} className="ed-sections">
        {tab === 'links' && <LinksPanel api={api} />}
        {tab === 'you' && <ProfilePanel api={api} />}
        {tab === 'card' && (
          <>
            <TemplatesPanel api={api} />
            <LayoutPanel api={api} />
          </>
        )}
        {tab === 'page' && (
          <>
            <BackgroundPanel api={api} />
            <EffectsGroup api={api} />
          </>
        )}
        {tab === 'text' && <StylePanel api={api} />}
        {tab === 'music' && (
          <>
            <MusicGroups api={api} />
            <CursorPanel api={api} />
            <ScreenGroups api={api} />
          </>
        )}
        {tab === 'pages' && <PagesPanel api={api} go={() => setTab('links')} />}
        {tab === 'share' && <SharePanel api={api} />}
        {tab === 'insights' && <InsightsPanel api={api} />}
        {tab === 'settings' && <SettingsPanel api={api} />}
      </motion.div>
    </AnimatePresence>
  )

  // the little numbers beside the menu: what is on the page, how many have looked, what still needs doing
  const linkCount = cfg.blocks.filter((b) => b.t === 'link' || b.t === 'social' || b.t === 'video').length
  const counts: Partial<Record<Tab, NavCount>> = {
    overview: !profile.name || !profile.bio || linkCount === 0 ? { dot: true } : undefined,
    links: linkCount ? { n: linkCount } : { dot: true },
    you: !profile.name || !profile.bio ? { dot: true } : undefined,
    pages: undefined,
    insights: stats.views ? { n: stats.views } : undefined,
  }
  const edits = EDITS.includes(tab)
  const user = { name: profile.name, handle: profile.handle, avatar: data.avatar }

  return (
    <>
      <div inert={tour || undefined}>
      <DashShell tab={tab} onGo={setTab} counts={counts} user={user} save={{ dirty, saving, onSave: () => void save() }} history={{ canUndo: past.current.length > 0, canRedo: future.current.length > 0, undo, redo }} canPreview={edits} view={mobileView} onView={setMobileView}>
        {tab === 'overview' ? (
          <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }} className="h-full">
            <OverviewPanel api={api} data={data} go={setTab} onTour={() => setTour(true)} />
          </motion.div>
        ) : edits ? (
          <div className="flex h-full min-h-0 flex-col lg:flex-row">
            <div className={cn('min-h-0 flex-1 flex-col border-[var(--ed-line)] lg:flex lg:w-[34rem] lg:flex-none lg:border-r xl:w-[37rem] 2xl:w-[42rem]', mobileView === 'edit' ? 'flex' : 'hidden')}>
              <div className="ed-scroll min-h-0 flex-1 overflow-y-auto">
                <PageHead tab={tab} onGo={setTab} counts={counts} />
                {panel}
                <div className="h-24" />
              </div>
            </div>
            <Preview data={data} device={device} setDevice={setDevice} arrange={cfg.layout === 'canvas' ? arrange : undefined} onPart={onPart} dragging={cfg.layout === 'canvas'} onDrag={dragMode} onSite={(slug) => setPage(slug ? (cfg.pages?.find((p) => p.slug === slug)?.id ?? '') : '')} handle={profile.handle} className={cn('min-h-0 flex-1 lg:flex', mobileView === 'preview' ? 'flex' : 'hidden')} />
          </div>
        ) : (
          <div className="ed-scroll h-full overflow-y-auto">
            <div className="mx-auto w-full max-w-3xl pb-16">
              <PageHead tab={tab} onGo={setTab} counts={counts} />
              {panel}
            </div>
          </div>
        )}
      </DashShell>
      </div>

      {tour && <Onboarding api={api} data={data} fresh={fresh} onFinish={() => save(true)} onDone={() => (endTour(), setTab('overview'))} onSkip={endTour} />}

      <AnimatePresence>
        {note && (
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} role="status" className="ed pointer-events-none fixed bottom-20 left-1/2 z-[100] -translate-x-1/2 border border-[var(--ed-line2)] bg-black/90 px-5 py-2.5 text-[0.78rem] backdrop-blur-xl md:bottom-6">
            {note}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function Preview({ data, device, setDevice, arrange, onPart, dragging, onDrag, onSite, handle, className }: { data: Parameters<typeof BioPage>[0]['data']; device: 'desktop' | 'phone'; setDevice: (d: 'desktop' | 'phone') => void; arrange?: Arrange; onPart?: (p: EditPart) => void; dragging: boolean; onDrag: (on: boolean, from?: Grab) => void; onSite: (slug: string) => void; handle: string; className?: string }) {
  const box = useRef<HTMLDivElement>(null)
  const grab = useRef<Grab | null>(null)
  const [taught, setTaught] = useState(true)
  useEffect(() => {
    try {
      setTaught(window.localStorage.getItem('ll:moved') === '1')
    } catch {
      setTaught(true)
    }
  }, [])
  const [size, setSize] = useState({ w: 640, h: 700 })
  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    setSize({ w: el.clientWidth, h: el.clientHeight })
    return () => ro.disconnect()
  }, [])
  // The page fills the whole pane, edge to edge. On a desktop it is shown as a wide window (as wide as it needs to be to get the desktop layout) scaled to the
  // pane's width and as tall as the pane is; on a phone it is a phone-sized screen that fills the pane's height.
  const desktop = device === 'desktop'
  const vw = desktop ? Math.max(1024, Math.min(1440, Math.round(size.w * 1.7))) : 390
  const k = desktop ? size.w / vw : Math.max(0.2, Math.min((size.h - 56) / 844, (size.w - 40) / 390))
  const vh = desktop ? size.h / k : 844
  return (
    <section
      className={cn('relative overflow-hidden bg-[#050505]', className)}
      aria-label="preview"
      // pressing a piece of the page and dragging it picks it up: the page switches to free positioning and the drag carries on
      onPointerDownCapture={(e) => {
        if (dragging || e.button !== 0) return
        const el = (e.target as HTMLElement).closest?.('[data-bk]')
        grab.current = el?.getAttribute('data-bk') ? { key: el.getAttribute('data-bk') as string, x: e.clientX, y: e.clientY, id: e.pointerId } : null
      }}
      onPointerMoveCapture={(e) => {
        const g = grab.current
        if (!g || e.pointerId !== g.id) return
        if (e.buttons !== 1) {
          grab.current = null
          return
        }
        if (Math.hypot(e.clientX - g.x, e.clientY - g.y) > 7) {
          grab.current = null
          onDrag(true, { ...g, x: e.clientX, y: e.clientY })
          try {
            window.localStorage.setItem('ll:moved', '1')
          } catch {
            /* it will be offered again */
          }
          setTaught(true)
        }
      }}
      onPointerUpCapture={() => (grab.current = null)}
    >
      <div ref={box} className="absolute inset-0 grid place-items-center">
        <div style={{ width: vw * k, height: vh * k }} className={cn('relative shrink-0 overflow-hidden bg-black', !desktop && 'rounded-[2.2rem] border border-[var(--ed-line2)] shadow-[0_40px_120px_rgb(0_0_0/0.7)]')}>
          <div style={{ width: vw, height: vh, transform: `scale(${k})`, transformOrigin: 'top left' }} className="absolute top-0 left-0">
            <BioPage mode="preview" data={data} arrange={arrange} onPart={onPart} onSite={onSite} />
          </div>
        </div>
      </div>
      <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full border border-white/15 bg-black/70 p-1 shadow-[0_12px_40px_rgb(0_0_0/0.6)] backdrop-blur-xl">
        <button type="button" onClick={() => onDrag(!dragging)} aria-pressed={dragging} title={dragging ? 'Go back to the layout' : 'Pick up the picture, the name, a link, anything, and put it where you want'} className={cn('inline-flex h-9 items-center gap-2 rounded-full px-4 text-[0.8rem] whitespace-nowrap transition-colors duration-200', dragging ? 'bg-white text-black' : 'text-white/80 hover:bg-white/10 hover:text-white')}>
          <Move className="size-3.5" strokeWidth={1.8} /> {dragging ? 'Done moving' : 'Move things'}
        </button>
        <span aria-hidden="true" className="mx-0.5 h-5 w-px bg-white/15" />
        {([['desktop', Monitor], ['phone', Smartphone]] as const).map(([id, Icon]) => (
          <button key={id} type="button" onClick={() => setDevice(id)} aria-pressed={device === id} aria-label={id === 'desktop' ? 'See it on a computer' : 'See it on a phone'} title={id === 'desktop' ? 'Computer' : 'Phone'} className={cn('grid size-9 place-items-center rounded-full transition-colors', device === id ? 'bg-white/15 text-white' : 'text-white/45 hover:text-white')}>
            <Icon className="size-4" strokeWidth={1.7} />
          </button>
        ))}
        <a href={`/${handle}`} target="_blank" rel="noreferrer" aria-label="Open your live page" title="Open your live page" className="grid size-9 place-items-center rounded-full text-white/45 transition-colors hover:text-white">
          <ExternalLink className="size-4" strokeWidth={1.7} />
        </a>
      </div>
      {!dragging && !taught && <p className="pointer-events-none absolute top-4 left-1/2 z-10 -translate-x-1/2 rounded-full border border-white/15 bg-black/70 px-4 py-1.5 text-[0.76rem] whitespace-nowrap text-white/80 backdrop-blur-xl">Press and drag anything on the page to move it.</p>}
      {dragging && <p className="pointer-events-none absolute top-4 left-1/2 z-10 -translate-x-1/2 rounded-full border border-white/15 bg-black/70 px-4 py-1.5 text-[0.76rem] whitespace-nowrap text-white/80 backdrop-blur-xl">Drag anything. Pull a corner to resize.</p>}
    </section>
  )
}
