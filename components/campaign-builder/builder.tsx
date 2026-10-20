'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Check, ChevronLeft, Loader2, Plus, Wallet } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { BrandIcon } from '@/components/brand-icon'
import { Ask, BigArea, BigInput, Chip, Label, Rise } from '@/components/invite/bits'
import { useTransitions } from '@/components/shell/transition-provider'
import { budgetPlan, cleanLinks, type BudgetMode, soundLink, spotifyLink } from '@/lib/campaign-extras-shared'
import { startDeposit } from '@/lib/finance-client'
import { costFor, startNeeded } from '@/lib/ledger-math'
import { EASE_OUT } from '@/lib/layout'
import { SITE } from '@/lib/site'
import { cn } from '@/lib/utils'
import { BudgetPicker } from './budget-picker'
import { ArtPicker, AudioPicker, LinkList } from './music-pickers'

const STEPS = [
  { id: 'basics', title: 'The basics' },
  { id: 'audio', title: 'The audio' },
  { id: 'look', title: 'Cover and background' },
  { id: 'brief', title: 'The brief' },
  { id: 'budget', title: 'Budget' },
  { id: 'funds', title: 'Funds' },
  { id: 'review', title: 'Review' },
] as const
type StepId = (typeof STEPS)[number]['id']

const TYPES = ['Music', 'Streamer', 'Podcast', 'Brand', 'Sport', 'Other'] as const
const KINDS: Record<string, string[]> = {
  Music: ['Single', 'Album or EP', 'Music video', 'Tour or show'],
  Streamer: ['Highlights', 'Live moments', 'Announcement'],
  Podcast: ['Episode', 'Best moments'],
  Brand: ['Product', 'Launch', 'Event'],
  Sport: ['Highlights', 'Event'],
  Other: [],
}
const PLATFORMS = [
  { id: 'tiktok', label: 'TikTok' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'youtube', label: 'YouTube' },
] as const
const IDEAS = ['The chorus or hook', 'Behind the scenes', 'Lyric edits', 'Live performance', 'Fan reactions', 'Funny or relatable moments']
const DRAFT = 'll:draft:campaign-builder'

const BLANK = {
  title: '',
  creator: '',
  type: 'Music',
  subtype: '',
  platforms: ['tiktok', 'instagram', 'youtube'] as string[],
  spotify: [] as string[],
  sounds: [] as string[],
  audioNote: '',
  audio: '',
  cover: '',
  background: '',
  bio: '',
  summary: '',
  clipThis: '',
  offLimits: '',
  assets: '',
  budget: '500',
  mode: 'views' as BudgetMode,
  rate: '2',
  views: '250000',
  endsOn: '',
  capPerPost: '',
  capPerUser: '',
}
type Draft = typeof BLANK

const lines = (v: string) => v.split('\n').map((x) => x.trim()).filter(Boolean)
const usd = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`
const money = (c: number) => `$${(c / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/** Restores a saved draft, field by field, so an old or damaged draft can never break the page. */
function restore(raw: unknown): Draft | null {
  if (!raw || typeof raw !== 'object') return null
  const v = raw as Record<string, unknown>
  const out = { ...BLANK } as Record<string, unknown>
  for (const k of Object.keys(BLANK) as (keyof Draft)[]) {
    const want = BLANK[k]
    const got = v[k]
    if (Array.isArray(want)) out[k] = Array.isArray(got) ? got.filter((x) => typeof x === 'string').slice(0, 8) : want
    else if (typeof got === typeof want) out[k] = got
  }
  if (out.mode !== 'views' && out.mode !== 'rate') out.mode = 'views'
  return out as Draft
}

/**
 * Making a campaign, one step at a time: the basics, the audio, the artwork, the brief, the budget (as views for a price, or a
 * rate), funds, then a last look. What is typed is kept on this device, so coming back from PayPal or a refresh loses nothing.
 */
export function CampaignBuilder({ balanceCents, paypalReady, startAt }: { balanceCents: number; paypalReady: boolean; startAt?: string }) {
  const { navigate } = useTransitions()
  const [d, setD] = useState<Draft>(BLANK)
  const [step, setStep] = useState(0)
  const [reached, setReached] = useState(0)
  const [dir, setDir] = useState(1)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [restored, setRestored] = useState(false)
  const [topUp, setTopUp] = useState('')
  const ready = useRef(false)
  const top = useRef<HTMLDivElement>(null)
  const current = STEPS[step]

  useEffect(() => {
    try {
      const saved = restore(JSON.parse(window.localStorage.getItem(DRAFT) ?? 'null'))
      if (saved && (saved.title || saved.summary)) {
        setD(saved)
        setRestored(true)
      }
      const at = STEPS.findIndex((s) => s.id === startAt)
      if (saved && at > 0) {
        setStep(at)
        setReached(at)
      }
    } catch {
      /* storage is blocked: start fresh */
    }
    ready.current = true
  }, [startAt])
  useEffect(() => {
    if (!ready.current) return
    const t = window.setTimeout(() => {
      try {
        if (d.title || d.summary) window.localStorage.setItem(DRAFT, JSON.stringify(d))
      } catch {
        /* a private window just forgets */
      }
    }, 400)
    return () => window.clearTimeout(t)
  }, [d])

  const set = (p: Partial<Draft>) => {
    setD((s) => ({ ...s, ...p }))
    setError('')
  }
  const budget = Number(d.budget) || 0
  const plan = budgetPlan(d.mode, budget, Number(d.rate) || 0, Number(d.views) || 0)
  const budgetCents = Math.round(budget * 100)
  const need = startNeeded(budgetCents)
  const short = Math.max(0, need - balanceCents)
  const music = d.type === 'Music'

  const linksOk = (list: string[], check: typeof spotifyLink) => list.every((l) => !l.trim() || 'url' in check(l))
  const valid: Record<StepId, boolean> = {
    basics: d.title.trim().length >= 2 && d.creator.trim().length >= 2 && d.platforms.length > 0,
    audio: linksOk(d.spotify, spotifyLink) && linksOk(d.sounds, soundLink),
    look: true,
    brief: d.summary.trim().length >= 20,
    budget: !plan.problem && budget >= SITE.minCampaignBudgetUsd && budget <= SITE.maxTopUpUsd * 10,
    funds: true,
    review: true,
  }
  const firstBad = STEPS.findIndex((s) => !valid[s.id])

  const go = useCallback((to: number) => {
    setDir(to >= step ? 1 : -1)
    setError('')
    setStep(to)
    setReached((r) => Math.max(r, to))
    top.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }, [step])

  const next = () => {
    if (!valid[current.id] || busy) return
    if (current.id === 'review') return void publish()
    go(step + 1)
  }

  const addFunds = async (amount: number) => {
    setBusy(true)
    setError('')
    try {
      const { url } = await startDeposit(amount, '/brand/campaigns/new?step=funds')
      window.location.href = url
    } catch (e) {
      setBusy(false)
      setError(e instanceof Error ? e.message : 'Could not open PayPal.')
    }
  }

  const publish = async () => {
    if (firstBad >= 0) return go(firstBad)
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: d.title,
          creator: d.creator,
          type: d.type,
          subtype: d.subtype || undefined,
          cover: d.cover || null,
          platforms: d.platforms,
          summary: d.summary,
          clipThis: lines(d.clipThis).slice(0, 8).map((x) => x.slice(0, 140)),
          offLimits: lines(d.offLimits).slice(0, 8).map((x) => x.slice(0, 140)),
          rate: plan.rate,
          budget,
          endsOn: d.endsOn || null,
          ...(Number(d.capPerPost) > 0 ? { capPerPost: Number(d.capPerPost) } : {}),
          ...(Number(d.capPerUser) > 0 ? { capPerUser: Number(d.capPerUser) } : {}),
          extras: { spotify: cleanLinks(d.spotify, spotifyLink), sounds: cleanLinks(d.sounds, soundLink), audioNote: d.audioNote, audio: d.audio, background: d.background, bio: d.bio, assets: d.assets },
        }),
      })
      const j = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) throw new Error(j.error ?? 'Could not send your campaign.')
      try {
        window.localStorage.removeItem(DRAFT)
      } catch {
        /* ignore */
      }
      navigate('/brand/campaigns?requested=1')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send your campaign.')
      setBusy(false)
    }
  }

  const startOver = () => {
    try {
      window.localStorage.removeItem(DRAFT)
    } catch {
      /* ignore */
    }
    setD(BLANK)
    setRestored(false)
    go(0)
    setReached(0)
  }

  return (
    <div ref={top} className="scroll-mt-24 pb-32" onKeyDown={(e) => e.key === 'Enter' && !(e.target instanceof HTMLTextAreaElement) && !(e.target instanceof HTMLButtonElement) && (e.preventDefault(), next())}>
      {/* ---------- the steps ---------- */}
      <nav aria-label="Campaign steps" className="-mx-1 mb-8 overflow-x-auto px-1 pb-1">
        <ol className="flex min-w-max items-center gap-1.5">
          {STEPS.map((s, i) => {
            const active = i === step
            const done = i < step && valid[s.id]
            return (
              <li key={s.id} className="flex items-center gap-1.5">
                <button type="button" disabled={i > reached || busy} onClick={() => go(i)} aria-current={active ? 'step' : undefined} className={cn('relative inline-flex h-10 items-center gap-2 rounded-pill px-3.5 text-sm transition-colors', active ? 'text-paper' : i > reached ? 'text-mute/50' : 'text-mute hover:text-paper')}>
                  {active && <motion.span layoutId="builder-pill" transition={{ type: 'spring', stiffness: 420, damping: 34 }} className="absolute inset-0 rounded-pill bg-white/[0.12] shadow-[inset_0_1px_0_rgb(255_255_255/0.18)]" />}
                  <span className={cn('relative grid size-5 place-items-center rounded-pill border text-[10px]', done ? 'border-paper bg-paper text-ink' : active ? 'border-paper' : 'border-line-strong')}>{done ? <Check className="size-3" /> : i + 1}</span>
                  <span className="relative">{s.title}</span>
                </button>
                {i < STEPS.length - 1 && <span aria-hidden="true" className="h-px w-4 bg-line-strong" />}
              </li>
            )
          })}
        </ol>
      </nav>

      {restored && step === 0 && (
        <p role="status" className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl border border-line-strong bg-white/[0.03] px-5 py-3 text-sm">
          <span>We kept the campaign you were making.</span>
          <button type="button" onClick={startOver} className="text-paper/70 underline underline-offset-4 transition-colors hover:text-paper">
            Start over
          </button>
        </p>
      )}

      <div className="grid items-start gap-10 xl:grid-cols-[minmax(0,1fr)_320px]">
        <AnimatePresence mode="wait" initial={false} custom={dir}>
          <motion.section key={current.id} initial={{ opacity: 0, x: 32 * dir }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -32 * dir }} transition={{ duration: 0.32, ease: EASE_OUT }} className="min-w-0 max-w-2xl">
            {current.id === 'basics' && (
              <>
                <Ask sub="The name creators see, who it is for, and where submissions should be posted.">What are we promoting?</Ask>
                <div className="grid gap-6">
                  <Rise i={0}>
                    <BigInput label="Campaign name" value={d.title} maxLength={60} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. Red Room" autoFocus />
                  </Rise>
                  <Rise i={1}>
                    <BigInput label="Artist or brand" value={d.creator} maxLength={60} onChange={(e) => set({ creator: e.target.value })} placeholder="e.g. KXNG VALE" />
                  </Rise>
                  <Rise i={2}>
                    <Label>What kind of campaign?</Label>
                    <div className="flex flex-wrap gap-2">
                      {TYPES.map((t) => (
                        <Chip key={t} on={d.type === t} onClick={() => set({ type: t, subtype: '' })}>
                          {t}
                        </Chip>
                      ))}
                    </div>
                    {KINDS[d.type]?.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {KINDS[d.type].map((k) => (
                          <button key={k} type="button" aria-pressed={d.subtype === k} onClick={() => set({ subtype: d.subtype === k ? '' : k })} className={cn('inline-flex h-9 items-center rounded-pill border px-4 text-sm transition-colors', d.subtype === k ? 'border-paper/70 text-paper' : 'border-line-strong text-mute hover:text-paper')}>
                            {k}
                          </button>
                        ))}
                      </div>
                    )}
                  </Rise>
                  <Rise i={3}>
                    <Label>Where should submissions be posted?</Label>
                    <div className="flex flex-wrap gap-2">
                      {PLATFORMS.map((p) => {
                        const on = d.platforms.includes(p.id)
                        return (
                          <Chip key={p.id} on={on} onClick={() => set({ platforms: on ? d.platforms.filter((x) => x !== p.id) : [...d.platforms, p.id] })}>
                            <BrandIcon name={p.id} className="size-4" /> {p.label}
                          </Chip>
                        )
                      })}
                    </div>
                  </Rise>
                </div>
              </>
            )}

            {current.id === 'audio' && (
              <>
                <Ask sub={music ? 'Point creators at the official sound and your Spotify, and let them hear the part that matters.' : 'If there is a sound creators should use, add it here. You can skip this step.'}>{music ? 'Choose the audio.' : 'Any audio to use?'}</Ask>
                <div className="grid gap-7">
                  <Rise i={0}>
                    <LinkList label="Spotify links" hint="Optional · up to 6" icon="spotify" values={d.spotify} onChange={(v) => set({ spotify: v })} check={spotifyLink} max={6} placeholder="https://open.spotify.com/track/…" />
                  </Rise>
                  <Rise i={1}>
                    <AudioPicker sounds={d.sounds} audio={d.audio} audioNote={d.audioNote} onChange={(p) => set(p)} />
                  </Rise>
                </div>
              </>
            )}

            {current.id === 'look' && (
              <>
                <Ask sub="The cover is what creators see first. A wide background makes the campaign page feel like yours. Both can be changed later.">Show us the art.</Ask>
                <Rise i={0}>
                  <ArtPicker cover={d.cover} background={d.background} title={d.title} creator={d.creator} onChange={(p) => set(p)} />
                </Rise>
              </>
            )}

            {current.id === 'brief' && (
              <>
                <Ask sub="This is what creators read before they make anything. The clearer it is, the better the submissions.">Write the brief.</Ask>
                <div className="grid gap-6">
                  <Rise i={0}>
                    <BigArea label={music ? 'About the artist' : 'About you'} hint={`Optional · ${d.bio.length}/600`} value={d.bio} maxLength={600} rows={3} onChange={(e) => set({ bio: e.target.value })} placeholder="A few lines creators should know about you." />
                  </Rise>
                  <Rise i={1}>
                    <BigArea label="The vibe and the goal" hint={`${d.summary.length}/1500`} value={d.summary} maxLength={1500} rows={5} onChange={(e) => set({ summary: e.target.value })} placeholder="What is it about, who is it for, and what feeling should the submissions give?" />
                    {d.summary.trim().length > 0 && d.summary.trim().length < 20 && <p className="mt-2 text-sm text-mute">A little more, please: at least 20 characters.</p>}
                  </Rise>
                  <Rise i={2}>
                    <BigArea label="Ideas for creators" hint="One per line · optional" value={d.clipThis} rows={3} maxLength={1100} onChange={(e) => set({ clipThis: e.target.value })} placeholder="The chorus" />
                    <div className="mt-3 flex flex-wrap gap-2">
                      {IDEAS.filter((x) => !lines(d.clipThis).includes(x)).map((x) => (
                        <button key={x} type="button" onClick={() => set({ clipThis: [...lines(d.clipThis), x].join('\n') })} className="inline-flex h-8 items-center gap-1.5 rounded-pill border border-line-strong px-3 text-xs text-mute transition-colors hover:border-paper/50 hover:text-paper">
                          <Plus className="size-3" /> {x}
                        </button>
                      ))}
                    </div>
                  </Rise>
                  <Rise i={3}>
                    <BigArea label="Off limits" hint="One per line · optional" value={d.offLimits} rows={3} maxLength={1100} onChange={(e) => set({ offLimits: e.target.value })} placeholder="No sped-up versions of the track" />
                  </Rise>
                  <Rise i={4}>
                    <BigInput label="Footage creators can use" hint="Drive, Dropbox… optional" value={d.assets} maxLength={300} onChange={(e) => set({ assets: e.target.value })} placeholder="https://" inputMode="url" error={d.assets && !/^https:\/\//i.test(d.assets) ? 'Use a full link that starts with https://' : undefined} />
                  </Rise>
                </div>
              </>
            )}

            {current.id === 'budget' && (
              <>
                <Ask sub="Creators are paid for every 1,000 verified views, out of your balance, as they earn. The budget is the most this campaign can ever pay.">Set the budget.</Ask>
                <Rise i={0}>
                  <BudgetPicker value={{ budget: d.budget, mode: d.mode, rate: d.rate, views: d.views }} onChange={(p) => set(p)} />
                </Rise>
                <Rise i={1} className="mt-8 grid gap-5 sm:grid-cols-3">
                  <BigInput label="End date" hint="Optional" type="date" value={d.endsOn} onChange={(e) => set({ endsOn: e.target.value })} />
                  <BigInput label="Most one submission earns" hint="Optional" prefix="$" inputMode="numeric" value={d.capPerPost} placeholder="No limit" onChange={(e) => set({ capPerPost: e.target.value.replace(/\D/g, '').slice(0, 6) })} />
                  <BigInput label="Most one creator earns" hint="Optional" prefix="$" inputMode="numeric" value={d.capPerUser} placeholder="No limit" onChange={(e) => set({ capPerUser: e.target.value.replace(/\D/g, '').slice(0, 6) })} />
                </Rise>
              </>
            )}

            {current.id === 'funds' && (
              <>
                <Ask sub={`Campaigns draw from one balance. To start, it needs ${money(need)}: the first $50 creators earn, plus our fee. Nothing is charged until creators earn.`}>{short > 0 ? 'Add funds.' : 'Your funds are ready.'}</Ask>
                <Rise i={0}>
                  <div className="rounded-[calc(2rem*var(--round,1))] border border-line-strong bg-white/[0.04] p-6 md:p-8">
                    <p className="text-xs tracking-wide text-mute">Your balance</p>
                    <p className="mt-2 font-display text-6xl leading-none font-medium tabular-nums">{money(balanceCents)}</p>
                    <div className="mt-5 h-2 overflow-hidden rounded-pill bg-white/10">
                      <motion.div className="h-full rounded-pill bg-paper" initial={{ width: 0 }} animate={{ width: `${Math.min(100, (balanceCents / Math.max(1, costFor(budgetCents))) * 100)}%` }} transition={{ duration: 0.8, ease: EASE_OUT }} />
                    </div>
                    <p className="mt-3 text-sm text-mute">
                      {money(balanceCents)} of {money(costFor(budgetCents))}, the most the whole campaign can cost.{' '}
                      {short > 0 ? `Add at least ${money(short)} to start.` : 'That covers the start; top up any time as it runs.'}
                    </p>
                    {paypalReady ? (
                      <div className="mt-7">
                        <Label>Add with PayPal</Label>
                        <div className="flex flex-wrap gap-2">
                          {[...new Set([Math.max(SITE.minTopUpUsd, Math.ceil(short / 100)), Math.ceil(costFor(budgetCents) / 100), 250, 1000])]
                            .filter((n) => n >= SITE.minTopUpUsd && n <= SITE.maxTopUpUsd && (short === 0 || n * 100 >= short))
                            .sort((a, b) => a - b)
                            .slice(0, 4)
                            .map((n) => (
                              <Chip key={n} on={Number(topUp) === n} onClick={() => setTopUp(String(n))}>
                                {usd(n)}
                                {n === Math.ceil(costFor(budgetCents) / 100) ? ' · the whole budget' : ''}
                              </Chip>
                            ))}
                        </div>
                        <button type="button" disabled={busy || !(Number(topUp) >= SITE.minTopUpUsd)} onClick={() => void addFunds(Number(topUp))} className="mt-5 inline-flex h-14 items-center gap-2 rounded-pill bg-paper px-8 text-base font-medium text-ink transition-all hover:bg-paper/85 active:scale-95 disabled:opacity-40">
                          {busy ? <Loader2 className="size-5 animate-spin" /> : <Wallet className="size-5" />} {Number(topUp) ? `Add ${usd(Number(topUp))} with PayPal` : 'Pick an amount'}
                        </button>
                        <p className="mt-3 text-xs text-mute">You come back here after paying. We cover PayPal&apos;s fees.</p>
                      </div>
                    ) : (
                      <p className="mt-6 text-sm text-mute">Adding funds opens soon. You can still send the campaign for review now.</p>
                    )}
                  </div>
                </Rise>
                {short > 0 && <Rise i={1} className="mt-4 text-sm text-mute">You can also send it for review first and add funds later from Balance. It starts once it is approved and funded.</Rise>}
              </>
            )}

            {current.id === 'review' && (
              <>
                <Ask sub="Nothing is charged now. We read every campaign before it goes live, usually within a day.">Ready to send it?</Ask>
                <Rise i={0}>
                  <CampaignPreview d={d} rate={plan.rate} views={plan.views} big />
                </Rise>
                <Rise i={1} className="mt-4 grid gap-2 text-sm">
                  {STEPS.slice(0, 5).map((s, i) => (
                    <button key={s.id} type="button" onClick={() => go(i)} className="flex items-center justify-between rounded-2xl border border-line px-4 py-3 text-left transition-colors hover:border-paper/40">
                      <span className="inline-flex items-center gap-2">
                        {valid[s.id] ? <Check className="size-4 text-emerald-400" /> : <span className="size-2 rounded-pill bg-signal" />} {s.title}
                      </span>
                      <span className="text-mute">Edit</span>
                    </button>
                  ))}
                </Rise>
              </>
            )}

            {error && (
              <p role="alert" className="mt-6 rounded-2xl border border-signal/40 bg-signal/10 px-4 py-3 text-sm text-signal">
                {error}
              </p>
            )}
          </motion.section>
        </AnimatePresence>

        <aside className="sticky top-24 hidden xl:block" aria-label="Preview">
          <p className="mb-3 text-xs tracking-wide text-mute">Live preview</p>
          <CampaignPreview d={d} rate={plan.rate} views={plan.views} />
        </aside>
      </div>

      {/* ---------- moving on ---------- */}
      <div className="pointer-events-none fixed inset-x-0 bottom-5 z-30 flex justify-center px-4 md:pl-[var(--sidebar-w,0px)]">
        <div className="pointer-events-auto flex items-center gap-2 rounded-pill border border-line-strong bg-ink/85 p-1.5 shadow-2xl backdrop-blur-xl">
          <button type="button" onClick={() => step > 0 && go(step - 1)} disabled={step === 0 || busy} aria-label="Back" className="grid size-12 place-items-center rounded-pill text-mute transition-colors hover:bg-white/10 hover:text-paper disabled:opacity-30">
            <ChevronLeft className="size-5" />
          </button>
          <button type="button" onClick={next} disabled={!valid[current.id] || busy} className="inline-flex h-12 min-w-44 items-center justify-center gap-2 rounded-pill bg-paper px-7 text-[15px] font-medium text-ink transition-all hover:bg-paper/85 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40">
            {busy && current.id === 'review' && <Loader2 className="size-4 animate-spin" />}
            {current.id === 'review' ? 'Send for review' : current.id === 'funds' && short > 0 ? 'Add funds later' : current.id === 'audio' && !d.spotify.length && !d.sounds.length && !d.audio ? 'Skip for now' : 'Continue'}
            {current.id !== 'review' && <ArrowRight className="size-4" />}
          </button>
        </div>
      </div>
    </div>
  )
}

/** How the campaign will look on the browse page, built from what has been typed so far. */
function CampaignPreview({ d, rate, views, big }: { d: Draft; rate: number; views: number; big?: boolean }) {
  const cover = d.cover ? `/api/img/${d.cover}` : null
  const bg = d.background ? `/api/img/${d.background}` : null
  return (
    <div className="relative overflow-hidden rounded-[calc(2rem*var(--round,1))] border border-line-strong bg-white/[0.03]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {bg && <img src={bg} alt="" className="absolute inset-0 size-full scale-110 object-cover opacity-40 blur-sm" />}
      <div className={cn('relative grid gap-4 p-5', big && 'md:grid-cols-[auto_1fr] md:items-center md:p-6')}>
        <div className={cn('aspect-square overflow-hidden rounded-2xl bg-white/10 shadow-2xl', big ? 'w-28 md:w-36' : 'w-full')}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {cover ? <img src={cover} alt="" className="size-full object-cover" /> : <div className="grid size-full place-items-center bg-[radial-gradient(120%_120%_at_0%_0%,rgb(255_255_255/0.18),transparent_60%)] font-display text-5xl text-paper/30">{(d.title.trim()[0] ?? '?').toUpperCase()}</div>}
        </div>
        <div className="min-w-0">
          <p className="text-xs tracking-wide text-mute">{[d.type, d.subtype].filter(Boolean).join(' · ')}</p>
          <p className="mt-1 truncate font-display text-3xl leading-tight">{d.title || 'Your campaign'}</p>
          <p className="truncate text-mute">{d.creator || 'Artist or brand'}</p>
          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            <span className="rounded-pill bg-paper px-3 py-1 font-medium text-ink tabular-nums">${rate.toFixed(2)} / 1K</span>
            <span className="rounded-pill border border-line-strong px-3 py-1 tabular-nums">{usd(Number(d.budget) || 0)} pool</span>
            <span className="rounded-pill border border-line-strong px-3 py-1 tabular-nums">{views.toLocaleString('en-US')} views</span>
          </div>
          <div className="mt-3 flex items-center gap-2 text-mute">
            {d.platforms.map((p) => (
              <BrandIcon key={p} name={p} className="size-4" />
            ))}
            {d.spotify.some((l) => l.trim()) && <BrandIcon name="spotify" className="size-4 text-emerald-400" />}
          </div>
          {big && d.summary && <p className="mt-4 line-clamp-4 text-sm leading-relaxed whitespace-pre-wrap text-mute">{d.summary}</p>}
        </div>
      </div>
    </div>
  )
}
