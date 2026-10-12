'use client'

import { motion } from 'framer-motion'
import { ArrowDown, ArrowLeft, Check, Share2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { CampaignTile } from '@/components/browse/campaign-tile'
import { BrandIcon, PLATFORM_LABEL } from '@/components/brand-icon'
import { Reveal } from '@/components/motion/reveal'
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
export function CampaignCard({ campaign, others = [], poolLeftCents = null }: { campaign: Campaign; others?: Campaign[]; poolLeftCents?: number | null }) {
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
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, ease: EASE_OUT }} className="mb-10 md:mb-14">
          <TransitionLink
            href="/"
            onClick={(e) => {
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
              e.preventDefault()
              morph('/', campaign.id)
            }}
            className="inline-flex items-center gap-2 text-[15px] text-paper/50 transition-colors hover:text-paper"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            All campaigns
          </TransitionLink>
        </motion.div>

        {/* ---------------- hero ---------------- */}
        <section className="grid items-end gap-10 lg:grid-cols-[minmax(0,480px)_minmax(0,1fr)] lg:gap-20">
          <div className="mx-auto w-full max-w-[500px] lg:mx-0">
            <div data-tour="cc-cover" data-vt-cover={campaign.id} className="relative aspect-square w-full overflow-hidden rounded-[2rem] shadow-[0_60px_110px_-40px_rgb(0_0_0/0.95)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={campaign.cover} alt={`${campaign.title} cover art`} fetchPriority="high" className="absolute inset-0 h-full w-full scale-[1.07] object-cover" />
            </div>
          </div>

          <div data-tour="cc-head" className="min-w-0 pb-1">
            <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.1 }} className="text-[15px] text-paper/50">
              {campaign.type}
              {left !== null && <span className={left <= 7 ? 'text-paper' : undefined}>{`  ·  ${left === 0 ? 'Ends today' : left === 1 ? '1 day left' : `${left} days left`}`}</span>}
            </motion.p>

            <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.85, ease: EASE_OUT, delay: 0.18 }} className="mt-5 font-display text-[3.6rem] leading-[0.88] tracking-[-0.045em] text-balance md:text-[6.4rem]">
              {campaign.title}
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.3 }} className="mt-5 text-xl text-paper/50 md:text-2xl">
              by <span className="text-paper">{campaign.creator}</span>
            </motion.p>

            <motion.ul initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.38 }} aria-label="Platforms that count" className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
              {campaign.platforms.map((p) => (
                <li key={p} className="inline-flex items-center gap-2 text-[15px] text-paper/70">
                  <BrandIcon name={p} className="size-4" />
                  {PLATFORM_LABEL[p]}
                </li>
              ))}
            </motion.ul>

            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.46 }} className="mt-8 max-w-xl">
              <PreviewPlayer campaign={campaign} />
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.54 }} className="mt-8 flex flex-wrap items-center gap-3">
              <button type="button" onClick={goSubmit} className="inline-flex h-14 items-center gap-2.5 rounded-full bg-paper px-9 text-base font-medium text-ink transition-colors hover:bg-white active:scale-[0.98]">
                Submit a clip
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
        <Reveal className="mt-24 md:mt-36">
          <div data-tour="cc-earn" className="grid gap-12 md:grid-cols-3 md:gap-10">
            <Stat label="You earn" value={usd(campaign.ratePer1k, 2)} sub="for every 1,000 verified views" />
            <Stat label="Total budget" value={usd(campaign.budget)} sub="the pool clippers are paid from" />
            <Stat label="Deadline" value={campaign.endsOn || 'Open'} sub={left === null ? 'No end date set' : left === 0 ? 'Ends today' : `${left} day${left === 1 ? '' : 's'} to go`} />
          </div>
          {poolLeftCents !== null && <PoolMeter leftCents={poolLeftCents} budget={campaign.budget} />}
        </Reveal>

        {/* ---------------- brief + calculator ---------------- */}
        <section className="mt-24 grid gap-12 border-t border-line pt-10 md:mt-36 lg:grid-cols-[minmax(0,1fr)_minmax(0,430px)] lg:gap-20">
          <Reveal className="min-w-0">
            <div data-tour="cc-brief" aria-labelledby="brief-title">
              <Eyebrow n="01" label="The brief" id="brief-title" />
              <p className="mt-6 text-2xl leading-[1.4] font-light tracking-[-0.02em] text-pretty text-paper/90 md:text-[2.1rem]">{campaign.summary}</p>
            </div>
          </Reveal>
          <Reveal delay={0.1} className="min-w-0">
            <EarnCalculator rate={campaign.ratePer1k} />
          </Reveal>
        </section>

        {/* ---------------- rules ---------------- */}
        <section data-tour="cc-rules" aria-label="Guidelines" className="mt-24 border-t border-line pt-10 md:mt-36">
          <Reveal>
            <Eyebrow n="02" label="Do this, not that" />
          </Reveal>
          <div className="mt-10 grid gap-16 md:grid-cols-2 md:gap-10">
            <Reveal>
              <Rules title="Clip this" items={campaign.clipThis} />
            </Reveal>
            <Reveal delay={0.1}>
              <Rules title="Off-limits" items={campaign.offLimits} />
            </Reveal>
          </div>
        </section>

        {/* ---------------- how you get paid ---------------- */}
        <section className="mt-24 border-t border-line pt-10 md:mt-36" aria-label="How you get paid">
          <Reveal>
            <Eyebrow n="03" label="How you get paid" />
          </Reveal>
          <ol className="mt-10 grid gap-10 md:grid-cols-4 md:gap-8">
            {[
              { t: 'Make a clip', d: 'Cut something that fits the brief, or use the official audio in your own edit.' },
              { t: 'Post and submit', d: `Post it on ${campaign.platforms.map((p) => PLATFORM_LABEL[p]).join(', ')}, then paste the link below.` },
              { t: 'We verify', d: 'We check the real views on the platform. Only verified views count.' },
              { t: 'Get paid', d: `Earnings are held ${SITE.holdDays} days, then you can withdraw from $${SITE.minPayoutUsd}.` },
            ].map((s, i) => (
              <li key={s.t}>
                <Reveal delay={i * 0.07} className="h-full">
                  <h3 className="font-display text-2xl tracking-[-0.02em] md:text-[1.7rem]">{s.t}</h3>
                  <p className="mt-3 max-w-[30ch] text-[15px] leading-relaxed text-paper/55">{s.d}</p>
                </Reveal>
              </li>
            ))}
          </ol>
        </section>

        {/* ---------------- submit ---------------- */}
        <Reveal className="mt-24 md:mt-36">
          <section id="submit" data-tour="cc-submit" className="scroll-mt-28 border-t border-line pt-10">
            <div className="grid gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-20">
              <div>
                <Eyebrow n="04" label="Your turn" />
                <h2 className="mt-5 font-display text-4xl leading-[0.98] tracking-[-0.04em] md:text-[3.6rem]">Posted it? Send us the link.</h2>
                <p className="mt-5 max-w-sm text-lg leading-relaxed text-paper/55">We check every clip against the brief. Approved clips start earning from the first verified view.</p>
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
    <h2 id={id} data-n={n} className="text-[15px] text-paper/45">
      {label}
    </h2>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="border-t border-line pt-5">
      <p className="text-[15px] text-paper/50">{label}</p>
      <p className="mt-6 font-display text-6xl leading-none tracking-[-0.045em] tabular-nums md:text-[5.5rem]">{value}</p>
      <p className="mt-4 text-[15px] text-paper/50">{sub}</p>
    </div>
  )
}

function Rules({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="font-display text-4xl tracking-[-0.035em] md:text-5xl">{title}</h3>
      <ul className="mt-9 border-b border-line">
        {items.length === 0 && <li className="border-t border-line py-4 text-lg text-paper/50">Nothing specific.</li>}
        {items.map((item) => (
          <li key={item} className="border-t border-line py-4 text-lg leading-relaxed text-paper/80">
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

/** How much of the pool is still unpaid. Real money from the ledger, so it only shows for campaigns that have been funded. */
function PoolMeter({ leftCents, budget }: { leftCents: number; budget: number }) {
  const pct = Math.max(0, Math.min(100, Math.round((leftCents / 100 / Math.max(1, budget)) * 100)))
  const low = pct <= 15
  return (
    <div className="mt-12 border-t border-line pt-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm text-mute">
          <span className={cn('font-display text-2xl', low && 'text-paper')}>{usd(Math.max(0, leftCents / 100))}</span> still up for grabs
        </p>
        <p className="text-sm text-paper/50">{low ? (pct === 0 ? 'Pool is empty' : 'Almost gone') : `${pct}% of the pool left`}</p>
      </div>
      <div className="mt-4 h-px overflow-hidden bg-white/15" role="progressbar" aria-label="Pool remaining" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
        <motion.div initial={{ width: 0 }} whileInView={{ width: `${pct}%` }} viewport={{ once: true }} transition={{ duration: 1.1, ease: EASE_OUT }} className="h-px bg-paper" />
      </div>
    </div>
  )
}
