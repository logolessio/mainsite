'use client'

import { motion } from 'framer-motion'
import { ArrowDown, ArrowLeft, Check, Clock, Coins, Film, Minus, Plus, Send, Share2, ShieldCheck, Wallet } from 'lucide-react'
import { useEffect, useState } from 'react'
import { CampaignTile } from '@/components/browse/campaign-tile'
import { BrandIcon, PLATFORM_LABEL } from '@/components/brand-icon'
import { Reveal } from '@/components/motion/reveal'
import { Tilt3D } from '@/components/motion/tilt'
import { TransitionLink } from '@/components/shell/transition-link'
import { useTransitions } from '@/components/shell/transition-provider'
import { type Campaign, usd } from '@/lib/campaigns'
import { EASE_OUT } from '@/lib/layout'
import { SITE } from '@/lib/site'
import { cn } from '@/lib/utils'
import { EarnCalculator } from './earn-calculator'
import { FavoriteButton } from './favorite-button'
import { PreviewPlayer } from './preview-player'
import { SubmitClip } from './submit-clip'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "Oct 30" becomes the number of days from now, or null if there is no usable end date. */
function daysLeft(s: string) {
  const m = /^([A-Za-z]{3}) (\d{1,2})$/.exec(s.trim())
  if (!m) return null
  const mon = MONTHS.indexOf(m[1])
  if (mon < 0) return null
  const now = new Date()
  let end = new Date(now.getFullYear(), mon, Number(m[2]), 23, 59, 59)
  if (end.getTime() < now.getTime() - 30 * 86400000) end = new Date(now.getFullYear() + 1, mon, Number(m[2]), 23, 59, 59)
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86400000))
}

/** The whole campaign page: a big hero, the numbers, the brief next to an earnings calculator, the rules, how you get paid, and the form. */
export function CampaignCard({ campaign, others = [] }: { campaign: Campaign; others?: Campaign[] }) {
  const { morph } = useTransitions()
  const [left, setLeft] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)
  useEffect(() => setLeft(daysLeft(campaign.endsOn)), [campaign.endsOn])

  const share = async () => {
    const url = window.location.href
    try {
      if (navigator.share) await navigator.share({ title: `${campaign.title} on logoless`, url })
      else {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        window.setTimeout(() => setCopied(false), 2000)
      }
    } catch {
      /* cancelled */
    }
  }
  const goSubmit = () => document.getElementById('submit')?.scrollIntoView({ behavior: 'smooth', block: 'center' })

  return (
    <div className="relative">
      {/* the cover's colours wash over the top of the page */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 -top-40 h-[820px] overflow-hidden [mask-image:linear-gradient(to_bottom,black_30%,transparent)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={campaign.cover} alt="" className="absolute inset-0 size-full scale-125 object-cover opacity-[0.34] blur-[90px] saturate-[1.6]" />
      </div>

      <div className="relative mx-auto max-w-[1180px]">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, ease: EASE_OUT }} className="mb-8 md:mb-12">
          <TransitionLink
            href="/"
            onClick={(e) => {
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
              e.preventDefault()
              morph('/', campaign.id)
            }}
            className="glass-liquid inline-flex h-10 items-center gap-2 rounded-full px-5 text-sm text-mute transition-colors hover:text-paper"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            All campaigns
          </TransitionLink>
        </motion.div>

        {/* ---------------- hero ---------------- */}
        <section className="grid items-center gap-10 lg:grid-cols-[minmax(0,500px)_minmax(0,1fr)] lg:gap-16">
          <Tilt3D max={5} glare={false} perspective={1600} className="mx-auto w-full max-w-[520px] lg:mx-0">
            <div data-tour="cc-cover" data-vt-cover={campaign.id} className="relative aspect-square w-full overflow-hidden rounded-[10px] shadow-[0_60px_110px_-40px_rgb(0_0_0/0.95),0_0_0_1px_rgb(255_255_255/0.1)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={campaign.cover} alt={`${campaign.title} cover art`} fetchPriority="high" className="absolute inset-0 h-full w-full object-cover" />
            </div>
          </Tilt3D>

          <div data-tour="cc-head" className="min-w-0">
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.1 }} className="flex flex-wrap items-center gap-2.5">
              <span className="rounded-full border border-white/15 bg-white/[0.05] px-3.5 py-1.5 font-mono text-[11px] tracking-[0.18em] text-paper/80 uppercase">{campaign.type}</span>
              {left !== null && (
                <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs', left <= 7 ? 'bg-paper text-ink' : 'border border-white/15 text-mute')}>
                  <Clock aria-hidden="true" className="size-3.5" />
                  {left === 0 ? 'Ends today' : left === 1 ? '1 day left' : `${left} days left`}
                </span>
              )}
            </motion.div>

            <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.85, ease: EASE_OUT, delay: 0.18 }} className="mt-5 font-display text-[3.4rem] leading-[0.92] font-medium tracking-tight text-balance md:text-[5.6rem]">
              {campaign.title}
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.3 }} className="mt-3 text-xl text-mute md:text-2xl">
              by <span className="text-paper">{campaign.creator}</span>
            </motion.p>

            <motion.ul initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.38 }} aria-label="Platforms that count" className="mt-6 flex flex-wrap gap-2">
              {campaign.platforms.map((p) => (
                <li key={p} className="inline-flex h-10 items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-4 text-sm">
                  <BrandIcon name={p} className="size-4" />
                  {PLATFORM_LABEL[p]}
                </li>
              ))}
            </motion.ul>

            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.46 }} className="mt-8 max-w-xl">
              <PreviewPlayer campaign={campaign} />
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.54 }} className="mt-6 flex flex-wrap items-center gap-3">
              <button type="button" onClick={goSubmit} className="inline-flex h-14 items-center gap-2.5 rounded-full bg-paper px-8 text-base font-medium text-ink transition-all hover:bg-paper/85 active:scale-95">
                <Send aria-hidden="true" className="size-4" /> Submit a clip
              </button>
              <FavoriteButton id={campaign.id} className="!size-14" />
              <button type="button" onClick={share} aria-label="Share this campaign" title="Share" className="grid size-14 place-items-center rounded-full border border-line-strong transition-colors hover:bg-paper/10">
                {copied ? <Check className="size-5" /> : <Share2 className="size-5" />}
              </button>
              {copied && <span role="status" className="text-sm text-mute">Link copied</span>}
            </motion.div>
          </div>
        </section>

        {/* ---------------- the numbers ---------------- */}
        <Reveal y={24} className="mt-16 md:mt-24">
          <div data-tour="cc-earn" className="grid gap-4 md:grid-cols-3">
            <Stat icon={Coins} label="You earn" value={usd(campaign.ratePer1k, 2)} sub="for every 1,000 verified views" lead />
            <Stat icon={Wallet} label="Total budget" value={usd(campaign.budget)} sub="the pool clippers are paid from" />
            <Stat icon={Clock} label="Deadline" value={campaign.endsOn || 'Open'} sub={left === null ? 'No end date set' : left === 0 ? 'Ends today' : `${left} day${left === 1 ? '' : 's'} to go`} />
          </div>
        </Reveal>

        {/* ---------------- brief + calculator ---------------- */}
        <section className="mt-20 grid gap-10 md:mt-32 lg:grid-cols-[minmax(0,1fr)_minmax(0,430px)] lg:gap-16">
          <Reveal y={24} className="min-w-0">
            <div data-tour="cc-brief" aria-labelledby="brief-title">
              <Eyebrow n="01" label="The brief" id="brief-title" />
              <p className="mt-6 text-2xl leading-[1.45] font-light tracking-tight text-pretty text-paper/90 md:text-[1.9rem]">{campaign.summary}</p>
            </div>
          </Reveal>
          <Reveal y={24} delay={0.1} className="min-w-0">
            <EarnCalculator rate={campaign.ratePer1k} />
          </Reveal>
        </section>

        {/* ---------------- rules ---------------- */}
        <section data-tour="cc-rules" aria-label="Guidelines" className="mt-20 md:mt-32">
          <Reveal y={24}>
            <Eyebrow n="02" label="Do this, not that" />
          </Reveal>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <Reveal y={28}>
              <Rules title="Clip this" items={campaign.clipThis} kind="do" />
            </Reveal>
            <Reveal y={28} delay={0.1}>
              <Rules title="Off-limits" items={campaign.offLimits} kind="dont" />
            </Reveal>
          </div>
        </section>

        {/* ---------------- how you get paid ---------------- */}
        <section className="mt-20 md:mt-32" aria-label="How you get paid">
          <Reveal y={24}>
            <Eyebrow n="03" label="How you get paid" />
          </Reveal>
          <ol className="mt-8 grid gap-4 md:grid-cols-4">
            {[
              { icon: Film, t: 'Make a clip', d: 'Cut something that fits the brief, or use the official audio in your own edit.' },
              { icon: Send, t: 'Post and submit', d: `Post it on ${campaign.platforms.map((p) => PLATFORM_LABEL[p]).join(', ')}, then paste the link below.` },
              { icon: ShieldCheck, t: 'We verify', d: 'We check the real views on the platform. Only verified views count.' },
              { icon: Wallet, t: 'Get paid', d: `Earnings are held ${SITE.holdDays} days, then you can withdraw from $${SITE.minPayoutUsd}.` },
            ].map((s, i) => (
              <li key={s.t}>
                <Reveal y={26} delay={i * 0.07} className="h-full">
                  <div className="relative h-full rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-6">
                    <span className="font-mono text-xs text-mute">0{i + 1}</span>
                    <s.icon aria-hidden="true" className="mt-5 size-7" />
                    <h3 className="mt-5 font-display text-2xl">{s.t}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-mute">{s.d}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>
        </section>

        {/* ---------------- submit ---------------- */}
        <Reveal y={28} className="mt-20 md:mt-32">
          <section id="submit" data-tour="cc-submit" className="scroll-mt-28 overflow-hidden rounded-[2.25rem] border border-white/12 bg-gradient-to-b from-[#17171b] to-[#0a0a0c] p-7 shadow-[0_50px_100px_-50px_rgb(0_0_0/0.95),inset_0_1px_0_rgb(255_255_255/0.14)] md:p-12">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-center lg:gap-16">
              <div>
                <Eyebrow n="04" label="Your turn" />
                <h2 className="mt-5 font-display text-4xl leading-[1] tracking-tight md:text-5xl">Posted it? Send us the link.</h2>
                <p className="mt-4 text-base leading-relaxed text-mute">We check every clip against the brief. Approved clips start earning from the first verified view.</p>
              </div>
              <SubmitClip campaign={campaign} />
            </div>
          </section>
        </Reveal>

        <p className="mt-8 text-center text-sm text-mute">
          Only verified views are paid, through Stripe.{' '}
          <TransitionLink href="/legal/campaign-rules" className="underline underline-offset-4 hover:text-paper">
            Campaign rules
          </TransitionLink>
        </p>

        {/* ---------------- more ---------------- */}
        {others.length > 0 && (
          <section className="mt-24 md:mt-36" aria-label="More campaigns">
            <Reveal y={24}>
              <div className="flex items-end justify-between gap-4">
                <h2 className="font-display text-4xl tracking-tight md:text-5xl">More to clip</h2>
                <TransitionLink href="/" className="inline-flex h-10 items-center gap-2 rounded-full border border-line-strong px-5 text-sm text-mute hover:text-paper">
                  See all
                </TransitionLink>
              </div>
            </Reveal>
            <ul className="mt-8 grid grid-cols-2 gap-4 [perspective:1400px] md:gap-8 lg:grid-cols-4">
              {others.slice(0, 4).map((c) => (
                <li key={c.id}>
                  <CampaignTile campaign={c} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <StickySubmit onClick={goSubmit} />
    </div>
  )
}

/** On phones, a button follows you down the page until you reach the form. */
function StickySubmit({ onClick }: { onClick: () => void }) {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const form = document.getElementById('submit')
    const onScroll = () => {
      const r = form?.getBoundingClientRect()
      const nearForm = r ? r.top < window.innerHeight && r.bottom > 0 : false
      setShow(window.scrollY > 700 && !nearForm)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return (
    <div className={cn('pointer-events-none fixed inset-x-0 bottom-5 z-40 flex justify-center px-4 transition-all duration-300 md:hidden', show ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0')}>
      <button type="button" onClick={onClick} tabIndex={show ? 0 : -1} className="glass-liquid pointer-events-auto inline-flex h-14 items-center gap-2.5 rounded-full px-7 text-base font-medium backdrop-blur-xl">
        <ArrowDown aria-hidden="true" className="size-4" /> Submit a clip
      </button>
    </div>
  )
}

function Eyebrow({ n, label, id }: { n: string; label: string; id?: string }) {
  return (
    <h2 id={id} className="flex items-center gap-4 font-mono text-xs tracking-[0.22em] text-mute uppercase">
      <span className="text-paper">{n}</span>
      <span aria-hidden="true" className="h-px w-10 bg-line-strong" />
      {label}
    </h2>
  )
}

function Stat({ icon: Icon, label, value, sub, lead = false }: { icon: typeof Coins; label: string; value: string; sub: string; lead?: boolean }) {
  return (
    <div className={cn('relative overflow-hidden rounded-[2rem] border p-7 md:p-8', lead ? 'border-white/25 bg-gradient-to-br from-white/[0.12] to-white/[0.03]' : 'border-white/10 bg-white/[0.035]')}>
      <div className="flex items-center justify-between">
        <p className="font-mono text-[11px] tracking-[0.2em] text-mute uppercase">{label}</p>
        <Icon aria-hidden="true" className="size-5 text-mute" />
      </div>
      <p className="mt-6 font-display text-5xl leading-none tracking-tight tabular-nums md:text-6xl">{value}</p>
      <p className="mt-3 text-sm text-mute">{sub}</p>
    </div>
  )
}

function Rules({ title, items, kind }: { title: string; items: string[]; kind: 'do' | 'dont' }) {
  const Icon = kind === 'do' ? Plus : Minus
  return (
    <div className={cn('h-full rounded-[2rem] border p-7 md:p-9', kind === 'do' ? 'border-white/15 bg-white/[0.045]' : 'border-white/[0.08] bg-white/[0.02]')}>
      <div className="flex items-center gap-4">
        <span className={cn('grid size-12 place-items-center rounded-full', kind === 'do' ? 'bg-paper text-ink' : 'border border-white/20 text-mute')}>
          <Icon aria-hidden="true" className="size-5" />
        </span>
        <h3 className="font-display text-3xl tracking-tight">{title}</h3>
      </div>
      <ul className="mt-7 divide-y divide-white/[0.08]">
        {items.length === 0 && <li className="py-4 text-base text-mute">Nothing specific.</li>}
        {items.map((item, i) => (
          <li key={item} className="flex gap-4 py-4 text-base leading-relaxed text-paper/90 first:pt-0 last:pb-0">
            <span className="mt-1 font-mono text-xs text-mute tabular-nums">{String(i + 1).padStart(2, '0')}</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}
