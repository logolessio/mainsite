'use client'

import './editor.css'
import { AnimatePresence, motion } from 'framer-motion'
import { BarChart3, Check, ExternalLink, ImageIcon, LayoutGrid, Link2, Loader2, Monitor, MousePointer2, Palette, Settings2, Smartphone, Sparkles, User } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BioPage } from '@/components/bio/bio-page'
import { fontClass } from '@/components/bio/bits'
import { type BioConfig, DEFAULT_BIO } from '@/lib/bio'
import type { BioStats } from '@/lib/bio-store'
import { cn } from '@/lib/utils'
import { LinksPanel } from './panel-links'
import { BackgroundPanel, LayoutPanel, StylePanel } from './panel-design'
import { CursorPanel, EffectsPanel } from './panel-fx'
import { InsightsPanel, ProfilePanel, SettingsPanel } from './panel-account'
import type { EditorApi, ProfileDraft } from './types'

const TABS = [
  { id: 'links', name: 'Links', icon: Link2 },
  { id: 'profile', name: 'Profile', icon: User },
  { id: 'layout', name: 'Layout', icon: LayoutGrid },
  { id: 'style', name: 'Style', icon: Palette },
  { id: 'background', name: 'Background', icon: ImageIcon },
  { id: 'cursor', name: 'Cursor', icon: MousePointer2 },
  { id: 'effects', name: 'Effects', icon: Sparkles },
  { id: 'insights', name: 'Insights', icon: BarChart3 },
  { id: 'settings', name: 'Settings', icon: Settings2 },
] as const
type Tab = (typeof TABS)[number]['id']

type Loaded = { config: BioConfig; saved: boolean; profile: Omit<ProfileDraft, 'newAvatar'>; stats: BioStats }

const EMPTY_STATS: BioStats = { views: 0, clicks: 0, days: [], links: {} }

export function Editor({ claim }: { claim: string | null }) {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [cfg, setCfg] = useState<BioConfig>(DEFAULT_BIO)
  const [profile, setProfileState] = useState<ProfileDraft>({ handle: '', name: '', bio: '', avatar: null, hasAvatar: false })
  const [stats, setStats] = useState<BioStats>(EMPTY_STATS)
  const [base, setBase] = useState('')
  const [tab, setTab] = useState<Tab>('links')
  const [device, setDevice] = useState<'desktop' | 'phone'>('desktop')
  const [mobileView, setMobileView] = useState<'edit' | 'preview'>('edit')
  const [saving, setSaving] = useState(false)
  const [note, setNote] = useState('')
  const noteTimer = useRef(0)
  const first = useRef(true)

  const snapshot = useCallback((c: BioConfig, p: ProfileDraft) => JSON.stringify({ c, n: p.name, b: p.bio, h: p.handle, a: p.newAvatar ?? null }), [])
  const toast = useCallback((m: string) => {
    setNote(m)
    window.clearTimeout(noteTimer.current)
    noteTimer.current = window.setTimeout(() => setNote(''), 3600)
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
  const api: EditorApi = useMemo(() => ({ cfg, set, up, profile, setProfile, stats, toast }), [cfg, set, up, profile, setProfile, stats, toast])

  const save = async () => {
    if (saving || !dirty) return
    setSaving(true)
    try {
      const body = { config: cfg, profile: { displayName: profile.name, bio: profile.bio, handle: profile.handle, ...(profile.newAvatar !== undefined ? { avatar: profile.newAvatar } : {}) } }
      const r = await fetch('/api/me/bio', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
      const j = (await r.json().catch(() => ({}))) as Loaded & { error?: string }
      if (!r.ok) throw new Error(j.error ?? 'That did not save.')
      setCfg(j.config)
      const p = { ...j.profile } as ProfileDraft
      setProfileState(p)
      setBase(snapshot(j.config, p))
      toast('Saved')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'That did not save.')
    }
    setSaving(false)
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
      <main className={cn('ed grid min-h-dvh place-items-center', fontClass('geist'))}>
        {state === 'loading' ? <Loader2 className="size-5 animate-spin text-white/50" /> : <p className="text-sm text-white/60">The editor did not load. Reload the page to try again.</p>}
      </main>
    )
  }

  const panel = (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}>
        {tab === 'links' && <LinksPanel api={api} />}
        {tab === 'profile' && <ProfilePanel api={api} />}
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

  return (
    <main className={cn('ed fixed inset-0 flex flex-col', fontClass('geist'))}>
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-[var(--ed-line)] px-4">
        <span className="mx-auto hidden min-w-0 items-center gap-2 rounded-full border border-[var(--ed-line)] px-4 py-1.5 text-[0.8rem] text-white/70 sm:flex">
          <span className="truncate">logoless.io/{profile.handle}</span>
        </span>
        <div className="ml-auto flex items-center gap-2 sm:ml-0">
          <a href={`/${profile.handle}`} target="_blank" rel="noreferrer" className="hidden h-9 items-center gap-1.5 rounded-full px-3 text-[0.8rem] text-white/60 transition-colors hover:text-white md:inline-flex">
            <ExternalLink className="size-4" /> View
          </a>
          <button type="button" onClick={() => void save()} disabled={!dirty || saving} className={cn('inline-flex h-9 min-w-[5.5rem] items-center justify-center gap-2 rounded-full px-5 text-[0.82rem] font-medium transition-all', dirty ? 'bg-white text-black hover:opacity-85' : 'border border-[var(--ed-line2)] text-white/50')}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : dirty ? 'Save' : <><Check className="size-4" /> Saved</>}
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* rail + panel */}
        <div className={cn('min-h-0 flex-1 flex-col border-[var(--ed-line)] lg:flex lg:w-[26rem] lg:flex-none lg:border-r', mobileView === 'edit' ? 'flex' : 'hidden')}>
          <nav aria-label="Editor sections" className="ed-scroll flex shrink-0 gap-1 overflow-x-auto border-b border-[var(--ed-line)] px-3 py-2.5">
            {TABS.map((t) => (
              <button key={t.id} type="button" onClick={() => setTab(t.id)} aria-pressed={tab === t.id} className={cn('inline-flex h-9 shrink-0 items-center gap-2 rounded-full px-3.5 text-[0.78rem] transition-colors', tab === t.id ? 'bg-white text-black' : 'text-white/55 hover:bg-white/10 hover:text-white')}>
                <t.icon className="size-[0.95rem]" strokeWidth={1.7} />
                {t.name}
              </button>
            ))}
          </nav>
          <div className="ed-scroll min-h-0 flex-1 overflow-y-auto">{panel}</div>
        </div>

        {/* preview */}
        <Preview data={data} device={device} setDevice={setDevice} className={cn('min-h-0 flex-1 lg:flex', mobileView === 'preview' ? 'flex' : 'hidden')} />
      </div>

      {/* phones: edit or look */}
      <div className="flex shrink-0 border-t border-[var(--ed-line)] lg:hidden">
        {(['edit', 'preview'] as const).map((v) => (
          <button key={v} type="button" onClick={() => setMobileView(v)} className={cn('h-12 flex-1 text-[0.82rem] capitalize transition-colors', mobileView === v ? 'text-white' : 'text-white/40')}>
            {v === 'edit' ? 'Edit' : 'Preview'}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {note && (
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} role="status" className="pointer-events-none fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-full border border-[var(--ed-line2)] bg-black/90 px-5 py-2.5 text-[0.82rem] backdrop-blur-xl lg:bottom-6">
            {note}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}

function Preview({ data, device, setDevice, className }: { data: Parameters<typeof BioPage>[0]['data']; device: 'desktop' | 'phone'; setDevice: (d: 'desktop' | 'phone') => void; className?: string }) {
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
    <section className={cn('relative flex-col items-center justify-center bg-[#050505]', className)} aria-label="Preview">
      <div ref={box} className="flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden">
        <div style={{ width: full.w * k, height: full.h * k }} className={cn('relative shrink-0 overflow-hidden border border-[var(--ed-line2)] bg-black shadow-[0_40px_120px_rgb(0_0_0/0.7)]', device === 'phone' ? 'rounded-[2.4rem]' : 'rounded-2xl')}>
          <div style={{ width: full.w, height: full.h, transform: `scale(${k})`, transformOrigin: 'top left' }} className="absolute top-0 left-0">
            <BioPage mode="preview" data={data} />
          </div>
        </div>
      </div>
      <div className="flex h-11 shrink-0 items-center gap-1 pb-2">
        {([['desktop', Monitor], ['phone', Smartphone]] as const).map(([id, Icon]) => (
          <button key={id} type="button" onClick={() => setDevice(id)} aria-pressed={device === id} aria-label={id} className={cn('grid size-9 place-items-center rounded-full transition-colors', device === id ? 'bg-white text-black' : 'text-white/45 hover:text-white')}>
            <Icon className="size-4" strokeWidth={1.7} />
          </button>
        ))}
      </div>
    </section>
  )
}
