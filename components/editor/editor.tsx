'use client'

import './editor.css'
import { AnimatePresence, motion } from 'framer-motion'
import { Loader2, Monitor, Smartphone } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BioPage } from '@/components/bio/bio-page'
import type { Arrange } from '@/components/bio/context'
import { type BioConfig, DEFAULT_BIO, type FreeBox } from '@/lib/bio'
import type { BioStats } from '@/lib/bio-store'
import { cn } from '@/lib/utils'
import { LinksPanel } from './panel-links'
import { BackgroundPanel, LayoutPanel, StylePanel } from './panel-design'
import { TemplatesPanel } from './panel-templates'
import { CursorPanel, EffectsPanel } from './panel-fx'
import { InsightsPanel, ProfilePanel, SettingsPanel } from './panel-account'
import { CustomizeBar, type DashId, DashShell, NAV, type NavCount, isCustomize } from './dashboard'
import { OverviewPanel } from './overview'
import { Onboarding } from './onboarding'
import type { EditorApi, ProfileDraft } from './types'

type Tab = DashId
const TAB_IDS = NAV.map((n) => n.id) as readonly Tab[]
/** The pages that edit the page and show it beside them (the others are full width). */
const EDITS: readonly Tab[] = ['links', 'profile', 'templates', 'layout', 'style', 'background', 'cursor', 'effects']

type Loaded = { config: BioConfig; saved: boolean; profile: Omit<ProfileDraft, 'newAvatar'>; stats: BioStats }

const EMPTY_STATS: BioStats = { views: 0, clicks: 0, days: [], links: {} }

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
  const [snap, setSnap] = useState(true)
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

  const set: EditorApi['set'] = useCallback((f) => setCfg((c) => f(c)), [])
  const up: EditorApi['up'] = useCallback((k, patch) => setCfg((c) => ({ ...c, [k]: { ...c[k], ...patch } })), [])
  const setProfile = useCallback((p: Partial<ProfileDraft>) => setProfileState((x) => ({ ...x, ...p })), [])
  const api: EditorApi = useMemo(() => ({ cfg, set, up, profile, setProfile, stats, toast, sel, setSel, snap, setSnap }), [cfg, set, up, profile, setProfile, stats, toast, sel, snap])
  const arrange = useMemo(
    () => ({ selected: sel, select: setSel, snap, patch: (k: string, box: FreeBox) => setCfg((c) => ({ ...c, free: { ...(c.free ?? {}), [k]: box } })) }),
    [sel, snap],
  )
  // choosing the canvas layout switches the preview to the phone, the size it is meant to be arranged at
  const lastLayout = useRef(cfg.layout)
  useEffect(() => {
    if (cfg.layout === 'canvas' && lastLayout.current !== 'canvas') setDevice('phone')
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
      config: cfg,
      views: cfg.meta.views ? stats.views : null,
      badges: cfg.meta.badges ? [{ id: 'uid', label: '1', hint: 'Account number' }] : [],
    }),
    [profile, cfg, stats.views],
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
      <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}>
        {tab === 'links' && <LinksPanel api={api} />}
        {tab === 'profile' && <ProfilePanel api={api} />}
        {tab === 'templates' && <TemplatesPanel api={api} />}
        {tab === 'layout' && <LayoutPanel api={api} />}
        {tab === 'style' && <StylePanel api={api} />}
        {tab === 'background' && <BackgroundPanel api={api} />}
        {tab === 'cursor' && <CursorPanel api={api} />}
        {tab === 'effects' && <EffectsPanel api={api} />}
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
    profile: !profile.name || !profile.bio ? { dot: true } : undefined,
    insights: stats.views ? { n: stats.views } : undefined,
  }
  const edits = EDITS.includes(tab)
  const user = { name: profile.name, handle: profile.handle, avatar: data.avatar }

  return (
    <>
      <div inert={tour || undefined}>
      <DashShell tab={tab} onGo={setTab} counts={counts} user={user} save={{ dirty, saving, onSave: () => void save() }} canPreview={edits} view={mobileView} onView={setMobileView}>
        {tab === 'overview' ? (
          <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }} className="h-full">
            <OverviewPanel api={api} data={data} go={setTab} onTour={() => setTour(true)} />
          </motion.div>
        ) : edits ? (
          <div className="flex h-full min-h-0 flex-col lg:flex-row">
            <div className={cn('min-h-0 flex-1 flex-col border-[var(--ed-line)] lg:flex lg:w-[26rem] lg:flex-none lg:border-r', mobileView === 'edit' ? 'flex' : 'hidden')}>
              {isCustomize(tab) && <CustomizeBar tab={tab} onGo={setTab} counts={counts} />}
              <div className="ed-scroll min-h-0 flex-1 overflow-y-auto">{panel}</div>
            </div>
            <Preview data={data} device={device} setDevice={setDevice} arrange={tab === 'layout' || tab === 'links' ? arrange : undefined} className={cn('min-h-0 flex-1 lg:flex', mobileView === 'preview' ? 'flex' : 'hidden')} />
          </div>
        ) : (
          <div className="ed-scroll h-full overflow-y-auto">
            <div className="mx-auto w-full max-w-2xl px-4 py-8 md:py-12">
              <h1 className="mb-8 text-[1.6rem] tracking-[-0.01em]">{NAV.find((n) => n.id === tab)?.label ?? tab}</h1>
              <div className="border border-[var(--ed-line)]">{panel}</div>
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

function Preview({ data, device, setDevice, arrange, className }: { data: Parameters<typeof BioPage>[0]['data']; device: 'desktop' | 'phone'; setDevice: (d: 'desktop' | 'phone') => void; arrange?: Arrange; className?: string }) {
  const box = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 800, h: 600 })
  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    setSize({ w: el.clientWidth, h: el.clientHeight })
    return () => ro.disconnect()
  }, [])
  const full = device === 'desktop' ? { w: 1280, h: 800 } : { w: 390, h: 844 }
  const pad = 32
  const k = Math.min(1, (size.w - pad * 2) / full.w, (size.h - pad * 2 - 44) / full.h)
  return (
    <section className={cn('relative flex-col items-center justify-center bg-[#050505]', className)} aria-label="preview">
      <div ref={box} className="flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden">
        <div style={{ width: full.w * k, height: full.h * k }} className={cn('relative shrink-0 overflow-hidden border border-[var(--ed-line2)] bg-black shadow-[0_40px_120px_rgb(0_0_0/0.7)]', device === 'phone' ? 'rounded-[2.4rem]' : 'rounded-2xl')}>
          <div style={{ width: full.w, height: full.h, transform: `scale(${k})`, transformOrigin: 'top left' }} className="absolute top-0 left-0">
            <BioPage mode="preview" data={data} arrange={arrange} />
          </div>
        </div>
      </div>
      <div className="flex h-11 shrink-0 items-center gap-1 pb-2">
        {([['desktop', Monitor], ['phone', Smartphone]] as const).map(([id, Icon]) => (
          <button key={id} type="button" onClick={() => setDevice(id)} aria-pressed={device === id} aria-label={id} className={cn('grid size-9 place-items-center transition-colors', device === id ? 'bg-white text-black' : 'text-white/45 hover:text-white')}>
            <Icon className="size-4" strokeWidth={1.7} />
          </button>
        ))}
      </div>
    </section>
  )
}
