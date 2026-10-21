'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ArrowDownWideNarrow, Check, CircleCheck, Loader2, Lock, Pin, Plus, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { BadgeArt, RARITY_STYLE } from '@/components/badges/badge-art'
import { BadgeBoard, RARITY_BORDER } from '@/components/badges/badge-board'
import { PanelSkeleton } from '@/components/app/ui'
import { GlassTabs } from '@/components/ui/glass-tabs'
import { Tilt3D } from '@/components/motion/tilt'
import { NAV_USER_REFRESH } from '@/components/shell/nav-user'
import { BADGES, MAX_EQUIPPED, type BadgeDef, type Rarity } from '@/lib/badges-defs'
import { EASE_OUT } from '@/lib/layout'
import { cn } from '@/lib/utils'

type Data = { unlocked: Record<string, number>; equipped: string[] }
type Filter = 'all' | 'unlocked' | 'locked'
const RARITIES: Rarity[] = ['common', 'rare', 'epic', 'legendary']
const when = (t: number) => new Date(t * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

function Ring({ value, total }: { value: number; total: number }) {
  const r = 52
  const c = 2 * Math.PI * r
  return (
    <div className="relative size-36 shrink-0">
      <svg viewBox="0 0 120 120" className="size-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="currentColor" strokeWidth="7" className="text-white/10" />
        <motion.circle cx="60" cy="60" r={r} fill="none" stroke="url(#ach-ring)" strokeWidth="7" strokeLinecap="round" strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - value / Math.max(1, total)) }} transition={{ duration: 1.3, ease: EASE_OUT }} />
        <defs>
          <linearGradient id="ach-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset=".5" stopColor="#c9c9d0" />
            <stop offset="1" stopColor="#8f8f98" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="font-display text-4xl leading-none tabular-nums">{value}<span className="text-xl text-mute">/{total}</span></p>
          <p className="mt-1 text-[10px] text-mute">unlocked</p>
        </div>
      </div>
    </div>
  )
}

export function AchievementsView({ board = false }: { board?: boolean }) {
  const [data, setData] = useState<Data | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [open, setOpen] = useState<BadgeDef | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [rarity, setRarity] = useState<Rarity | 'any'>('any')
  const [sort, setSort] = useState<'earned' | 'rarity' | 'name'>('earned')

  useEffect(() => {
    fetch('/api/me/achievements', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j: Data & { error?: string }) => (j.error ? setError(j.error) : setData(j)))
      .catch(() => setError('Could not load your achievements.'))
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const toggle = async (b: BadgeDef) => {
    if (!data || !(b.id in data.unlocked) || saving) return
    const has = data.equipped.includes(b.id)
    if (!has && data.equipped.length >= MAX_EQUIPPED) {
      setError(`You can show up to ${MAX_EQUIPPED} badges. Remove one first.`)
      return
    }
    setError('')
    const next = has ? data.equipped.filter((x) => x !== b.id) : [...data.equipped, b.id]
    setSaving(true)
    setData({ ...data, equipped: next })
    try {
      const res = await fetch('/api/me/profile', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ badges: next }) })
      if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? 'Could not save.')
      window.dispatchEvent(new Event(NAV_USER_REFRESH))
    } catch (e) {
      setData(data)
      setError(e instanceof Error ? e.message : 'Could not save.')
    } finally {
      setSaving(false)
    }
  }

  const setEquipped = async (next: string[]) => {
    if (!data) return
    const before = data
    setError('')
    setSaving(true)
    setData({ ...data, equipped: next })
    try {
      const res = await fetch('/api/me/profile', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ badges: next }) })
      if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? 'Could not save.')
      window.dispatchEvent(new Event(NAV_USER_REFRESH))
    } catch (e) {
      setData(before)
      setError(e instanceof Error ? e.message : 'Could not save.')
    } finally {
      setSaving(false)
    }
  }

  const shown = useMemo(
    () =>
      BADGES.filter((b) => {
        const got = data ? b.id in data.unlocked : false
        if (filter === 'unlocked' && !got) return false
        if (filter === 'locked' && got) return false
        if (rarity !== 'any' && b.rarity !== rarity) return false
        return true
      }).sort((a, b) => {
        const got = (x: BadgeDef) => Number(Boolean(data && x.id in data.unlocked))
        if (board && sort === 'rarity') return RARITIES.indexOf(b.rarity) - RARITIES.indexOf(a.rarity) || got(b) - got(a)
        if (board && sort === 'name') return a.name.localeCompare(b.name)
        return got(b) - got(a)
      }),
    [data, filter, rarity, sort, board],
  )

  if (!data) return <PanelSkeleton heights={[230, 60, 320]} error={error} />
  const count = Object.keys(data.unlocked).length
  const score = BADGES.filter((b) => b.id in data.unlocked).reduce((a, b) => a + b.points, 0)
  const maxScore = BADGES.reduce((a, b) => a + b.points, 0)

  return (
    <div>
      {/* ---------- the overview ---------- */}
      <motion.section initial={false} className="relative overflow-hidden rounded-[calc(2rem*var(--round,1))] border border-line-strong bg-[#0a0a0b] p-6 md:p-8">
        <div aria-hidden="true" className="pointer-events-none absolute -top-1/2 -right-1/4 size-[36rem] rounded-pill bg-[radial-gradient(closest-side,rgb(185_166_255/0.12),transparent)]" />
        <div className="relative grid gap-8 lg:grid-cols-[auto_1fr]">
          <div className="flex items-center gap-6">
            <Ring value={count} total={BADGES.length} />
            <div className="min-w-0">
              <p className="text-xs text-mute">Score</p>
              <p className="font-display text-5xl leading-none tabular-nums">{score}</p>
              <p className="mt-1 text-xs text-mute">of {maxScore} possible</p>
              <ul className="mt-4 grid gap-1.5">
                {RARITIES.map((r) => {
                  const total = BADGES.filter((b) => b.rarity === r).length
                  const got = BADGES.filter((b) => b.rarity === r && b.id in data.unlocked).length
                  return (
                    <li key={r} className="flex items-center gap-2 text-xs">
                      <span className="size-2 rounded-pill" style={{ background: RARITY_STYLE[r].glow.replace(/0\.\d+\)/, '1)') }} />
                      <span className={cn('w-16', RARITY_STYLE[r].text)}>{RARITY_STYLE[r].label}</span>
                      <span className="font-mono text-mute tabular-nums">{got}/{total}</span>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>

          {board ? (
            <BadgeBoard unlocked={Object.keys(data.unlocked)} equipped={data.equipped} onChange={setEquipped} saving={saving} />
          ) : (
          <div>
            <div className="mb-3 flex items-baseline justify-between">
              <p className="text-xs text-mute">On your profile</p>
              <p className="font-mono text-xs text-mute tabular-nums">
                {data.equipped.length}/{MAX_EQUIPPED} {saving && <Loader2 className="ml-1 inline size-3 animate-spin" />}
              </p>
            </div>
            <ul className="grid grid-cols-5 gap-2 sm:gap-3">
              {Array.from({ length: MAX_EQUIPPED }, (_, i) => {
                const id = data.equipped[i]
                const b = BADGES.find((x) => x.id === id)
                return (
                  <li key={i}>
                    {b ? (
                      <button type="button" onClick={() => setOpen(b)} aria-label={`${b.name}, on your profile`} className="group relative grid aspect-square w-full place-items-center rounded-2xl border border-line-strong bg-white/[0.03] transition-all hover:-translate-y-1 hover:bg-white/[0.06]">
                        <BadgeArt badge={b} size={84} className="max-w-[78%]" />
                      </button>
                    ) : (
                      <div className="grid aspect-square w-full place-items-center rounded-2xl border border-dashed border-line-strong text-mute/60">
                        <Plus className="size-5" />
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
            <p className="mt-3 text-xs text-mute">These show on your public profile. Open any unlocked badge to add or remove it.</p>
          </div>
          )}
        </div>
      </motion.section>
      {error && <p role="alert" className="mt-3 text-sm text-signal">{error}</p>}

      {/* ---------- filters ---------- */}
      <div className="mt-8 flex flex-wrap items-center gap-2">
        <GlassTabs compact label="Badge filter" className="mx-0" tabs={(['all', 'unlocked', 'locked'] as const).map((f) => ({ id: f, label: <span className="capitalize">{f}</span> }))} value={filter} onChange={(id) => setFilter(id as Filter)} />
        <span className="mx-2 hidden h-5 w-px bg-line-strong sm:block" />
        {(['any', ...RARITIES] as const).map((r) => (
          <button key={r} type="button" onClick={() => setRarity(r)} aria-pressed={rarity === r} className={cn('inline-flex h-9 items-center rounded-pill border px-3.5 text-xs transition-colors', rarity === r ? 'border-paper bg-paper/10 text-paper' : 'border-line-strong text-mute hover:text-paper')}>
            {r === 'any' ? 'Every rarity' : RARITY_STYLE[r].label}
          </button>
        ))}
        {board && (
          <label className="ml-auto inline-flex h-9 items-center gap-2 rounded-pill border border-line-strong pr-2 pl-3.5 text-xs text-mute">
            <ArrowDownWideNarrow className="size-3.5" />
            <span className="sr-only">Sort by</span>
            <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="bg-transparent text-paper outline-none">
              <option value="earned">Earned first</option>
              <option value="rarity">Rarest first</option>
              <option value="name">A to Z</option>
            </select>
          </label>
        )}
      </div>

      {/* ---------- the badges ---------- */}
      {board ? (
        <BadgeGrid shown={shown} data={data} onOpen={setOpen} />
      ) : (
      <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
        <AnimatePresence mode="popLayout">
          {shown.map((b, i) => {
            const got = b.id in data.unlocked
            const on = data.equipped.includes(b.id)
            const R = RARITY_STYLE[b.rarity]
            return (
              <motion.li key={b.id} layout initial={false} exit={{ opacity: 0, scale: 0.94 }} transition={{ delay: Math.min(i * 0.03, 0.4), duration: 0.5, ease: EASE_OUT }}>
                <Tilt3D max={7} glare={false} className="rounded-[calc(1.75rem*var(--round,1))]">
                  <button
                    type="button"
                    onClick={() => setOpen(b)}
                    className={cn('group relative flex w-full flex-col items-center overflow-hidden rounded-[calc(1.75rem*var(--round,1))] border bg-[#0b0b0d] px-3 pt-6 pb-4 text-center transition-colors', got ? R.ring : 'border-line', on && 'ring-1 ring-paper/70')}
                  >
                    {got && <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-2/3" style={{ background: `radial-gradient(70% 70% at 50% 28%, ${R.glow}, transparent)` }} />}
                    <span className="relative">
                      <BadgeArt badge={b} size={118} locked={!got} />
                    </span>
                    <span className="relative mt-3 text-[15px] leading-tight font-medium">{b.name}</span>
                    <span className={cn('relative mt-1 text-[10px]', got ? R.text : 'text-mute')}>{R.label}</span>
                    <span className="relative mt-2 line-clamp-2 min-h-8 text-xs leading-snug text-mute">{b.how}</span>
                    <span className={cn('relative mt-3 inline-flex h-7 items-center gap-1 rounded-pill px-3 text-[11px]', on ? 'bg-paper text-ink' : got ? 'bg-white/[0.07] text-paper' : 'bg-transparent text-mute')}>
                      {on ? <><Check className="size-3" /> On your profile</> : got ? 'Unlocked' : `${b.points} points`}
                    </span>
                  </button>
                </Tilt3D>
              </motion.li>
            )
          })}
        </AnimatePresence>
      </ul>
      )}
      {shown.length === 0 && <p className="mt-10 text-center text-sm text-mute">Nothing here yet. Try another filter.</p>}

      {/* ---------- one badge, big ---------- */}
      <AnimatePresence>
        {open && (
          <motion.div key="dlg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[90] grid place-items-center bg-black/75 px-4 backdrop-blur-sm" onClick={() => setOpen(null)}>
            {(() => {
              const b = open
              const got = b.id in data.unlocked
              const on = data.equipped.includes(b.id)
              const R = RARITY_STYLE[b.rarity]
              return (
                <motion.div
                  role="dialog"
                  aria-modal="true"
                  aria-label={b.name}
                  initial={{ opacity: 0, y: 28, scale: 0.94 }}
                  animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: EASE_OUT } }}
                  exit={{ opacity: 0, y: 12, scale: 0.97, transition: { duration: 0.18 } }}
                  onClick={(e) => e.stopPropagation()}
                  className="relative w-full max-w-sm overflow-hidden rounded-[calc(2rem*var(--round,1))] border border-line-strong bg-[#0b0b0d] p-6 text-center"
                >
                  <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-72" style={{ background: `radial-gradient(60% 60% at 50% 38%, ${R.glow}, transparent)` }} />
                  <button type="button" aria-label="Close" onClick={() => setOpen(null)} className="absolute top-4 right-4 z-10 grid size-9 place-items-center rounded-pill hover:bg-white/10">
                    <X className="size-4" />
                  </button>
                  <Tilt3D max={12} glare={false} className="relative mx-auto w-fit">
                    <BadgeArt badge={b} size={230} locked={!got} animated />
                  </Tilt3D>
                  <p className={cn('relative mt-4 text-[11px]', got ? R.text : 'text-mute')}>{R.label} · {b.points} points</p>
                  <h2 className="relative mt-1 font-display text-3xl">{b.name}</h2>
                  <p className="relative mx-auto mt-2 max-w-[18rem] text-sm leading-relaxed text-mute">{b.how}</p>
                  <p className="relative mt-3 text-xs text-mute">{got ? `Unlocked ${when(data.unlocked[b.id])}` : 'Not unlocked yet'}</p>
                  {got ? (
                    <button type="button" disabled={saving} onClick={() => toggle(b)} className={cn('relative mt-5 inline-flex h-11 items-center gap-2 rounded-pill px-6 text-sm font-medium transition-colors disabled:opacity-50', on ? 'border border-line-strong hover:bg-white/10' : 'bg-paper text-ink hover:bg-paper/85')}>
                      {saving && <Loader2 className="size-4 animate-spin" />}
                      {on ? 'Remove from my profile' : 'Show on my profile'}
                    </button>
                  ) : (
                    <p className="relative mt-5 rounded-2xl border border-line bg-white/[0.03] px-4 py-3 text-xs text-mute">Keep using logoless and this one will unlock by itself.</p>
                  )}
                </motion.div>
              )
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * Square tiles in a plain grid (no layout animation, so re-sorting never leaves gaps). Every tile has its rarity's
 * own border colour, and a clear mark for its state: a tick for earned, a pin for on your profile, a lock otherwise.
 */
function BadgeGrid({ shown, data, onOpen }: { shown: BadgeDef[]; data: Data; onOpen: (b: BadgeDef) => void }) {
  return (
    <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 2xl:grid-cols-6">
      {shown.map((b) => {
        const got = b.id in data.unlocked
        const on = data.equipped.includes(b.id)
        const R = RARITY_STYLE[b.rarity]
        return (
          <li key={b.id} className="min-w-0">
            <button
              type="button"
              onClick={() => onOpen(b)}
              aria-label={`${b.name}, ${R.label}. ${on ? 'On your profile.' : got ? 'Earned.' : 'Not earned yet.'}`}
              className={cn('group relative flex aspect-square w-full flex-col items-center justify-center overflow-hidden rounded-[calc(1.5rem*var(--round,1))] border-2 bg-[#0b0b0d] p-3 text-center transition-all hover:-translate-y-0.5', b.rarity === 'legendary' && got && 'shadow-[0_0_30px_-10px_rgb(255_255_255/0.5)]')}
              style={{ borderColor: got ? RARITY_BORDER[b.rarity] : RARITY_BORDER[b.rarity].replace(/[\d.]+\)$/, '0.22)'), borderStyle: got ? 'solid' : 'dashed' }}
            >
              {got && <span aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(70% 60% at 50% 35%, ${RARITY_BORDER[b.rarity].replace(/[\d.]+\)$/, '0.16)')}, transparent)` }} />}
              <span className="absolute top-2.5 left-2.5" title={got ? 'Earned' : 'Not earned yet'}>
                {got ? <CircleCheck className="size-[18px] text-paper" /> : <Lock className="size-4 text-mute" />}
              </span>
              {on && (
                <span className="absolute top-2 right-2 inline-flex h-6 items-center gap-1 rounded-pill bg-paper px-2 text-[10px] font-medium text-ink" title="On your profile">
                  <Pin className="size-3" /> On profile
                </span>
              )}
              <BadgeArt badge={b} size={96} locked={!got} className="relative max-w-[56%]" />
              <span className="relative mt-2 line-clamp-1 text-sm leading-tight font-medium">{b.name}</span>
              <span className="relative mt-0.5 text-[10px] font-medium tracking-wide uppercase" style={{ color: got ? RARITY_BORDER[b.rarity].replace(/[\d.]+\)$/, '1)') : undefined }}>
                {R.label}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
