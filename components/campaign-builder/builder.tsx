'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, AudioLines, Check, ChevronLeft, Clapperboard, Disc3, Gamepad2, Loader2, Megaphone, Mic, Package, Plus, Sparkles, Ticket, Wallet, type LucideIcon } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { BrandIcon } from '@/components/brand-icon'
import { Ask, BigArea, BigInput, Chip, Label, Rise } from '@/components/invite/bits'
import { useTransitions } from '@/components/shell/transition-provider'
import { budgetPlan, cleanLinks, exampleLink, type BudgetMode, soundLink, spotifyLink } from '@/lib/campaign-extras-shared'
import { startDeposit } from '@/lib/finance-client'
import { costFor, startNeeded } from '@/lib/ledger-math'
import { EASE_OUT } from '@/lib/layout'
import { SITE } from '@/lib/site'
import { cn } from '@/lib/utils'
import { BudgetPicker } from './budget-picker'
import { ArtPicker, AudioPicker, LinkList } from './music-pickers'

const ALL_STEPS = [
  { id: 'start', title: 'Start' },
  { id: 'basics', title: 'The basics' },
  { id: 'audio', title: 'The audio' },
  { id: 'look', title: 'Cover and background' },
  { id: 'brief', title: 'The brief' },
  { id: 'budget', title: 'Budget' },
  { id: 'funds', title: 'Funds' },
  { id: 'review', title: 'Review' },
] as const
type StepId = (typeof ALL_STEPS)[number]['id']

/** Where a campaign starts: the closest thing to what is being launched. It sets sensible defaults, and every one can be changed. */
const TEMPLATES: { id: string; label: string; line: string; icon: LucideIcon; type: string; subtype: string; ideas: string[]; off: string[]; budget: string; hint: string }[] = [
  { id: 'single', label: 'A new single', line: 'Chorus edits, lyric clips, fan reactions', icon: Disc3, type: 'Music', subtype: 'Single', ideas: ['The chorus or hook', 'Lyric edits', 'Fan reactions'], off: ['No sped-up or slowed versions of the track'], budget: '500', hint: 'What is the song about, what should the clips feel like, and what do you want people to do after hearing it?' },
  { id: 'album', label: 'An album or EP', line: 'Many tracks, many angles', icon: AudioLines, type: 'Music', subtype: 'Album or EP', ideas: ['The chorus or hook', 'Behind the scenes', 'Lyric edits'], off: ['Only use tracks from this release'], budget: '1000', hint: 'Which tracks matter most, and what is the story of this project?' },
  { id: 'video', label: 'A music video', line: 'Cut the video into moments', icon: Clapperboard, type: 'Music', subtype: 'Music video', ideas: ['The best scene', 'Behind the scenes', 'Fan reactions'], off: ['Use the official footage only'], budget: '750', hint: 'Which scenes should creators cut from, and which parts should stay untouched?' },
  { id: 'show', label: 'A tour or show', line: 'Bring people to the room', icon: Ticket, type: 'Music', subtype: 'Tour or show', ideas: ['Live performance', 'Fan reactions', 'Behind the scenes'], off: ['No footage from other artists'], budget: '500', hint: 'Where and when is it, and what should creators capture?' },
  { id: 'stream', label: 'Stream highlights', line: 'The best live moments', icon: Gamepad2, type: 'Streamer', subtype: 'Highlights', ideas: ['Funny or relatable moments', 'Live moments'], off: ['No clips that show private information'], budget: '300', hint: 'What kind of moments make your channel yours?' },
  { id: 'pod', label: 'Podcast moments', line: 'Quotable clips from episodes', icon: Mic, type: 'Podcast', subtype: 'Best moments', ideas: ['Funny or relatable moments', 'The big quote'], off: ['Keep quotes in context'], budget: '300', hint: 'Which topics and guests should clips come from?' },
  { id: 'product', label: 'A product or launch', line: 'Show it, use it, talk about it', icon: Package, type: 'Brand', subtype: 'Launch', ideas: ['Using it for real', 'A first reaction', 'Behind the scenes'], off: ['No claims about results that are not true'], budget: '1000', hint: 'What is it, who is it for, and what should people say or show?' },
  { id: 'blank', label: 'Something else', line: 'Start from a blank page', icon: Sparkles, type: 'Music', subtype: '', ideas: [], off: [], budget: '500', hint: 'What is it about, who is it for, and what should creators make?' },
]

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
const DRAFT_KEY = 'll:draft:campaign-builder'

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
  example: '',
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
export function CampaignBuilder({ balanceCents, paypalReady, startAt, edit, initial }: { balanceCents: number; paypalReady: boolean; startAt?: string; /** Fixing a request that is in review: its id, and what the team asked for. */ edit?: { id: string; note?: string }; initial?: Partial<Draft> }) {
  const { navigate } = useTransitions()
  const STEPS = edit ? ALL_STEPS.filter((x) => x.id !== 'start' && x.id !== 'funds') : ALL_STEPS
  const [d, setD] = useState<Draft>(() => (initial ? (restore({ ...BLANK, ...initial }) ?? BLANK) : BLANK))
  const [tpl, setTpl] = useState<string>('')
  const [sent, setSent] = useState(false)
  const [step, setStep] = useState(0)
  const [reached, setReached] = useState(0)
  const [dir, setDir] = useState(1)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [restored, setRestored] = useState(false)
  const [topUp, setTopUp] = useState('')
  const ready = useRef(false)
  const top = useRef<HTMLDivElement>(null)
  const DRAFT = edit ? `${DRAFT_KEY}:edit:${edit.id}` : DRAFT_KEY
  const current = STEPS[step]

  useEffect(() => {
    try {
      const saved = restore(JSON.parse(window.localStorage.getItem(DRAFT) ?? 'null'))
      if (saved && (saved.title || saved.summary)) {
        setD(saved)
        setRestored(true)
      }
      const at = STEPS.findIndex((s) => s.id === startAt)
      // a draft is already started, so the "what are you launching" screen is skipped
      const first = saved && (saved.title || saved.summary) && !edit ? 1 : 0
      const to = saved && at > 0 ? at : first
      if (to > 0) {
        setStep(to)
        setReached(to)
      }
    } catch {
      /* storage is blocked: start fresh */
    }
    ready.current = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    start: true,
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
      const res = await fetch(edit ? `/api/campaigns/${edit.id}` : '/api/campaigns', {
        method: edit ? 'PATCH' : 'POST',
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
          extras: { spotify: cleanLinks(d.spotify, spotifyLink), sounds: cleanLinks(d.sounds, soundLink), audioNote: d.audioNote, audio: d.audio, background: d.background, bio: d.bio, assets: d.assets, example: d.example },
        }),
      })
      const j = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) throw new Error(j.error ?? 'Could not send your campaign.')
      try {
        window.localStorage.removeItem(DRAFT)
      } catch {
        /* ignore */
      }
      setBusy(false)
      setSent(true)
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

      {edit?.note && (
        <div className="mb-8 rounded-card border border-paper/25 bg-white/[0.04] p-5 md:p-6">
          <p className="text-xs text-mute">The team asked for changes</p>
          <p className="mt-1.5 text-[15px] leading-relaxed whitespace-pre-wrap">{edit.note}</p>
          <p className="mt-3 text-xs text-mute">Fix what they asked, then send it back. It stays in review and nothing is charged.</p>
        </div>
      )}
      {restored && step <= 1 && !edit && (
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
            {current.id === 'start' && (
              <>
                <Ask sub="Pick the closest one. It sets up sensible starting points that you can change in every step.">What are you launching?</Ask>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {TEMPLATES.map((t, i) => (
                    <Rise key={t.id} i={Math.min(i, 5)}>
                      <button
                        type="button"
                        onClick={() => {
                          setTpl(t.id)
                          set({ type: t.type, subtype: t.subtype, clipThis: t.ideas.join('\n'), offLimits: t.off.join('\n'), budget: t.budget })
                          go(step + 1)
                        }}
                        className="group flex w-full items-center gap-4 rounded-card border border-line-strong bg-white/[0.03] p-4 text-left transition-all hover:-translate-y-0.5 hover:border-paper/40 hover:bg-white/[0.06]"
                      >
                        <span className="grid size-12 shrink-0 place-items-center rounded-panel bg-white/[0.07] text-paper/85 transition-colors group-hover:bg-paper group-hover:text-ink">
                          <t.icon aria-hidden="true" className="size-5" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[16px] leading-tight">{t.label}</span>
                          <span className="mt-0.5 block text-sm text-mute">{t.line}</span>
                        </span>
                        <ArrowRight aria-hidden="true" className="ml-auto size-4 shrink-0 text-mute opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
                      </button>
                    </Rise>
                  ))}
                </ul>
              </>
            )}

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
                    <BigArea label="The vibe and the goal" hint={`${d.summary.length}/1500`} value={d.summary} maxLength={1500} rows={5} onChange={(e) => set({ summary: e.target.value })} placeholder={TEMPLATES.find((x) => x.id === tpl)?.hint ?? "What is it about, who is it for, and what feeling should the submissions give?"} />
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
                    <BigInput label="Example edit" hint="A link to a video file (.mp4) or a TikTok, YouTube or Instagram post · optional" value={d.example} maxLength={300} onChange={(e) => set({ example: e.target.value })} placeholder="https://" inputMode="url" error={d.example && 'error' in exampleLink(d.example) ? (exampleLink(d.example) as { error: string }).error : undefined} />
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
                <Rise i={1} className="mt-6">
                  <Estimates rate={plan.rate} views={plan.views} budget={budget} endsOn={d.endsOn} />
                </Rise>
                <Rise i={2} className="mt-8 grid gap-5 sm:grid-cols-3">
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
                  <div className="rounded-card border border-line-strong bg-white/[0.04] p-6 md:p-8">
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
                <Rise i={1} className="mt-5">
                  <Readiness d={d} problem={Boolean(plan.problem)} budget={budget} />
                </Rise>
                <Rise i={2} className="mt-4 grid gap-2 text-sm">
                  {STEPS.filter((x) => x.id !== 'start' && x.id !== 'funds' && x.id !== 'review').map((s) => (
                    <button key={s.id} type="button" onClick={() => go(STEPS.findIndex((x) => x.id === s.id))} className="flex items-center justify-between rounded-2xl border border-line px-4 py-3 text-left transition-colors hover:border-paper/40">
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

        <aside className={cn('sticky top-24 hidden', current.id !== 'review' && current.id !== 'start' && 'xl:block')} aria-label="Preview">
          <p className="mb-3 text-xs tracking-wide text-mute">Live preview</p>
          <CampaignPreview d={d} rate={plan.rate} views={plan.views} />
          <Readiness d={d} problem={Boolean(plan.problem)} budget={budget} className="mt-5" />
        </aside>
      </div>

      {/* ---------- moving on ---------- */}
      <div className={cn('pointer-events-none fixed inset-x-0 bottom-5 z-30 flex justify-center px-4 md:pl-[var(--sidebar-w,0px)]', current.id === 'start' && 'hidden')}>
        <div className="pointer-events-auto flex items-center gap-2 rounded-pill border border-line-strong bg-ink/85 p-1.5 shadow-2xl backdrop-blur-xl">
          <button type="button" onClick={() => step > 0 && go(step - 1)} disabled={step === 0 || busy} aria-label="Back" className="grid size-12 place-items-center rounded-pill text-mute transition-colors hover:bg-white/10 hover:text-paper disabled:opacity-30">
            <ChevronLeft className="size-5" />
          </button>
          <button type="button" onClick={next} disabled={!valid[current.id] || busy} className="inline-flex h-12 min-w-44 items-center justify-center gap-2 rounded-pill bg-paper px-7 text-[15px] font-medium text-ink transition-all hover:bg-paper/85 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40">
            {busy && current.id === 'review' && <Loader2 className="size-4 animate-spin" />}
            {current.id === 'review' ? (edit ? 'Send it back for review' : 'Send for review') : current.id === 'funds' && short > 0 ? 'Add funds later' : current.id === 'audio' && !d.spotify.length && !d.sounds.length && !d.audio ? 'Skip for now' : 'Continue'}
            {current.id !== 'review' && <ArrowRight className="size-4" />}
          </button>
        </div>
      </div>
      <AnimatePresence>{sent && <Sent d={d} rate={plan.rate} views={plan.views} again={Boolean(edit)} onDone={() => navigate(edit ? '/brand/campaigns?resent=1' : '/brand/campaigns?requested=1')} />}</AnimatePresence>
    </div>
  )
}

/** How the campaign will look on the browse page, built from what has been typed so far. */
function CampaignPreview({ d, rate, views, big }: { d: Draft; rate: number; views: number; big?: boolean }) {
  const cover = d.cover ? `/api/img/${d.cover}` : null
  const bg = d.background ? `/api/img/${d.background}` : null
  return (
    <div className="relative overflow-hidden rounded-card border border-line-strong bg-white/[0.03]">
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
            {d.spotify.some((l) => l.trim()) && <BrandIcon name="spotify" className="size-4 text-paper/70" />}
          </div>
          {big && d.summary && <p className="mt-4 line-clamp-4 text-sm leading-relaxed whitespace-pre-wrap text-mute">{d.summary}</p>}
        </div>
      </div>
    </div>
  )
}


// ---------- what reviewers look at, shown while the campaign is written ----------
type Item = { id: string; label: string; ok: boolean; why: string }
const lineCount = (v: string) => v.split('\n').map((x) => x.trim()).filter(Boolean).length

function readiness(d: Draft, problem: boolean, budget: number): { items: Item[]; score: number } {
  const len = d.summary.trim().length
  const items: Item[] = [
    { id: 'name', label: 'A name and an artist', ok: d.title.trim().length >= 2 && d.creator.trim().length >= 2, why: 'Both are needed.' },
    { id: 'brief', label: 'A brief to work from', ok: len >= 100, why: len < 20 ? 'Write at least a couple of sentences.' : 'A few more lines and creators get it right first time.' },
    { id: 'ideas', label: 'Ideas for what to make', ok: lineCount(d.clipThis) > 0, why: 'Reviewers look for some direction.' },
    { id: 'off', label: 'What is off limits', ok: lineCount(d.offLimits) > 0, why: 'Clear rules mean fewer rejected clips.' },
    { id: 'audio', label: 'Audio creators can use', ok: Boolean(d.audio || d.sounds.some((x) => x.trim()) || d.spotify.some((x) => x.trim())), why: 'Add the official sound or a preview.' },
    { id: 'cover', label: 'Your own cover picture', ok: Boolean(d.cover), why: 'Campaigns with their own art get noticed.' },
    { id: 'example', label: 'An example edit', ok: Boolean(d.example.trim()), why: 'It shows the style you want.' },
    { id: 'budget', label: 'A budget that works', ok: !problem && budget >= SITE.minCampaignBudgetUsd, why: `At least $${SITE.minCampaignBudgetUsd}.` },
    { id: 'end', label: 'An end date', ok: Boolean(d.endsOn), why: 'Creators like to know how long they have.' },
  ]
  return { items, score: Math.round((items.filter((i) => i.ok).length / items.length) * 100) }
}

/** The things the team checks before accepting a campaign, ticked off as you write: so the first answer is "yes". */
function Readiness({ d, problem, budget, className }: { d: Draft; problem: boolean; budget: number; className?: string }) {
  const { items, score } = readiness(d, problem, budget)
  const todo = items.filter((i) => !i.ok)
  return (
    <div className={cn('rounded-card border border-line-strong bg-white/[0.03] p-5', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-medium">Ready for review</p>
        <p className="font-mono text-xs text-mute tabular-nums">{score}%</p>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-pill bg-white/10" role="progressbar" aria-valuenow={score} aria-valuemin={0} aria-valuemax={100} aria-label="How ready the campaign is for review">
        <motion.div className="h-full rounded-pill bg-paper" initial={false} animate={{ width: `${score}%` }} transition={{ duration: 0.5, ease: EASE_OUT }} />
      </div>
      <p className="mt-3 text-xs leading-snug text-mute">{todo.length === 0 ? 'Everything the team looks for is here.' : 'These are what the team looks at before accepting.'}</p>
      {todo.length > 0 && (
        <ul className="mt-3 grid gap-2.5">
          {todo.slice(0, 4).map((i) => (
            <li key={i.id} className="flex items-start gap-2.5 text-[13px]">
              <span aria-hidden="true" className="mt-[7px] size-1.5 shrink-0 rounded-pill bg-paper/50" />
              <span>
                {i.label}
                <span className="block text-xs text-mute">{i.why}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** What a budget is likely to look like in practice, in plain numbers. A guide, never a promise. */
function Estimates({ rate, views, budget, endsOn }: { rate: number; views: number; budget: number; endsOn: string }) {
  if (!(budget > 0) || !(rate > 0)) return null
  const clipsLow = Math.max(1, Math.round(views / 20000))
  const clipsHigh = Math.max(clipsLow, Math.round(views / 5000))
  const days = endsOn ? Math.max(0, Math.ceil((Date.parse(`${endsOn}T23:59:59`) - Date.now()) / 86400000)) : 0
  const cost = costFor(Math.round(budget * 100)) / 100
  return (
    <div className="rounded-card border border-line-strong bg-white/[0.03] p-5 md:p-6">
      <p className="text-sm font-medium">What to expect</p>
      <dl className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2">
        <Stat k="Views it buys" v={views.toLocaleString('en-US')} />
        <Stat k="Clips to use it all" v={`about ${clipsLow.toLocaleString('en-US')} to ${clipsHigh.toLocaleString('en-US')}`} sub="at 5,000 to 20,000 views each" />
        <Stat k="A 20,000-view clip earns" v={usd((20000 / 1000) * rate)} />
        <Stat k="The most it can cost you" v={usd(cost)} sub="the budget plus our fee, only as creators earn" />
        {days > 0 && <Stat k="To use it by the end date" v={`${Math.ceil(views / days).toLocaleString('en-US')} views a day`} sub={`${days} ${days === 1 ? 'day' : 'days'} left`} />}
      </dl>
      <p className="mt-4 text-xs text-mute">A rough guide, not a promise. How fast it moves depends on the music, the rate and who picks it up.</p>
    </div>
  )
}

function Stat({ k, v, sub }: { k: string; v: string; sub?: string }) {
  return (
    <div>
      <dt className="text-xs text-mute">{k}</dt>
      <dd className="mt-0.5 font-display text-2xl leading-tight tabular-nums">{v}</dd>
      {sub && <p className="text-xs text-mute">{sub}</p>}
    </div>
  )
}

/** After sending: the campaign, and where it goes from here. The first step lights up as the screen settles. */
function Sent({ d, rate, views, again, onDone }: { d: Draft; rate: number; views: number; again: boolean; onDone: () => void }) {
  const steps = [
    { label: again ? 'Sent back' : 'Sent', note: 'Just now' },
    { label: 'Reviewed', note: 'Usually within a day' },
    { label: 'Funded', note: 'Your balance covers the start' },
    { label: 'Live', note: 'Creators can post' },
  ]
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="fixed inset-0 z-[150] grid place-items-center overflow-y-auto bg-ink/95 px-4 py-10 backdrop-blur-xl" role="dialog" aria-modal="true" aria-label="Campaign sent">
      <div className="w-full max-w-xl text-center">
        <motion.div initial={{ opacity: 0, y: 24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 240, damping: 24, delay: 0.1 }} className="text-left">
          <CampaignPreview d={d} rate={rate} views={views} big />
        </motion.div>
        <motion.h2 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45, duration: 0.4, ease: EASE_OUT }} className="mt-10 font-display text-4xl leading-tight">
          {again ? 'Sent back to the team.' : 'It is with the team.'}
        </motion.h2>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6, duration: 0.4 }} className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-mute">
          We read every campaign before it goes live. You do not need to wait here: we tell you the moment there is news, and nothing is charged until creators earn.
        </motion.p>
        <ol className="mx-auto mt-9 grid max-w-md grid-cols-4 gap-2 text-left">
          {steps.map((s, i) => (
            <motion.li key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75 + i * 0.12, duration: 0.35, ease: EASE_OUT }}>
              <motion.span initial={{ background: 'rgba(255,255,255,0.12)' }} animate={{ background: i === 0 ? '#f3f2ee' : 'rgba(255,255,255,0.12)' }} transition={{ delay: 1.3, duration: 0.5 }} className="mb-3 block h-1 rounded-pill" />
              <span className={cn('block text-sm', i === 0 ? 'text-paper' : 'text-mute')}>{s.label}</span>
              <span className="mt-0.5 block text-[11px] leading-snug text-mute">{s.note}</span>
            </motion.li>
          ))}
        </ol>
        <motion.button type="button" onClick={onDone} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.35, duration: 0.35 }} autoFocus className="mt-10 inline-flex h-14 items-center gap-2 rounded-pill bg-paper px-9 text-base font-medium text-ink transition-colors hover:bg-paper/85">
          See my campaigns <ArrowRight className="size-4" />
        </motion.button>
      </div>
    </motion.div>
  )
}
