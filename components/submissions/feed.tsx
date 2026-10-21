'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown, Clapperboard, Search } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { TransitionLink } from '@/components/shell/transition-link'
import { GlassTabs } from '@/components/ui/glass-tabs'
import { CLIP_PLATFORMS } from '@/lib/clip-embed'
import type { FeedClip, FeedSort } from '@/lib/clip-feed'
import { EASE_OUT } from '@/lib/layout'
import { cn } from '@/lib/utils'
import { PlatformIcon } from './bits'
import { ClipCard, ClipCardSkeleton } from './clip-card'
import { Player } from './player'

type Filters = { sort: FeedSort; platform: string | null; campaign: string | null }
type CampaignOption = { id: string; title: string; creator: string; clips: number }

const SORTS: { id: FeedSort; label: string }[] = [
  { id: 'new', label: 'New' },
  { id: 'top', label: 'Top rated' },
  { id: 'views', label: 'Most viewed' },
]

const query = (f: Filters, offset = 0) => {
  const p = new URLSearchParams()
  if (f.sort !== 'new') p.set('sort', f.sort)
  if (f.platform) p.set('platform', f.platform)
  if (f.campaign) p.set('campaign', f.campaign)
  if (offset) p.set('offset', String(offset))
  return p.toString()
}

/**
 * The public submissions feed. The first page comes with the page itself; the rest load as you near the bottom. Each clip's platform
 * numbers and picture are asked for once it is on screen, a dozen at a time, so the page never waits on TikTok or YouTube.
 */
export function SubmissionsFeed({ initial, campaigns, filters: start, signedIn, me }: { initial: { clips: FeedClip[]; next: number | null }; campaigns: CampaignOption[]; filters: Filters; signedIn: boolean; me: string | null }) {
  const [filters, setFilters] = useState<Filters>(start)
  const [clips, setClips] = useState<FeedClip[]>(initial.clips)
  const [next, setNext] = useState<number | null>(initial.next)
  const [loading, setLoading] = useState(false)
  const [switching, setSwitching] = useState(false)
  const [failed, setFailed] = useState(false)
  const [open, setOpen] = useState<string | null>(null)
  const [fetching, setFetching] = useState<Set<string>>(() => new Set())
  // the clips the server drew are simply there; anything from this index on arrived later and rises in
  const [appearFrom, setAppearFrom] = useState(initial.clips.length)
  const asked = useRef(new Set<string>())
  const generation = useRef(0)
  const sentinel = useRef<HTMLDivElement>(null)

  const apply = useCallback(async (f: Filters) => {
    const gen = ++generation.current
    setFilters(f)
    setSwitching(true)
    setFailed(false)
    const qs = query(f)
    window.history.replaceState(window.history.state, '', qs ? `/submissions?${qs}` : '/submissions')
    try {
      const res = await fetch(`/api/clips?${qs}`)
      if (!res.ok) throw new Error()
      const j = (await res.json()) as { clips: FeedClip[]; next: number | null }
      if (gen !== generation.current) return
      setAppearFrom(0)
      setClips(j.clips)
      setNext(j.next)
    } catch {
      if (gen === generation.current) setFailed(true)
    } finally {
      if (gen === generation.current) setSwitching(false)
    }
  }, [])

  const more = useCallback(async () => {
    if (next === null || loading || switching) return
    const gen = generation.current
    setLoading(true)
    try {
      const res = await fetch(`/api/clips?${query(filters, next)}`)
      if (!res.ok) throw new Error()
      const j = (await res.json()) as { clips: FeedClip[]; next: number | null }
      if (gen !== generation.current) return
      setClips((cur) => {
        setAppearFrom(cur.length)
        const have = new Set(cur.map((c) => c.id))
        return [...cur, ...j.clips.filter((c) => !have.has(c.id))]
      })
      setNext(j.next)
    } catch {
      if (gen === generation.current) setFailed(true)
    } finally {
      setLoading(false)
    }
  }, [next, loading, switching, filters])

  // keep loading as the bottom comes near
  useEffect(() => {
    const el = sentinel.current
    if (!el || next === null || failed) return
    const io = new IntersectionObserver((e) => e.some((x) => x.isIntersecting) && void more(), { rootMargin: '1200px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [more, next, failed])

  // fresh platform numbers and pictures for clips that have none yet (or old ones), a dozen at a time
  useEffect(() => {
    const todo = clips.filter((c) => c.stale && !asked.current.has(c.id)).map((c) => c.id)
    if (!todo.length) return
    todo.forEach((id) => asked.current.add(id))
    setFetching((s) => new Set([...s, ...todo]))
    let stop = false
    ;(async () => {
      for (let i = 0; i < todo.length && !stop; i += 12) {
        const ids = todo.slice(i, i + 12)
        try {
          const res = await fetch(`/api/clips/meta?ids=${ids.join(',')}`)
          if (res.ok) {
            const j = (await res.json()) as { clips: FeedClip[]; gone: string[] }
            const fresh = new Map(j.clips.map((c) => [c.id, c]))
            const gone = new Set(j.gone)
            setClips((cur) => cur.filter((c) => !gone.has(c.id)).map((c) => (fresh.has(c.id) ? { ...fresh.get(c.id)!, rating: c.rating } : c)))
          }
        } catch {
          /* the clip keeps what it had */
        }
        setFetching((s) => {
          const n = new Set(s)
          ids.forEach((id) => n.delete(id))
          return n
        })
      }
    })()
    return () => {
      stop = true
    }
  }, [clips])

  const index = open ? clips.findIndex((c) => c.id === open) : -1
  const current = index >= 0 ? clips[index] : null
  const onRated = useCallback((id: string, rating: FeedClip['rating']) => setClips((cur) => cur.map((c) => (c.id === id ? { ...c, rating } : c))), [])
  const campaign = campaigns.find((c) => c.id === filters.campaign) ?? null
  const platformTabs = useMemo(
    () => [{ id: 'all', label: 'All' }, ...CLIP_PLATFORMS.map((p) => ({ id: p.id, label: (<span className="inline-flex items-center gap-2"><PlatformIcon platform={p.id} className="size-3.5" /><span className="hidden sm:inline">{p.label}</span></span>) }))],
    [],
  )

  return (
    <div>
      <header className="max-w-3xl">
        <p className="text-xs text-mute">Submissions</p>
        <h1 className="mt-4 font-display text-[clamp(2.8rem,7vw,5.6rem)] leading-[0.95] tracking-tight">Every clip, as it lands.</h1>
        <p className="mt-5 max-w-xl text-pretty text-lg leading-relaxed text-paper/65">
          The clips creators post for campaigns on logoless. Watch them here, rate the best ones and meet the people who made them.
        </p>
      </header>

      <div className="relative z-20 mt-10 flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center lg:sticky lg:top-[5.25rem]">
        <GlassTabs label="Sort clips" compact className="mx-0" value={filters.sort} onChange={(id) => apply({ ...filters, sort: id as FeedSort })} tabs={SORTS} />
        <div className="flex flex-wrap items-center gap-3">
          <GlassTabs label="Platform" compact className="mx-0" value={filters.platform ?? 'all'} onChange={(id) => apply({ ...filters, platform: id === 'all' ? null : id })} tabs={platformTabs} />
          <CampaignPicker options={campaigns} value={filters.campaign} onChange={(id) => apply({ ...filters, campaign: id })} />
        </div>
      </div>

      <div className="relative mt-8" aria-busy={switching}>
        {clips.length === 0 && !switching ? (
          <Empty filtered={Boolean(filters.platform || filters.campaign)} onClear={() => apply({ sort: filters.sort, platform: null, campaign: null })} campaign={campaign?.title ?? null} />
        ) : (
          <motion.ul
            animate={{ opacity: switching ? 0.35 : 1, filter: switching ? 'blur(2px)' : 'blur(0px)' }}
            transition={{ duration: 0.3, ease: EASE_OUT }}
            className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:gap-x-4 lg:grid-cols-4 xl:grid-cols-5"
          >
            <AnimatePresence initial={false} mode="popLayout">
              {clips.map((c, i) => (
                <ClipCard key={c.id} clip={c} index={i} appear={i >= appearFrom} loading={fetching.has(c.id)} onOpen={() => setOpen(c.id)} />
              ))}
            </AnimatePresence>
            {loading && Array.from({ length: 5 }, (_, i) => <ClipCardSkeleton key={`sk-${i}`} />)}
          </motion.ul>
        )}
        <div ref={sentinel} aria-hidden="true" className="h-px" />
        {failed && (
          <p className="mt-10 text-center text-sm text-mute">
            The next clips did not load.{' '}
            <button type="button" onClick={() => (setFailed(false), clips.length ? void more() : void apply(filters))} className="text-paper underline underline-offset-2">Try again</button>
          </p>
        )}
        {next === null && clips.length > 8 && <p className="mt-14 text-center text-sm text-mute">That’s every clip{campaign ? ` for ${campaign.title}` : ''}. <TransitionLink href="/" className="text-paper underline underline-offset-2">Find a campaign</TransitionLink> and add yours.</p>}
      </div>

      <Player
        clip={current}
        signedIn={signedIn}
        me={me}
        onClose={() => setOpen(null)}
        onPrev={index > 0 ? () => setOpen(clips[index - 1].id) : undefined}
        onNext={index >= 0 && index < clips.length - 1 ? () => setOpen(clips[index + 1].id) : undefined}
        onRated={onRated}
      />
    </div>
  )
}

function Empty({ filtered, onClear, campaign }: { filtered: boolean; onClear: () => void; campaign: string | null }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE_OUT }} className="rounded-[calc(2rem*var(--round,1))] border border-dashed border-line-strong px-6 py-16 text-center">
      <Clapperboard className="mx-auto size-8 text-mute" />
      <p className="mt-4 font-display text-2xl">{filtered ? 'No clips match that.' : 'No clips yet.'}</p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-mute">{filtered ? `Nothing here${campaign ? ` for ${campaign}` : ''} yet. Try another platform or campaign.` : 'Approved clips show up here the moment they are approved.'}</p>
      {filtered ? (
        <button type="button" onClick={onClear} className="mt-6 inline-flex h-11 items-center rounded-pill bg-paper px-6 text-sm font-medium text-ink hover:bg-paper/85">Show every clip</button>
      ) : (
        <TransitionLink href="/" className="mt-6 inline-flex h-11 items-center rounded-pill bg-paper px-6 text-sm font-medium text-ink hover:bg-paper/85">Find a campaign</TransitionLink>
      )}
    </motion.div>
  )
}

/** "All campaigns", or one: a button that opens a short, searchable list of the campaigns that have clips. */
function CampaignPicker({ options, value, onChange }: { options: CampaignOption[]; value: string | null; onChange: (id: string | null) => void }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const root = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const chosen = options.find((o) => o.id === value)
  const list = q.trim() ? options.filter((o) => `${o.title} ${o.creator}`.toLowerCase().includes(q.trim().toLowerCase())) : options

  useEffect(() => {
    if (!open) return
    setQ('')
    const t = window.setTimeout(() => input.current?.focus(), 40)
    const away = (e: MouseEvent) => root.current && !root.current.contains(e.target as Node) && setOpen(false)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', away)
    window.addEventListener('keydown', esc)
    return () => (window.clearTimeout(t), document.removeEventListener('mousedown', away), window.removeEventListener('keydown', esc))
  }, [open])

  const pick = (id: string | null) => {
    setOpen(false)
    if (id !== value) onChange(id)
  }

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn('inline-flex h-11 max-w-[16rem] items-center gap-2 rounded-pill border px-4 text-sm backdrop-blur-xl transition-colors', chosen ? 'border-paper/60 bg-paper/[0.1]' : 'border-line-strong bg-black/40 hover:bg-white/[0.06]')}
      >
        <span className="truncate">{chosen ? chosen.title : 'All campaigns'}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.25 }}><ChevronDown className="size-4 text-mute" /></motion.span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.2, ease: EASE_OUT }}
            className="absolute top-full left-0 z-30 mt-2 w-[min(20rem,calc(100vw-2.5rem))] origin-top-left overflow-hidden rounded-3xl border border-white/12 bg-[#0c0c0f]/95 shadow-[0_40px_90px_-30px_rgb(0_0_0/0.95)] backdrop-blur-xl"
          >
            <label className="flex items-center gap-2 border-b border-line px-4">
              <Search aria-hidden="true" className="size-4 text-mute" />
              <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a campaign" aria-label="Find a campaign" className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-mute" />
            </label>
            <ul role="listbox" aria-label="Campaign" className="max-h-72 overflow-y-auto p-1.5">
              {!q.trim() && <Option on={!value} onClick={() => pick(null)} title="All campaigns" sub={`${options.reduce((n, o) => n + o.clips, 0)} clips`} />}
              {list.map((o) => <Option key={o.id} on={o.id === value} onClick={() => pick(o.id)} title={o.title} sub={`${o.creator} · ${o.clips} clip${o.clips === 1 ? '' : 's'}`} />)}
              {list.length === 0 && <li className="px-3 py-6 text-center text-sm text-mute">No campaign by that name.</li>}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Option({ on, onClick, title, sub }: { on: boolean; onClick: () => void; title: string; sub: string }) {
  return (
    <li role="option" aria-selected={on}>
      <button type="button" onClick={onClick} className={cn('flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-white/[0.07]', on && 'bg-white/[0.06]')}>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm">{title}</span>
          <span className="block truncate text-xs text-mute">{sub}</span>
        </span>
        {on && <Check className="size-4 shrink-0" />}
      </button>
    </li>
  )
}
