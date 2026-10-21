'use client'

import { animate, AnimatePresence, LayoutGroup, motion } from 'framer-motion'
import { ArrowUpRight, Crown, Eye, Film, Megaphone, Music2, Star, Wallet } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Reveal } from '@/components/motion/reveal'
import { TransitionLink } from '@/components/shell/transition-link'
import { GlassTabs } from '@/components/ui/glass-tabs'
import { compact, Face, PlatformIcon, StarsAverage } from '@/components/submissions/bits'
import { EASE_OUT } from '@/lib/layout'
import type { Board, ClipStat, Person, StatsRange } from '@/lib/stats-board'
import { cn } from '@/lib/utils'

const RANGES: { id: StatsRange; label: string }[] = [
  { id: 'week', label: 'This week' },
  { id: 'month', label: 'This month' },
  { id: 'all', label: 'All time' },
]
const usd = (cents: number) => `$${cents >= 100_000_00 ? compact(Math.round(cents / 100)) : Math.round(cents / 100).toLocaleString('en-US')}`
const SPRING = { type: 'spring', stiffness: 380, damping: 36 } as const

/** A number that, when it changes, counts from the old value to the new one. The first time it is simply there. */
function Count({ value, format = compact }: { value: number; format?: (n: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const last = useRef(value)
  useEffect(() => {
    const from = last.current
    last.current = value
    if (from === value || !ref.current) return
    const el = ref.current
    const c = animate(from, value, { duration: 0.9, ease: EASE_OUT, onUpdate: (v) => (el.textContent = format(Math.round(v))) })
    return () => c.stop()
  }, [value, format])
  return <span ref={ref}>{format(value)}</span>
}

/**
 * The stats page: totals, then a leaderboard for everything. Switching between this week, this month and all time fetches the new
 * numbers and lets every list glide into its new order; nobody is listed by a number they keep private.
 */
export function StatsBoard({ initial }: { initial: Board }) {
  const [board, setBoard] = useState(initial)
  const [range, setRange] = useState<StatsRange>(initial.range)
  const [busy, setBusy] = useState(false)
  const gen = useRef(0)

  const pick = useCallback(async (r: StatsRange) => {
    const g = ++gen.current
    setRange(r)
    setBusy(true)
    window.history.replaceState(window.history.state, '', r === 'month' ? '/stats' : `/stats?range=${r}`)
    try {
      const res = await fetch(`/api/stats?range=${r}`)
      if (!res.ok) throw new Error()
      const j = (await res.json()) as Board
      if (g === gen.current) setBoard(j)
    } catch {
      if (g === gen.current) setRange(board.range)
    } finally {
      if (g === gen.current) setBusy(false)
    }
  }, [board.range])

  const t = board.totals
  const tiles = [
    { label: 'Views generated', value: t.views, icon: Eye },
    { label: 'Clips approved', value: t.clips, icon: Film },
    { label: 'Creators clipping', value: t.clippers, icon: Crown },
    { label: 'Paid to creators', value: t.paidCents, icon: Wallet, format: usd },
    { label: 'Live campaigns', value: t.liveCampaigns, icon: Megaphone },
    { label: 'Clips rated', value: t.ratings, icon: Star },
  ]

  return (
    <div>
      <header className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs text-mute">Stats</p>
          <h1 className="mt-4 font-display text-[clamp(2.8rem,7vw,5.6rem)] leading-[0.95] tracking-tight">The numbers, live.</h1>
          <p className="mt-5 max-w-xl text-pretty text-lg leading-relaxed text-paper/65">Who is bringing in the views, which clips are flying and which campaigns are biggest. People only appear by the numbers they chose to show.</p>
        </div>
        <GlassTabs label="Time range" className="mx-0 shrink-0" value={range} onChange={(id) => pick(id as StatsRange)} tabs={RANGES} />
      </header>

      <motion.div animate={{ opacity: busy ? 0.55 : 1 }} transition={{ duration: 0.25 }} aria-busy={busy}>
        <ul className="mt-12 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {tiles.map((x) => (
            <li key={x.label} className="relative overflow-hidden rounded-card border border-line bg-white/[0.03] p-4 md:p-5">
              <x.icon aria-hidden="true" className="size-4 text-mute" />
              <p className="mt-6 font-display text-3xl tabular-nums md:text-4xl"><Count value={x.value} format={x.format} /></p>
              <p className="mt-1 text-xs text-mute">{x.label}</p>
            </li>
          ))}
        </ul>

        <LayoutGroup>
          <People board={board} />

          <Section title="Most viewed clips" sub="From creators who show their views." href="/submissions?sort=views" more="All clips">
            <ClipRow clips={board.clips} metric="views" empty="No clips with views in this range yet." />
          </Section>

          {board.rated.length > 0 && (
            <Section title="Highest rated" sub="Rated by the people watching on the submissions page." href="/submissions?sort=top" more="Rate clips">
              <ClipRow clips={board.rated} metric="stars" empty="" />
            </Section>
          )}

          <div className="mt-24 grid gap-16 lg:grid-cols-2 lg:gap-10 [&>*]:min-w-0">
            <Section title="Biggest campaigns" sub="By views from every clip, together." inline>
              {board.campaigns.length === 0 ? <Nothing text="No campaign has clips in this range yet." /> : (
                <ol className="grid grid-cols-[minmax(0,1fr)] gap-2">
                  <AnimatePresence initial={false}>
                    {board.campaigns.map((c, i) => (
                      <Row key={c.id} layoutKey={`camp-${c.id}`} rank={i + 1} href={`/campaign/${c.id}`} share={c.views / (board.campaigns[0]?.views || 1)}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={c.cover} alt="" className="size-11 shrink-0 rounded-panel object-cover" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[15px]">{c.title}</span>
                          <span className="block truncate text-xs text-mute">{c.creator} · {c.clips} clip{c.clips === 1 ? '' : 's'} · {c.clippers} creator{c.clippers === 1 ? '' : 's'}</span>
                        </span>
                        <Metric icon={Eye} value={c.views} />
                      </Row>
                    ))}
                  </AnimatePresence>
                </ol>
              )}
            </Section>
            <Section title="Top artists" sub="The artists whose campaigns pulled the most views." inline>
              {board.artists.length === 0 ? <Nothing text="No artist has clips in this range yet." /> : (
                <ol className="grid grid-cols-[minmax(0,1fr)] gap-2">
                  <AnimatePresence initial={false}>
                    {board.artists.map((a, i) => (
                      <Row key={a.name} layoutKey={`artist-${a.name}`} rank={i + 1} share={a.views / (board.artists[0]?.views || 1)}>
                        <span className="relative size-11 shrink-0 overflow-hidden rounded-pill">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={a.cover} alt="" className="size-full object-cover" />
                          <Music2 aria-hidden="true" className="absolute right-0.5 bottom-0.5 size-3.5 rounded-pill bg-black/60 p-0.5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[15px]">{a.name}</span>
                          <span className="block truncate text-xs text-mute">{a.campaigns} campaign{a.campaigns === 1 ? '' : 's'} · {a.clips} clip{a.clips === 1 ? '' : 's'}</span>
                        </span>
                        <Metric icon={Eye} value={a.views} />
                      </Row>
                    ))}
                  </AnimatePresence>
                </ol>
              )}
            </Section>
          </div>
        </LayoutGroup>
      </motion.div>

      <Reveal className="mt-24 rounded-card border border-line bg-white/[0.03] px-6 py-10 text-center md:py-14">
        <p className="font-display text-3xl md:text-4xl">Want to be on here?</p>
        <p className="mx-auto mt-3 max-w-md text-sm text-mute">Clip a campaign, get your clips approved, then choose which of your numbers to show in your profile privacy settings.</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <TransitionLink href="/" className="inline-flex h-11 items-center rounded-pill bg-paper px-6 text-sm font-medium text-ink transition-colors hover:bg-paper/85">Find a campaign</TransitionLink>
          <TransitionLink href="/dashboard/profile" className="inline-flex h-11 items-center rounded-pill border border-line-strong px-6 text-sm transition-colors hover:bg-white/[0.06]">Privacy settings</TransitionLink>
        </div>
      </Reveal>
    </div>
  )
}

function Section({ title, sub, href, more, inline, children }: { title: string; sub: string; href?: string; more?: string; inline?: boolean; children: React.ReactNode }) {
  return (
    <Reveal className={inline ? '' : 'mt-24'}>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl tracking-tight md:text-4xl">{title}</h2>
          <p className="mt-1.5 text-sm text-mute">{sub}</p>
        </div>
        {href && more && (
          <TransitionLink href={href} className="group inline-flex shrink-0 items-center gap-1 text-sm text-mute transition-colors hover:text-paper">
            {more} <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </TransitionLink>
        )}
      </div>
      {children}
    </Reveal>
  )
}

function Nothing({ text }: { text: string }) {
  return <p className="rounded-card border border-dashed border-line-strong px-6 py-10 text-center text-sm text-mute">{text}</p>
}

function Metric({ icon: Icon, value, format }: { icon: typeof Eye; value: number; format?: (n: number) => string }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 font-mono text-sm tabular-nums">
      <Icon aria-hidden="true" className="size-3.5 text-mute" />
      <Count value={value} format={format} />
    </span>
  )
}

/** A ranked row. Its faint bar shows how close it is to first place, and it glides to its new place when the range changes. */
function Row({ rank, href, share, layoutKey, children }: { rank: number; href?: string; share: number; layoutKey: string; children: React.ReactNode }) {
  const inner = (
    <>
      <span aria-hidden="true" className="absolute inset-y-0 left-0 rounded-[inherit] bg-white/[0.045] transition-[width] duration-700 ease-[cubic-bezier(.22,1,.36,1)]" style={{ width: `${Math.max(6, Math.min(100, share * 100))}%` }} />
      <span className="relative w-6 text-center font-mono text-sm text-mute tabular-nums">{rank}</span>
      <span className="relative flex min-w-0 flex-1 items-center gap-3">{children}</span>
    </>
  )
  const cls = 'relative flex items-center gap-3 overflow-hidden rounded-2xl border border-line px-3 py-2.5 transition-colors'
  return (
    <motion.li layout="position" layoutId={layoutKey} initial={false} exit={{ opacity: 0, transition: { duration: 0.2 } }} transition={SPRING}>
      {href ? <TransitionLink href={href} className={cn(cls, 'hover:bg-white/[0.05]')}>{inner}</TransitionLink> : <div className={cls}>{inner}</div>}
    </motion.li>
  )
}

const MEDAL = ['from-[#f3f2ee] to-[#c9c9cf]', 'from-[#d4d4d8] to-[#9a9aa3]', 'from-[#a1a1aa] to-[#74747d]']
type RankBy = 'views' | 'earners' | 'clippers'
const METRICS: { id: RankBy; label: string; unit: (p: Person) => string; empty: string }[] = [
  { id: 'views', label: 'Views', unit: (p) => `${compact(p.value)} views`, empty: 'Turn on “Views generated” in your profile privacy settings to be listed here.' },
  { id: 'earners', label: 'Earned', unit: (p) => usd(p.value), empty: 'Turn on “Total earned” in your profile privacy settings to be listed here.' },
  { id: 'clippers', label: 'Submissions', unit: (p) => `${p.value} clip${p.value === 1 ? '' : 's'}`, empty: 'Nobody has an approved clip in this range yet.' },
]

/** The creators: a podium for the top three by the chosen number, then places four to ten. */
function People({ board }: { board: Board }) {
  const [metric, setMetric] = useState<RankBy>('views')
  // the podium the server drew is simply there; after a switch, the new one rises
  const [switched, setSwitched] = useState(false)
  const m = METRICS.find((x) => x.id === metric)!
  const list = board[metric]
  const top = list.slice(0, 3)
  const rest = list.slice(3)
  const lead = list[0]?.value || 1
  return (
    <Section title="Top creators" sub="Only the numbers each creator chose to make public.">
      <GlassTabs label="Rank creators by" compact className="mx-0" value={metric} onChange={(id) => (setMetric(id as RankBy), setSwitched(true))} tabs={METRICS.map((x) => ({ id: x.id, label: x.label }))} />
      {list.length === 0 ? (
        <div className="mt-6"><Nothing text={`Nobody here yet. ${m.empty}`} /></div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-end [&>*]:min-w-0">
          <ol className="grid grid-cols-3 items-end gap-3 md:gap-5">
            {[1, 0, 2].map((idx, col) => {
              const p = top[idx]
              if (!p) return <li key={`gap-${col}`} />
              const first = idx === 0
              return (
                <motion.li key={`${metric}-${p.handle}`} layout="position" initial={switched ? { opacity: 0, y: 16 } : false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE_OUT, delay: col * 0.06 }}>
                  <TransitionLink href={`/@${p.handle}`} className="group flex flex-col items-center text-center">
                    <span className="relative">
                      {first && <Crown aria-hidden="true" className="absolute -top-7 left-1/2 size-6 -translate-x-1/2 text-paper" />}
                      <Face src={p.avatar} name={p.name} size={first ? 88 : 64} className="ring-2" />
                    </span>
                    <span className="mt-3 max-w-full truncate text-[15px] font-medium group-hover:underline">{p.name}</span>
                    <span className="max-w-full truncate text-xs text-mute">@{p.handle}</span>
                    <motion.span
                      initial={switched ? { scaleY: 0.4, opacity: 0.4 } : false}
                      animate={{ scaleY: 1, opacity: 1 }}
                      transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.1 + col * 0.06 }}
                      className={cn('mt-4 flex w-full origin-bottom flex-col items-center rounded-t-3xl bg-gradient-to-b px-2 pt-4 text-ink', MEDAL[idx], first ? 'h-40' : idx === 1 ? 'h-28' : 'h-20')}
                    >
                      <span className="font-display text-4xl leading-none">{idx + 1}</span>
                      <span className="mt-1 font-mono text-[11px] font-medium">{m.unit(p)}</span>
                    </motion.span>
                  </TransitionLink>
                </motion.li>
              )
            })}
          </ol>
          {rest.length > 0 && (
            <ol className="grid grid-cols-[minmax(0,1fr)] gap-2" start={4}>
              <AnimatePresence initial={false}>
                {rest.map((p, i) => (
                  <Row key={`${metric}-${p.handle}`} layoutKey={`${metric}-${p.handle}`} rank={i + 4} href={`/@${p.handle}`} share={p.value / lead}>
                    <Face src={p.avatar} name={p.name} size={36} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px]">{p.name}</span>
                      <span className="block truncate text-xs text-mute">@{p.handle}</span>
                    </span>
                    <span className="shrink-0 font-mono text-sm tabular-nums">{m.unit(p)}</span>
                  </Row>
                ))}
              </AnimatePresence>
            </ol>
          )}
        </div>
      )}
    </Section>
  )
}

/** Clips as a row of phone-shaped cards with a big rank number, scrolling sideways on small screens. */
function ClipRow({ clips, metric, empty }: { clips: ClipStat[]; metric: 'views' | 'stars'; empty: string }) {
  if (clips.length === 0) return <Nothing text={empty} />
  return (
    <ol className="no-scrollbar -mx-5 flex snap-x gap-3 overflow-x-auto px-5 pb-2 md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0 xl:grid-cols-8">
      <AnimatePresence initial={false} mode="popLayout">
        {clips.map((c, i) => (
          <motion.li key={c.id} layout="position" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={SPRING} className="w-[42vw] max-w-[11rem] shrink-0 snap-start md:w-auto md:max-w-none">
            <TransitionLink href={`/@${c.by.handle}`} className="group block">
              <span className="relative block aspect-[9/16] overflow-hidden rounded-[calc(20px*var(--round,1))] bg-surface ring-1 ring-white/[0.07]">
                {c.thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.thumb} alt="" loading="lazy" referrerPolicy="no-referrer" className="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-[1.05]" />
                ) : (
                  <span className="absolute inset-0 grid place-items-center bg-gradient-to-b from-white/[0.06] to-transparent"><PlatformIcon platform={c.platform} className="size-8 text-white/60" /></span>
                )}
                <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/85" />
                <span aria-hidden="true" className="absolute top-1 left-2.5 font-display text-5xl leading-none text-paper/90 [-webkit-text-stroke:1px_rgb(0_0_0/0.25)] [text-shadow:0_4px_20px_rgb(0_0_0/0.6)]">{i + 1}</span>
                <span className="absolute top-2.5 right-2.5 grid size-7 place-items-center rounded-pill bg-black/45 backdrop-blur-md"><PlatformIcon platform={c.platform} className="size-3.5" /></span>
                <span className="absolute inset-x-0 bottom-0 p-2.5">
                  <span className="flex items-center gap-1.5 font-mono text-xs tabular-nums">
                    {metric === 'views' ? (<><Eye className="size-3.5 opacity-75" />{compact(c.views)}</>) : (<><StarsAverage avg={c.avg} size={10} />{c.avg.toFixed(1)}<span className="text-paper/60">({c.ratings})</span></>)}
                  </span>
                  <span className="mt-1.5 flex items-center gap-1.5">
                    <Face src={c.by.avatar} name={c.by.name} size={20} />
                    <span className="truncate text-xs">{c.by.name}</span>
                  </span>
                </span>
              </span>
              <span className="mt-2 block truncate px-0.5 text-xs text-mute">{c.campaign}</span>
            </TransitionLink>
          </motion.li>
        ))}
      </AnimatePresence>
    </ol>
  )
}
