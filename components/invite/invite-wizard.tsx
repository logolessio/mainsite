'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Check, ChevronLeft, CreditCard, ExternalLink, Loader2, Megaphone, Plus, ShieldCheck, Sparkles, Users, Wallet } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BrandIcon } from '@/components/brand-icon'
import { Logo } from '@/components/logo'
import { CountUp } from '@/components/app/count-up'
import { getFinance, startDeposit } from '@/lib/finance-client'
import { uploadImage } from '@/lib/image-client'
import { costFor, feeFor, startNeeded } from '@/lib/ledger-math'
import { ARTIST_COUNTRIES, BUDGET_PRESETS, CHAPTERS, COUNTRY_NAMES, estimateViews, GENRES, type InviteData, lines, PACKAGE_CHAPTERS, RATE_PRESETS, REACH, RELEASE_KINDS, type StepId, stepsFor } from '@/lib/invite-shared'
import { budgetPlan, cleanLinks, soundLink, spotifyLink } from '@/lib/campaign-extras-shared'
import { BudgetPicker } from '@/components/campaign-builder/budget-picker'
import { ArtPicker, AudioPicker, LinkList } from '@/components/campaign-builder/music-pickers'
import { EASE_OUT } from '@/lib/layout'
import { buildLink, handleChars, handleProblem, LINK_PLATFORMS, USERNAME_LINKS } from '@/lib/profile-style'
import { useFeature } from '@/components/shell/features-provider'
import { SITE } from '@/lib/site'
import { cn } from '@/lib/utils'
import { Ask, BigArea, BigInput, Chip, Confetti, Label, Rise, UploadTile } from './bits'
import { LiquidGlass } from '@/components/ui/liquid-glass'

type Campaign = { id: string; title: string; status: string; budgetCents: number } | null
type Props = {
  slug: string
  artistName: string
  email: string
  initialStep: number
  initialData: InviteData
  campaign: Campaign
  flash: 'paid' | 'cancelled' | null
  /** The client package (switch "client-links"): contact, funds, and a fuller first campaign. */
  pkg?: boolean
}

const KEY_LINKS = ['spotify', 'applemusic', 'instagram', 'tiktok', 'youtube'] as const
const MORE_LINKS = ['soundcloud', 'x', 'twitch', 'bandcamp', 'website'] as const
const PLATFORMS = [
  { id: 'tiktok', label: 'TikTok' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'youtube', label: 'YouTube' },
] as const
const IDEAS = ['The chorus or hook', 'Behind the scenes', 'Lyric edits', 'Live performance', 'Fan reactions', 'Funny or relatable moments']
const label = (id: string) => LINK_PLATFORMS.find((p) => p.id === id)?.label ?? id
const usd = (n: number) => `$${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
const money = (c: number) => `$${(c / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export function InviteWizard({ slug, artistName, email, initialStep, initialData, campaign: initialCampaign, flash, pkg = false }: Props) {
  const STEPS = stepsFor(pkg)
  const looseHandles = useFeature('username-punctuation')
  const idx = (id: StepId) => STEPS.findIndex((s) => s.id === id)
  const [step, setStep] = useState(Math.min(initialStep, STEPS.length - 1))
  const [reached, setReached] = useState(Math.min(initialStep, STEPS.length - 1))
  const [dir, setDir] = useState(1)
  const [data, setData] = useState<InviteData>(() => ({
    stageName: initialData.stageName ?? artistName,
    handle: initialData.handle ?? slug.replace(/-/g, '_').slice(0, 20),
    budget: '500',
    rate: '2',
    platforms: ['tiktok'],
    ...(pkg ? { budgetMode: 'views' as const, views: '250000', platforms: ['tiktok', 'instagram'] } : {}),
    ...initialData,
  }))
  const [campaign, setCampaign] = useState<Campaign>(initialCampaign)
  const [saved, setSaved] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [upload, setUpload] = useState<{ avatar?: boolean; cover?: boolean; err?: string }>({})
  const [extra, setExtra] = useState<string[]>(() => MORE_LINKS.filter((p) => initialData.links?.[p]))
  const timer = useRef<number | null>(null)
  const latest = useRef({ step, data })
  latest.current = { step, data }
  const scroller = useRef<HTMLDivElement>(null)
  const current = STEPS[step]

  // The page takes over the whole screen, so the site behind it must not scroll.
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 })
  }, [step])

  const persist = useCallback(
    async (nextStep?: number) => {
      const { step: s, data: d } = latest.current
      setSaved('saving')
      const res = await fetch(`/api/invite/${slug}/progress`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ step: nextStep ?? s, data: clean(d) }) }).catch(() => null)
      setSaved(res?.ok ? 'saved' : 'idle')
      return Boolean(res?.ok)
    },
    [slug],
  )

  const set = (patch: Partial<InviteData>) => {
    setData((d) => ({ ...d, ...patch }))
    setError('')
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => void persist(), 700)
  }

  const go = useCallback(
    (to: number) => {
      if (timer.current) window.clearTimeout(timer.current)
      setDir(to >= latest.current.step ? 1 : -1)
      setError('')
      setStep(to)
      setReached((r) => Math.max(r, to))
      void persist(Math.max(to, 0))
    },
    [persist],
  )

  // ---------- on first load: land on the right step, and celebrate a payment ----------
  useEffect(() => {
    if (initialCampaign) {
      const to = initialCampaign.status === 'awaiting_payment' ? idx('fund') : idx('done')
      setStep(to)
      setReached(STEPS.length - 1)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---------- validation ----------
  const links = data.links ?? {}
  const linkErr = (p: string) => {
    const v = links[p]
    if (!v?.trim()) return ''
    const b = buildLink(p, v)
    return 'error' in b ? b.error : ''
  }
  const linkCount = Object.entries(links).filter(([, v]) => v?.trim()).length
  const budget = Number(data.budget)
  // in the package the budget can be set as "X views for $Y": the rate is worked out from it, exactly as the server will
  const plan = budgetPlan(pkg ? (data.budgetMode ?? 'views') : 'rate', budget || 0, Number(data.rate) || 0, Number(data.views) || 0)
  const rate = plan.rate
  const goodLinks = (list: string[] | undefined, check: typeof spotifyLink) => (list ?? []).every((l) => !l.trim() || 'url' in check(l))
  const valid: Record<StepId, boolean> = {
    hello: true,
    you: (data.stageName ?? '').trim().length >= 2 && (looseHandles ? handleProblem(data.handle ?? '', { loose: true, isAdmin: true }) === null : /^[a-z0-9_]{3,20}$/.test(data.handle ?? '')),
    sound: (data.genres?.length ?? 0) > 0 && (data.pitch ?? '').trim().length >= 10,
    links: linkCount > 0 && Object.keys(links).every((p) => !linkErr(p)),
    look: true,
    release: (data.projectTitle ?? '').trim().length >= 2 && Boolean(data.projectKind) && goodLinks(data.spotify, spotifyLink),
    contact: true,
    funds: true,
    audio: goodLinks(data.sounds, soundLink),
    art: true,
    brief: (data.platforms?.length ?? 0) > 0 && (data.summary ?? '').trim().length >= 20,
    money: budget >= SITE.minInviteBudgetUsd && budget <= SITE.maxTopUpUsd && !plan.problem,
    rules: Boolean(data.agreed),
    review: true,
    fund: true,
    done: true,
  }

  // ---------- what each step does when you press continue ----------
  const next = async () => {
    if (busy || !valid[current.id]) return
    setError('')
    if (current.id === 'look') {
      setBusy(true)
      await persist(step)
      const res = await fetch(`/api/invite/${slug}/profile`, { method: 'POST' }).catch(() => null)
      const j = (await res?.json().catch(() => ({}))) as { error?: string }
      setBusy(false)
      if (!res?.ok) {
        setError(j.error ?? 'Could not save your page. Please try again.')
        if (/username|taken|reserved/i.test(j.error ?? '')) go(idx('you'))
        return
      }
    }
    if (current.id === 'review') {
      setBusy(true)
      await persist(step)
      const res = await fetch(`/api/invite/${slug}/campaign`, { method: 'POST' }).catch(() => null)
      const j = (await res?.json().catch(() => ({}))) as { error?: string; id?: string; status?: string }
      setBusy(false)
      if (!res?.ok || !j.id) return setError(j.error ?? 'Could not create your campaign. Please try again.')
      setCampaign({ id: j.id, title: data.projectTitle ?? '', status: j.status ?? 'awaiting_payment', budgetCents: Math.round(budget * 100) })
      go(idx('fund'))
      return
    }
    go(step + 1)
  }
  const back = () => step > 0 && go(step - 1)

  // the balance the artist has to pay from, looked up when the funding step opens
  const [balance, setBalance] = useState<number | null>(null)
  useEffect(() => {
    if (current.id !== 'fund' && current.id !== 'funds') return
    getFinance()
      .then((f) => setBalance(f.balances.brand))
      .catch(() => setBalance(null))
  }, [current.id])

  const pay = async () => {
    if (!campaign) return
    setBusy(true)
    setError('')
    const res = await fetch(`/api/campaigns/${campaign.id}/pay`, { method: 'POST' }).catch(() => null)
    const j = (await res?.json().catch(() => ({}))) as { error?: string; ok?: boolean }
    setBusy(false)
    if (!res?.ok || !j.ok) return setError(j.error ?? 'Could not take the payment. Please try again.')
    setCampaign({ ...campaign, status: 'live' })
    go(idx('done'))
  }

  const addFunds = async () => {
    if (!campaign) return
    setBusy(true)
    setError('')
    try {
      const short = startNeeded(campaign.budgetCents) - (balance ?? 0)
      const { url } = await startDeposit(Math.max(10, Math.ceil(short / 100)), pkg ? `/${slug}` : undefined)
      window.location.href = url
    } catch (e) {
      setBusy(false)
      setError(e instanceof Error ? e.message : 'Could not open PayPal.')
    }
  }

  // ---------- the package: adding funds before the campaign, and how to be reached ----------
  const [topUp, setTopUp] = useState(0)
  const depositNow = async (amount: number) => {
    setBusy(true)
    setError('')
    try {
      await persist(step)
      const { url } = await startDeposit(amount, `/${slug}`)
      window.location.href = url
    } catch (e) {
      setBusy(false)
      setError(e instanceof Error ? e.message : 'Could not open PayPal.')
    }
  }
  const [prefs, setPrefs] = useState<{ pref: string; options: { id: string; label: string; hint: string }[] } | null>(null)
  useEffect(() => {
    if (current.id !== 'contact' || prefs) return
    fetch('/api/me/contact', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => j && setPrefs(j as { pref: string; options: { id: string; label: string; hint: string }[] }))
      .catch(() => null)
  }, [current.id, prefs])
  const choosePref = async (pref: string) => {
    if (!prefs) return
    const before = prefs.pref
    setPrefs({ ...prefs, pref })
    const res = await fetch('/api/me/contact', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ pref }) }).catch(() => null)
    if (!res?.ok) {
      setPrefs({ ...prefs, pref: before })
      setError('Could not save that. Please try again.')
    }
  }

  const pick = async (kind: 'avatar' | 'cover', file: File) => {
    setUpload((u) => ({ ...u, [kind]: true, err: undefined }))
    try {
      const id = await uploadImage(kind, file)
      set({ [kind]: id })
    } catch (e) {
      setUpload((u) => ({ ...u, err: e instanceof Error ? e.message : 'Upload failed.' }))
    }
    setUpload((u) => ({ ...u, [kind]: false }))
  }

  // Enter moves on (except in a text area, where it makes a new line).
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !(e.target instanceof HTMLTextAreaElement) && !(e.target instanceof HTMLButtonElement) && current.id !== 'review' && current.id !== 'fund') {
      e.preventDefault()
      void next()
    }
  }

  const estimate = estimateViews(budget || 0, rate || 0)
  const chapterIdx = (c: string) => STEPS.filter((s) => s.chapter === c)
  const progress = Math.round((step / (STEPS.length - 1)) * 100)
  const showFooter = current.id !== 'done' && current.id !== 'fund'

  return (
    <div className="fixed inset-0 z-[80] bg-ink text-paper" onKeyDown={onKey}>
      <Backdrop step={step} />
      <div ref={scroller} className="relative h-full overflow-y-auto overscroll-contain">
        <header className="sticky top-0 z-20 flex h-20 items-center justify-between bg-gradient-to-b from-ink from-60% to-transparent px-5 md:px-10">
          <Logo className="h-10 md:h-11" />
          <div className="flex items-center gap-4 text-sm text-mute">
            <span aria-live="polite" className="hidden items-center gap-1.5 sm:inline-flex">
              {saved === 'saving' ? <Loader2 className="size-3.5 animate-spin" /> : saved === 'saved' ? <Check className="size-3.5" /> : null}
              {saved === 'saving' ? 'Saving…' : saved === 'saved' ? 'Saved' : 'Saves as you go'}
            </span>
            <span className="font-mono text-xs">{progress}%</span>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-px bg-line">
            <motion.div className="h-full bg-paper" initial={false} animate={{ width: `${progress}%` }} transition={{ duration: 0.6, ease: EASE_OUT }} />
          </div>
        </header>

        <div className="mx-auto grid w-full max-w-[1180px] gap-10 px-5 pt-6 pb-40 md:grid-cols-[250px_1fr] md:px-10 md:pt-12">
          {/* ---------- the rail ---------- */}
          <aside className="hidden md:block">
            <LiquidGlass as="nav" aria-label="Setup steps" rootClassName="sticky top-28" rounded="rounded-[calc(2rem*var(--round,1))]" className="p-3" look={{ zRadius: 24 }}>
              {(pkg ? PACKAGE_CHAPTERS : CHAPTERS).map((c) => (
                <div key={c} className="mb-2 last:mb-0">
                  <p className="px-3 pt-2 pb-1 text-[11px] font-medium text-mute">{c}</p>
                  {chapterIdx(c).map((s) => {
                    const i = STEPS.findIndex((x) => x.id === s.id)
                    const active = i === step
                    const done = i < step || (campaign && i < idx('done') && i !== step)
                    const locked = i > reached || (Boolean(campaign) && i < idx('fund') && i !== step && step >= idx('fund'))
                    return (
                      <button key={s.id} type="button" disabled={locked || busy} onClick={() => go(i)} aria-current={active ? 'step' : undefined} className={cn('group relative flex h-10 w-full items-center gap-3 rounded-pill px-3 text-left text-sm transition-colors', active ? 'text-paper' : locked ? 'text-mute/50' : 'text-mute hover:text-paper')}>
                        {active && <motion.span layoutId="wizard-pill" transition={{ type: 'spring', stiffness: 420, damping: 34 }} className="absolute inset-0 rounded-pill bg-white/[0.14] shadow-[inset_0_1px_0_rgb(255_255_255/0.22)]" />}
                        <span className={cn('relative grid size-5 shrink-0 place-items-center rounded-pill border text-[10px]', done ? 'border-paper bg-paper text-ink' : active ? 'border-paper' : 'border-line-strong')}>{done ? <Check className="size-3" /> : i}</span>
                        <span className="relative truncate">{s.title}</span>
                      </button>
                    )
                  })}
                </div>
              ))}
            </LiquidGlass>
          </aside>

          {/* ---------- the step ---------- */}
          <main className="min-w-0">
            <p className="mb-6 text-xs tracking-wide text-mute md:hidden">
              Step {step + 1} of {STEPS.length} · {current.chapter}
            </p>
            <AnimatePresence mode="wait" initial={false} custom={dir}>
              <motion.section key={current.id} custom={dir} initial={{ opacity: 0, x: 40 * dir }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 * dir }} transition={{ duration: 0.38, ease: EASE_OUT }} className="max-w-2xl">
                {current.id === 'hello' && (
                  <>
                    <Ask sub="This page is yours. In a few minutes you'll set up your artist page, pick what to promote and launch a campaign that pays creators per view.">{`Hey ${artistName}.`}</Ask>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {[
                        { icon: Users, t: 'Your page', d: 'A public artist profile at logoless.io/@you.' },
                        { icon: Megaphone, t: 'Your campaign', d: 'Say what to create and what you can spend.' },
                        { icon: Wallet, t: 'Your funds', d: 'Add money any time. Pay only for verified views.' },
                      ].map((c, i) => (
                        <Rise key={c.t} i={i}>
                          <div className="h-full rounded-3xl border border-line bg-white/[0.03] p-5">
                            <c.icon className="size-6" />
                            <p className="mt-4 text-lg">{c.t}</p>
                            <p className="mt-1 text-sm leading-relaxed text-mute">{c.d}</p>
                          </div>
                        </Rise>
                      ))}
                    </div>
                    <Rise i={3} className="mt-6 text-sm text-mute">
                      Signed in as <span className="text-paper">{email}</span>. Takes about 5 minutes, and everything you type is saved.
                    </Rise>
                  </>
                )}

                {current.id === 'you' && (
                  <>
                    <Ask sub="This is how you appear to fans and to the creators working your campaign.">What should we call you?</Ask>
                    <div className="grid gap-5">
                      <Rise i={0}>
                        <BigInput label="Artist or brand name" value={data.stageName ?? ''} maxLength={40} onChange={(e) => set({ stageName: e.target.value })} placeholder="Your name on the page" autoFocus />
                      </Rise>
                      <Rise i={1}>
                        <BigInput label="Your username" hint={looseHandles ? 'Letters, numbers, dots, dashes, _' : 'Letters, numbers, _'} prefix="logoless.io/@" value={data.handle ?? ''} maxLength={20} onChange={(e) => set({ handle: handleChars(e.target.value, looseHandles) })} placeholder="yourname" />
                      </Rise>
                      <Rise i={2}>
                        <Label>Where are you based?</Label>
                        <div className="flex flex-wrap gap-2">
                          {ARTIST_COUNTRIES.map((c) => (
                            <Chip key={c} on={data.country === c} onClick={() => set({ country: data.country === c ? '' : c })}>
                              {COUNTRY_NAMES[c]}
                            </Chip>
                          ))}
                        </div>
                      </Rise>
                    </div>
                  </>
                )}

                {current.id === 'sound' && (
                  <>
                    <Ask sub="Creators pick campaigns they believe in. A clear sound and a one-line pitch help the right people find you.">Tell us about your sound.</Ask>
                    <div className="grid gap-6">
                      <Rise i={0}>
                        <Label hint={`${data.genres?.length ?? 0}/3`}>Pick up to three genres</Label>
                        <div className="flex flex-wrap gap-2">
                          {GENRES.map((g) => {
                            const on = Boolean(data.genres?.includes(g))
                            return (
                              <Chip key={g} on={on} disabled={!on && (data.genres?.length ?? 0) >= 3} onClick={() => set({ genres: on ? (data.genres ?? []).filter((x) => x !== g) : [...(data.genres ?? []), g] })}>
                                {g}
                              </Chip>
                            )
                          })}
                        </div>
                      </Rise>
                      <Rise i={1}>
                        <BigArea label="Your pitch in a line or two" hint={`${(data.pitch ?? '').length}/400`} value={data.pitch ?? ''} maxLength={400} rows={4} onChange={(e) => set({ pitch: e.target.value })} placeholder="Tell us who you are and what you make." />
                      </Rise>
                    </div>
                  </>
                )}

                {current.id === 'links' && (
                  <>
                    <Ask sub="Add at least one. Type just your username where you can, and we build the link. Music platforms need the full link.">Where can fans find you?</Ask>
                    <div className="grid gap-4">
                      {[...KEY_LINKS, ...extra].map((p, i) => {
                        const spec = USERNAME_LINKS[p]
                        return (
                          <Rise key={p} i={Math.min(i, 5)}>
                            <div className="flex items-center gap-3">
                              <span className="grid size-12 shrink-0 place-items-center rounded-2xl border border-line-strong bg-white/[0.03]">
                                <BrandIcon name={p} className="size-5" />
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className={cn('flex h-12 items-center rounded-2xl border border-line-strong bg-white/[0.035] px-4 text-[15px] transition-colors focus-within:border-paper/60 focus-within:bg-white/[0.06]', linkErr(p) && 'border-signal/60')}>
                                  {spec && <span className="mr-0.5 shrink-0 text-mute">{spec.label}</span>}
                                  <input
                                    aria-label={label(p)}
                                    value={links[p] ?? ''}
                                    onChange={(e) => set({ links: { ...links, [p]: e.target.value } })}
                                    placeholder={spec ? 'username' : `Paste your ${label(p)} link`}
                                    maxLength={200}
                                    className="h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-mute/70"
                                  />
                                </div>
                                {linkErr(p) && <p className="mt-1 text-xs text-signal">{linkErr(p)}</p>}
                              </div>
                            </div>
                          </Rise>
                        )
                      })}
                      {MORE_LINKS.some((p) => !extra.includes(p)) && (
                        <Rise i={6}>
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <span className="inline-flex items-center gap-1.5 text-sm text-mute">
                              <Plus className="size-4" /> Add another
                            </span>
                            {MORE_LINKS.filter((p) => !extra.includes(p)).map((p) => (
                              <button key={p} type="button" onClick={() => setExtra((e) => [...e, p])} className="inline-flex h-9 items-center gap-2 rounded-pill border border-line-strong px-4 text-sm text-mute transition-colors hover:border-paper/50 hover:text-paper">
                                <BrandIcon name={p} className="size-3.5" /> {label(p)}
                              </button>
                            ))}
                          </div>
                        </Rise>
                      )}
                    </div>
                  </>
                )}

                {current.id === 'look' && (
                  <>
                    {pkg ? <Ask sub="A good picture makes your page look finished. It is optional, and you can change it later. The campaign artwork comes a little later.">Show us your face.</Ask> : <Ask sub="A good picture makes your page and your campaign look finished. Both are optional, and you can change them later.">Show us your face and your art.</Ask>}
                    <div className="flex flex-wrap items-start gap-8">
                      <Rise i={0}>
                        <UploadTile label="Profile picture" hint="Drop or choose" round preview={data.avatar ? `/api/img/${data.avatar}` : null} busy={Boolean(upload.avatar)} onFile={(f) => pick('avatar', f)} />
                      </Rise>
                      {!pkg && (
                        <Rise i={1}>
                          <UploadTile label="Campaign cover art" hint="Square cover" preview={data.cover ? `/api/img/${data.cover}` : null} busy={Boolean(upload.cover)} onFile={(f) => pick('cover', f)} />
                        </Rise>
                      )}
                    </div>
                    {upload.err && <p className="mt-4 text-sm text-signal">{upload.err}</p>}
                    <Rise i={2} className="mt-8 rounded-3xl border border-line bg-white/[0.03] p-5 text-sm text-mute">
                      <span className="text-paper">What happens next:</span> when you continue we create your page at logoless.io/@{data.handle || 'you'} with everything so far.
                    </Rise>
                  </>
                )}

                {current.id === 'contact' && (
                  <>
                    <Ask sub="How the site tells you about things that matter (a submission to look at, a campaign running low), and the best way for our team to reach you.">How should we stay in touch?</Ask>
                    <div className="grid gap-8">
                      <Rise i={0}>
                        <Label>Messages from the site</Label>
                        <div role="radiogroup" aria-label="Messages from the site" className="grid gap-2 sm:grid-cols-2">
                          {(prefs?.options ?? []).map((o) => {
                            const on = prefs?.pref === o.id
                            return (
                              <button key={o.id} type="button" role="radio" aria-checked={on} onClick={() => void choosePref(o.id)} className={cn('flex items-start gap-3 rounded-3xl border p-4 text-left transition-colors', on ? 'border-paper bg-white/[0.07]' : 'border-line-strong text-mute hover:border-paper/50 hover:text-paper')}>
                                <span className={cn('mt-1 grid size-4 shrink-0 place-items-center rounded-pill border', on ? 'border-paper bg-paper' : 'border-line-strong')}>{on && <span className="size-1.5 rounded-pill bg-ink" />}</span>
                                <span>
                                  <span className="block text-[15px] text-paper">{o.label}</span>
                                  <span className="mt-0.5 block text-sm text-mute">{o.hint}</span>
                                </span>
                              </button>
                            )
                          })}
                          {!prefs && <p className="text-sm text-mute"><Loader2 className="mr-2 inline size-4 animate-spin" />Loading the choices</p>}
                        </div>
                      </Rise>
                      <Rise i={1}>
                        <Label hint="Optional">The best way for our team to reach you</Label>
                        <div className="flex flex-wrap gap-2">
                          {REACH.map((r) => (
                            <Chip key={r.id} on={data.reachBy === r.id} onClick={() => set({ reachBy: data.reachBy === r.id ? '' : r.id, reachAt: data.reachBy === r.id ? '' : r.id === 'email' ? email : data.reachAt ?? '' })}>
                              {r.id !== 'email' && r.id !== 'phone' && <BrandIcon name={r.id} className="size-4" />} {r.label}
                            </Chip>
                          ))}
                        </div>
                        {data.reachBy && (
                          <BigInput className="mt-4 max-w-md" label={REACH.find((r) => r.id === data.reachBy)?.label ?? 'Contact'} value={data.reachAt ?? ''} maxLength={120} onChange={(e) => set({ reachAt: e.target.value })} placeholder={REACH.find((r) => r.id === data.reachBy)?.placeholder} autoFocus />
                        )}
                      </Rise>
                    </div>
                  </>
                )}

                {current.id === 'funds' && (
                  <>
                    <Ask sub="Your campaigns are paid from one balance. Add funds now and your first campaign can start the moment it is ready. Nothing is spent until creators earn, and we cover PayPal's fees.">{flash === 'paid' ? 'Funds added. Nice.' : 'Add funds.'}</Ask>
                    <Rise i={0}>
                      <div className="rounded-[calc(2rem*var(--round,1))] border border-line-strong bg-white/[0.04] p-6 md:p-8">
                        <p className="text-xs tracking-wide text-mute">Your balance</p>
                        <p className="mt-2 font-display text-6xl leading-none font-medium tabular-nums md:text-7xl">{balance === null ? '…' : money(balance)}</p>
                        <div className="mt-7">
                          <Label hint={`${usd(SITE.minTopUpUsd)} to ${usd(SITE.maxTopUpUsd)}`}>Add with PayPal</Label>
                          <div className="flex flex-wrap gap-2">
                            {[250, 500, 1000, 2500, 5000].map((n) => (
                              <Chip key={n} on={topUp === n} onClick={() => setTopUp(topUp === n ? 0 : n)}>
                                {usd(n)}
                              </Chip>
                            ))}
                          </div>
                          <button type="button" onClick={() => void depositNow(topUp)} disabled={busy || !topUp} className="mt-5 inline-flex h-14 items-center gap-2 rounded-pill bg-paper px-8 text-base font-medium text-ink transition-all hover:bg-paper/85 active:scale-95 disabled:opacity-40">
                            {busy ? <Loader2 className="size-5 animate-spin" /> : <Wallet className="size-5" />} {topUp ? `Add ${usd(topUp)} with PayPal` : 'Pick an amount'}
                          </button>
                          <p className="mt-3 text-sm text-mute">You come straight back here after paying. Prefer to wait? Continue, and you can add funds when your campaign is ready.</p>
                        </div>
                      </div>
                    </Rise>
                  </>
                )}

                {current.id === 'release' && (
                  <>
                    <Ask sub="Your first campaign. Pick the one thing you want people to hear, watch or buy.">What are we pushing?</Ask>
                    <div className="grid gap-6">
                      <Rise i={0}>
                        <BigInput label="Name of the song, album or project" value={data.projectTitle ?? ''} maxLength={60} onChange={(e) => set({ projectTitle: e.target.value })} placeholder="e.g. Red Room" autoFocus />
                      </Rise>
                      <Rise i={1}>
                        <Label>What is it?</Label>
                        <div className="flex flex-wrap gap-2">
                          {RELEASE_KINDS.map((k) => (
                            <Chip key={k} on={data.projectKind === k} onClick={() => set({ projectKind: k })}>
                              {k}
                            </Chip>
                          ))}
                        </div>
                      </Rise>
                      <Rise i={2}>
                        {pkg ? (
                          <LinkList label="Spotify links" hint="The track, the album, your artist page" icon="spotify" values={data.spotify ?? []} onChange={(v) => set({ spotify: v })} check={spotifyLink} max={6} placeholder="https://open.spotify.com/track/…" />
                        ) : (
                          <BigInput label="Link to it" hint="Spotify, YouTube, Apple Music…" value={data.projectUrl ?? ''} maxLength={300} onChange={(e) => set({ projectUrl: e.target.value })} placeholder="https://" inputMode="url" />
                        )}
                      </Rise>
                    </div>
                  </>
                )}

                {current.id === 'audio' && (
                  <>
                    <Ask sub="Point creators at the official sound and the part that matters, and let them hear it. All optional, all changeable later.">Choose the audio.</Ask>
                    <Rise i={0}>
                      <AudioPicker sounds={data.sounds ?? []} audio={data.audio ?? ''} audioNote={data.audioNote ?? ''} onChange={(p) => set(p)} />
                    </Rise>
                  </>
                )}

                {current.id === 'art' && (
                  <>
                    <Ask sub="The album cover is what creators see first. A wide background makes the campaign page feel like yours.">The cover and the background.</Ask>
                    <Rise i={0}>
                      <ArtPicker cover={data.cover ?? ''} background={data.background ?? ''} title={data.projectTitle ?? ''} creator={data.stageName ?? ''} onChange={(p) => set(p)} />
                    </Rise>
                  </>
                )}

                {current.id === 'brief' && (
                  <>
                    <Ask sub="This is the brief creators see. The clearer it is, the better the submissions.">What should creators make?</Ask>
                    <div className="grid gap-6">
                      <Rise i={0}>
                        <Label>Where should submissions be posted?</Label>
                        <div className="flex flex-wrap gap-2">
                          {PLATFORMS.map((p) => {
                            const on = Boolean(data.platforms?.includes(p.id))
                            return (
                              <Chip key={p.id} on={on} onClick={() => set({ platforms: on ? (data.platforms ?? []).filter((x) => x !== p.id) : [...(data.platforms ?? []), p.id] })}>
                                <BrandIcon name={p.id} className="size-4" /> {p.label}
                              </Chip>
                            )
                          })}
                        </div>
                      </Rise>
                      <Rise i={1}>
                        <BigArea label="The vibe and the goal" hint={`${(data.summary ?? '').length}/1100`} value={data.summary ?? ''} maxLength={1100} rows={5} onChange={(e) => set({ summary: e.target.value })} placeholder="What is the song about, who is it for, and what feeling should the submissions give?" />
                      </Rise>
                      <Rise i={2}>
                        <BigArea label="Submission ideas" hint="One per line" value={data.clipThis ?? ''} rows={4} maxLength={1000} onChange={(e) => set({ clipThis: e.target.value })} placeholder="The chorus" />
                        <div className="mt-3 flex flex-wrap gap-2">
                          {IDEAS.filter((x) => !lines(data.clipThis).includes(x)).map((x) => (
                            <button key={x} type="button" onClick={() => set({ clipThis: [...lines(data.clipThis), x].join('\n') })} className="inline-flex h-8 items-center gap-1.5 rounded-pill border border-line-strong px-3 text-xs text-mute transition-colors hover:border-paper/50 hover:text-paper">
                              <Plus className="size-3" /> {x}
                            </button>
                          ))}
                        </div>
                      </Rise>
                      <Rise i={3}>
                        <BigArea label="Off-limits" hint="One per line · optional" value={data.offLimits ?? ''} rows={3} maxLength={1000} onChange={(e) => set({ offLimits: e.target.value })} placeholder="No explicit lyrics on screen" />
                      </Rise>
                      <Rise i={4}>
                        <BigInput label="Link to footage creators can use" hint="Drive, Dropbox… optional" value={data.assetsUrl ?? ''} maxLength={300} onChange={(e) => set({ assetsUrl: e.target.value })} placeholder="https://" inputMode="url" />
                      </Rise>
                    </div>
                  </>
                )}

                {current.id === 'money' && pkg && (
                  <>
                    <Ask sub="Creators earn for every 1,000 verified views, paid from your balance as they earn. You never pay more than the budget plus our fee.">Set the budget.</Ask>
                    <Rise i={0}>
                      <BudgetPicker value={{ budget: data.budget ?? '', mode: data.budgetMode ?? 'views', rate: data.rate ?? '', views: data.views ?? '' }} onChange={(p) => set({ ...(p.budget !== undefined ? { budget: p.budget } : {}), ...(p.mode ? { budgetMode: p.mode } : {}), ...(p.rate !== undefined ? { rate: p.rate } : {}), ...(p.views !== undefined ? { views: p.views } : {}) })} minBudget={SITE.minInviteBudgetUsd} maxBudget={SITE.maxTopUpUsd} />
                    </Rise>
                    <Rise i={1} className="mt-8">
                      <BigInput label="End date" hint="Optional" type="date" value={data.endsOn ?? ''} onChange={(e) => set({ endsOn: e.target.value })} className="max-w-xs" />
                    </Rise>
                  </>
                )}

                {current.id === 'money' && !pkg && (
                  <>
                    <Ask sub="Creators earn for every 1,000 verified views, paid from your balance as they earn. You never pay more than the budget plus our fee.">How much do you want to spend?</Ask>
                    <div className="grid gap-7">
                      <Rise i={0}>
                        <Label hint={`Minimum ${usd(SITE.minInviteBudgetUsd)}`}>Total budget</Label>
                        <div className="flex flex-wrap gap-2">
                          {BUDGET_PRESETS.map((b) => (
                            <Chip key={b} on={budget === b} onClick={() => set({ budget: String(b) })}>
                              {usd(b)}
                            </Chip>
                          ))}
                        </div>
                        <div className="mt-3 max-w-xs">
                          <BigInput label="Or type an amount" prefix="$" inputMode="numeric" value={data.budget ?? ''} maxLength={6} onChange={(e) => set({ budget: e.target.value.replace(/[^\d]/g, '') })} error={data.budget && (budget < SITE.minInviteBudgetUsd || budget > SITE.maxTopUpUsd) ? `Between ${usd(SITE.minInviteBudgetUsd)} and ${usd(SITE.maxTopUpUsd)}.` : undefined} />
                        </div>
                      </Rise>
                      <Rise i={1}>
                        <Label hint="USD per 1,000 views">What creators earn</Label>
                        <div className="flex flex-wrap gap-2">
                          {RATE_PRESETS.map((r) => (
                            <Chip key={r} on={rate === r} onClick={() => set({ rate: String(r) })}>
                              {usd(r)} / 1k
                            </Chip>
                          ))}
                        </div>
                        <div className="mt-3 max-w-xs">
                          <BigInput label="Or type a rate" prefix="$" inputMode="decimal" value={data.rate ?? ''} maxLength={5} onChange={(e) => set({ rate: e.target.value.replace(/[^\d.]/g, '') })} />
                        </div>
                      </Rise>
                      <Rise i={2}>
                        <motion.div layout className="relative overflow-hidden rounded-[calc(2rem*var(--round,1))] border border-line-strong bg-white/[0.04] p-6 md:p-8">
                          <p className="text-xs tracking-wide text-mute">Your budget can buy up to</p>
                          <p className="mt-2 font-display text-5xl font-medium tabular-nums md:text-7xl">
                            <CountUp key={estimate} value={estimate.toLocaleString('en-US')} />
                          </p>
                          <p className="mt-1 text-lg text-mute">verified views</p>
                          <p className="mt-5 text-sm leading-relaxed text-mute">
                            {usd(budget || 0)} at {usd(rate || 0)} per 1,000 views. Creators earn all of it. Our {SITE.platformFeePct}% fee is added on top, so you pay {usd((budget || 0) * (1 + SITE.platformFeePct / 100))} in all.
                          </p>
                        </motion.div>
                      </Rise>
                      <Rise i={3}>
                        <BigInput label="End date" hint="Optional" type="date" value={data.endsOn ?? ''} onChange={(e) => set({ endsOn: e.target.value })} className="max-w-xs" />
                      </Rise>
                    </div>
                  </>
                )}

                {current.id === 'rules' && (
                  <>
                    <Ask sub="Here's what happens once you launch.">Here is how it works.</Ask>
                    <ol className="grid gap-3">
                      {[
                        ['You fund the campaign', 'Your budget is the most this campaign can ever pay. Money leaves your balance only for views we verify.'],
                        ['We launch it', 'After your payment we check the brief and put the campaign live for creators.'],
                        ['Creators post content', 'They cut your music into submissions and post them on TikTok, Instagram and YouTube.'],
                        ['We verify and pay', 'We check real views on each platform. Creators are paid from your balance. You can turn down off-brief submissions.'],
                        ['Top up any time', 'Running well? Add more funds to the same campaign in two clicks.'],
                      ].map(([t, d], i) => (
                        <Rise key={t} i={i}>
                          <li className="flex gap-4 rounded-3xl border border-line bg-white/[0.03] p-5">
                            <span className="grid size-8 shrink-0 place-items-center rounded-pill bg-paper font-mono text-sm text-ink">{i + 1}</span>
                            <span>
                              <span className="block text-lg">{t}</span>
                              <span className="mt-0.5 block text-sm leading-relaxed text-mute">{d}</span>
                            </span>
                          </li>
                        </Rise>
                      ))}
                    </ol>
                    <Rise i={5} className="mt-6">
                      <label className="flex cursor-pointer items-start gap-4 rounded-3xl border border-line-strong p-5 transition-colors hover:bg-white/[0.03]">
                        <input type="checkbox" checked={Boolean(data.agreed)} onChange={(e) => set({ agreed: e.target.checked })} className="mt-1 size-5 accent-white" />
                        <span className="text-sm leading-relaxed text-mute">
                          I agree to the{' '}
                          <a href="/legal/brand-terms" target="_blank" rel="noopener noreferrer" className="text-paper underline underline-offset-2">Brand Terms</a>,{' '}
                          <a href="/legal/campaign-rules" target="_blank" rel="noopener noreferrer" className="text-paper underline underline-offset-2">Campaign Rules</a> and{' '}
                          <a href="/legal/payments" target="_blank" rel="noopener noreferrer" className="text-paper underline underline-offset-2">Payments terms</a>, and I own or control the rights to the music I am promoting.
                        </span>
                      </label>
                    </Rise>
                  </>
                )}

                {current.id === 'review' && (
                  <>
                    <Ask sub="Last look. Nothing is charged yet. Next you can fund it, or leave it for later.">Ready to make it real?</Ask>
                    <Rise i={0}>
                      <div className="overflow-hidden rounded-[calc(2rem*var(--round,1))] border border-line-strong bg-white/[0.04]">
                        <div className="flex items-center gap-5 p-5 md:p-6">
                          <div className="size-24 shrink-0 overflow-hidden rounded-2xl bg-white/10">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={data.cover ? `/api/img/${data.cover}` : '/covers/01.jpg'} alt="" className="size-full object-cover" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs tracking-wide text-mute">{data.projectKind}</p>
                            <p className="mt-1 truncate font-display text-3xl">{data.projectTitle}</p>
                            <p className="truncate text-mute">by {data.stageName}</p>
                          </div>
                        </div>
                        <dl className="grid gap-px border-t border-line bg-line sm:grid-cols-3">
                          {[
                            ['Budget', usd(budget)],
                            ['Per 1,000 views', usd(rate)],
                            ['Up to', `${estimate.toLocaleString()} views`],
                            ['Platforms', (data.platforms ?? []).map((p) => PLATFORMS.find((x) => x.id === p)?.label).join(', ')],
                            ['Ends', data.endsOn || 'No end date'],
                            ['Your page', `@${data.handle}`],
                          ].map(([k, v]) => (
                            <div key={k} className="bg-ink p-5">
                              <dt className="text-xs tracking-wide text-mute">{k}</dt>
                              <dd className="mt-1 text-lg">{v}</dd>
                            </div>
                          ))}
                        </dl>
                        <div className="border-t border-line p-5 text-sm leading-relaxed whitespace-pre-wrap text-mute">{data.summary}</div>
                      </div>
                    </Rise>
                  </>
                )}

                {current.id === 'fund' && campaign && (
                  <>
                    <Ask sub="Your campaign is created. Fund it and our team launches it. Until it is paid and launched, nobody can see it.">{flash === 'cancelled' ? 'No problem. Whenever you are ready.' : 'Fund your campaign.'}</Ask>
                    <Rise i={0}>
                      <div className="rounded-[calc(2rem*var(--round,1))] border border-line-strong bg-white/[0.04] p-6 md:p-8">
                        <p className="text-xs tracking-wide text-mute">{campaign.title}</p>
                        <p className="mt-2 font-display text-6xl font-medium tabular-nums md:text-7xl">{money(costFor(campaign.budgetCents))}</p>
                        <p className="mt-2 text-sm text-mute">
                          {money(campaign.budgetCents)} for creators + {money(feeFor(campaign.budgetCents))} fee ({SITE.platformFeePct}%, added on top)
                        </p>
                        <ul className="mt-6 grid gap-3 text-sm text-mute">
                          {[
                            [CreditCard, balance === null ? 'Paid from your logoless balance as creators earn. You add money to it with PayPal, and we cover PayPal\'s fees.' : `Your balance is ${money(balance)}. ${balance >= startNeeded(campaign.budgetCents) ? 'It covers the start. Nothing is charged until creators earn.' : `Add ${money(startNeeded(campaign.budgetCents) - balance)} or more with PayPal first.`}`],
                            [ShieldCheck, 'Creators earn the whole budget, only for verified views. Our fee is on top, never taken from them.'],
                            [Sparkles, 'It goes live as soon as you start it. Creators only get paid for views we verify.'],
                          ].map(([Ic, t], i) => {
                            const I = Ic as typeof CreditCard
                            return (
                              <li key={i} className="flex items-start gap-3">
                                <I className="mt-0.5 size-4 shrink-0 text-paper" /> {t as string}
                              </li>
                            )
                          })}
                        </ul>
                        <div className="mt-8 flex flex-wrap items-center gap-3">
                          {balance !== null && balance < startNeeded(campaign.budgetCents) ? (
                            <button type="button" onClick={addFunds} disabled={busy} className="inline-flex h-14 items-center gap-2 rounded-pill bg-paper px-8 text-base font-medium text-ink transition-all hover:bg-paper/85 active:scale-95 disabled:opacity-50">
                              {busy ? <Loader2 className="size-5 animate-spin" /> : <Wallet className="size-5" />} Add {money(Math.max(1000, Math.ceil((startNeeded(campaign.budgetCents) - balance) / 100) * 100))} with PayPal
                            </button>
                          ) : (
                            <button type="button" onClick={pay} disabled={busy || balance === null} className="inline-flex h-14 items-center gap-2 rounded-pill bg-paper px-8 text-base font-medium text-ink transition-all hover:bg-paper/85 active:scale-95 disabled:opacity-50">
                              {busy ? <Loader2 className="size-5 animate-spin" /> : <CreditCard className="size-5" />} Start the campaign
                            </button>
                          )}
                          <button type="button" onClick={() => go(idx('done'))} className="h-14 rounded-pill px-6 text-mute transition-colors hover:text-paper">
                            I will do this later
                          </button>
                        </div>
                      </div>
                    </Rise>
                  </>
                )}

                {current.id === 'done' && (
                  <div className="relative">
                    <Confetti />
                    <Ask sub={flash === 'paid' || campaign?.status === 'paid' || campaign?.status === 'live' ? 'Payment received. Our team is checking your brief and will launch it shortly. We’ll tell you as soon as it’s live.' : campaign ? 'Your campaign is saved and waiting for its funds. You can pay from your dashboard whenever you like.' : 'Your page is ready.'}>{flash === 'paid' ? 'You are in. Payment received.' : 'You are all set.'}</Ask>
                    {pkg && (
                      <Rise i={0} className="relative z-10 mb-6">
                        <a href="/brand?tour=1" className="group flex items-center gap-5 rounded-[calc(2rem*var(--round,1))] border border-paper/40 bg-white/[0.07] p-5 transition-all hover:-translate-y-0.5 hover:bg-white/[0.1] md:p-6">
                          <span className="grid size-14 shrink-0 place-items-center rounded-pill bg-paper text-ink">
                            <Sparkles className="size-6" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-xl">Take the tour of your dashboard</span>
                            <span className="mt-0.5 block text-sm text-mute">Two minutes: where your stats are, how to edit, pause and top up a campaign, and how to review submissions.</span>
                          </span>
                          <ArrowRight className="size-5 shrink-0 text-mute transition-transform group-hover:translate-x-1 group-hover:text-paper" />
                        </a>
                      </Rise>
                    )}
                    <div className="relative z-10 grid gap-3 sm:grid-cols-2">
                      {[
                        { href: '/brand', icon: Megaphone, t: 'Your dashboard', d: 'Campaigns, spend and reach at a glance.' },
                        { href: '/brand/submissions', icon: Users, t: 'Submissions', d: 'See every submission made for you and turn down off-brief ones.' },
                        { href: '/brand/billing', icon: Wallet, t: 'Funding', d: 'Add more money to a campaign any time.' },
                        { href: `/@${data.handle}`, icon: ExternalLink, t: 'Your public page', d: `logoless.io/@${data.handle}` },
                      ].map((c, i) => (
                        <Rise key={c.t} i={i}>
                          <a href={c.href} className="group flex h-full items-start gap-4 rounded-3xl border border-line bg-white/[0.04] p-5 transition-all hover:-translate-y-0.5 hover:border-paper/40 hover:bg-white/[0.07]">
                            <c.icon className="mt-0.5 size-6 shrink-0" />
                            <span className="min-w-0 flex-1">
                              <span className="block text-lg">{c.t}</span>
                              <span className="mt-0.5 block text-sm text-mute">{c.d}</span>
                            </span>
                            <ArrowRight className="mt-1 size-5 shrink-0 text-mute transition-transform group-hover:translate-x-1 group-hover:text-paper" />
                          </a>
                        </Rise>
                      ))}
                    </div>
                    {campaign?.status === 'awaiting_payment' && (
                      <Rise i={5} className="relative z-10 mt-6">
                        <button type="button" onClick={() => go(idx('fund'))} className="inline-flex h-12 items-center gap-2 rounded-pill bg-paper px-6 text-sm font-medium text-ink transition-colors hover:bg-paper/85">
                          <CreditCard className="size-4" /> Fund {campaign.title}
                        </button>
                      </Rise>
                    )}
                  </div>
                )}

                {error && (
                  <p role="alert" className="mt-6 rounded-2xl border border-signal/40 bg-signal/10 px-4 py-3 text-sm text-signal">
                    {error}
                  </p>
                )}
              </motion.section>
            </AnimatePresence>
          </main>
        </div>

        {/* ---------- the floating controls ---------- */}
        {showFooter && (
          <div className="pointer-events-none fixed inset-x-0 bottom-5 z-30 flex justify-center px-4">
            <LiquidGlass rootClassName="pointer-events-auto" className="flex items-center gap-2 p-1.5" look={{ zRadius: 14 }}>
              <button type="button" onClick={back} disabled={step === 0 || busy} aria-label="Back" className="grid size-12 place-items-center rounded-pill text-mute transition-colors hover:bg-white/10 hover:text-paper disabled:opacity-30">
                <ChevronLeft className="size-5" />
              </button>
              <button type="button" onClick={next} disabled={!valid[current.id] || busy} className="inline-flex h-12 min-w-44 items-center justify-center gap-2 rounded-pill bg-paper px-7 text-[15px] font-medium text-ink transition-all hover:bg-paper/85 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40">
                {busy && <Loader2 className="size-4 animate-spin" />}
                {current.id === 'hello' ? 'Let’s go' : current.id === 'review' ? 'Create my campaign' : current.id === 'look' ? 'Create my page' : 'Continue'}
                {!busy && <ArrowRight className="size-4" />}
              </button>
              <span className="hidden px-3 text-xs text-mute sm:block">
                or press <kbd className="rounded-pill bg-white/[0.08] px-2 py-0.5 font-mono">Enter</kbd>
              </span>
            </LiquidGlass>
          </div>
        )}
      </div>
    </div>
  )
}

/** Only fields the server accepts, with empty values left out. */
function clean(d: InviteData): InviteData {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(d)) {
    if (v === undefined || v === null) continue
    if (typeof v === 'string' && !v && k !== 'avatar' && k !== 'cover') continue
    out[k] = v
  }
  if (d.links) out.links = Object.fromEntries(Object.entries(d.links).filter(([, v]) => v?.trim()))
  return out as InviteData
}

/** Slow drifting colour behind everything, different for each part of the setup. */
function Backdrop({ step }: { step: number }) {
  const hue = useMemo(() => [0, 18, 38, 58, 78, 100][Math.min(5, Math.floor(step / 2))], [step])
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div className="absolute -top-1/4 left-1/4 size-[60rem] rounded-pill opacity-[0.16] blur-3xl" animate={{ x: [0, 80, -40, 0], y: [0, 40, 80, 0], background: `radial-gradient(closest-side, hsl(${210 + hue} 12% 70%), transparent)` }} transition={{ x: { duration: 22, repeat: Infinity }, y: { duration: 26, repeat: Infinity }, background: { duration: 1.2 } }} />
      <motion.div className="absolute right-0 bottom-0 size-[48rem] rounded-pill opacity-[0.12] blur-3xl" animate={{ x: [0, -60, 40, 0], y: [0, -50, 20, 0], background: `radial-gradient(closest-side, hsl(${260 + hue} 10% 65%), transparent)` }} transition={{ x: { duration: 28, repeat: Infinity }, y: { duration: 24, repeat: Infinity }, background: { duration: 1.2 } }} />
      <div className="absolute inset-0 [background-image:radial-gradient(rgb(255_255_255/0.07)_1px,transparent_1px)] [background-size:28px_28px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
    </div>
  )
}
