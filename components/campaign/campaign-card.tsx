'use client'

import { motion } from 'framer-motion'
import { ArrowLeft, Minus, Plus } from 'lucide-react'
import { BrandIcon, PLATFORM_LABEL } from '@/components/brand-icon'
import { Layer, Tilt3D } from '@/components/motion/tilt'
import { TransitionLink } from '@/components/shell/transition-link'
import { useTransitions } from '@/components/shell/transition-provider'
import { type Campaign, usd } from '@/lib/campaigns'
import { EASE_OUT } from '@/lib/layout'
import { FavoriteButton } from './favorite-button'
import { PreviewPlayer } from './preview-player'
import { SubmitClip } from './submit-clip'

const D3 = '[transform-style:preserve-3d]'

/** One wide floating card: full-height cover on the left, everything else on the right. */
export function CampaignCard({ campaign }: { campaign: Campaign }) {
  const { morph } = useTransitions()
  return (
    <div className="mx-auto max-w-6xl">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease: EASE_OUT }}
        className="mb-4 flex justify-center"
      >
        <TransitionLink
          href="/"
          onClick={(e) => {
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
            e.preventDefault()
            morph('/', campaign.id)
          }}
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line-strong px-4 text-xs text-mute transition-colors hover:text-paper"
        >
          <ArrowLeft aria-hidden="true" className="size-3.5" />
          All campaigns
        </TransitionLink>
      </motion.div>

      <Tilt3D max={2.5} glare={false} perspective={2000}>
        <div className={`animate-float ${D3}`}>
          <article
            aria-label={`${campaign.title} by ${campaign.creator}`}
            className={`${D3} relative grid items-start gap-3 rounded-[36px] border border-white/[0.14] bg-gradient-to-b from-[#17171b] to-[#0a0a0c] p-3 shadow-[0_50px_90px_-40px_rgb(0_0_0/0.95),0_0_0_1px_rgb(255_255_255/0.03),inset_0_1px_0_rgb(255_255_255/0.18)] md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]`}
          >
            {/* left: a true square cover, then the preview and the brief */}
            <div className={`${D3} flex min-w-0 flex-col gap-2.5`}>
              <Layer z={22}>
                <div data-tour="cc-cover" data-vt-cover={campaign.id} className="relative aspect-square w-full overflow-hidden rounded-[8px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={campaign.cover} alt={`${campaign.title} cover art`} fetchPriority="high" className="absolute inset-0 h-full w-full object-cover" />
                </div>
              </Layer>

              <Layer z={14}>
                <PreviewPlayer campaign={campaign} />
              </Layer>

              <Layer z={10}>
                <section data-tour="cc-brief" aria-labelledby="brief-title" className="rounded-[24px] bg-white/[0.035] px-5 py-4 text-center">
                  <h2 id="brief-title" className="sr-only">
                    The brief
                  </h2>
                  <p className="text-pretty text-[13px] leading-relaxed text-paper/90">{campaign.summary}</p>
                </section>
              </Layer>
            </div>

            {/* right: title, numbers, rules, submit */}
            <div className={`${D3} flex min-w-0 flex-col gap-2.5 py-1 pr-1`}>
              <Layer z={36}>
                <div data-tour="cc-head" className="relative px-3 pt-2 pb-1 text-center">
                  <FavoriteButton id={campaign.id} className="absolute top-1 right-1" />
                  <p className="font-mono text-[11px] tracking-widest text-mute uppercase">{campaign.type}</p>
                  <h1 className="mt-1.5 font-display text-4xl leading-none md:text-5xl">{campaign.title}</h1>
                  <p className="mt-1.5 text-sm text-mute">by {campaign.creator}</p>
                  <ul className="mt-3 flex flex-wrap justify-center gap-1.5" aria-label="Platforms">
                    {campaign.platforms.map((p) => (
                      <li key={p} className="inline-flex items-center gap-1.5 rounded-full border border-line-strong px-2.5 py-1 text-[11px]">
                        <BrandIcon name={p} className="size-3" />
                        {PLATFORM_LABEL[p]}
                      </li>
                    ))}
                  </ul>
                </div>
              </Layer>

              <Layer z={22}>
                <div
                  data-tour="cc-earn"
                  className="grid grid-cols-3 divide-x divide-white/10 rounded-[24px] border border-white/10 bg-white/[0.05] py-3.5 text-center shadow-[inset_0_1px_0_rgb(255_255_255/0.1)]"
                >
                  <Stat value={usd(campaign.ratePer1k, 2)} label="per 1,000 views" />
                  <Stat value={usd(campaign.budget)} label="budget" />
                  <Stat value={campaign.endsOn} label="ends" />
                </div>
              </Layer>

              <Layer z={10}>
                <section data-tour="cc-rules" aria-label="Guidelines" className="grid gap-2.5 sm:grid-cols-2">
                  <Rules title="Clip this" items={campaign.clipThis} kind="do" />
                  <Rules title="Off-limits" items={campaign.offLimits} kind="dont" />
                </section>
              </Layer>

              <Layer z={16}>
                <div data-tour="cc-submit">
                  <SubmitClip campaign={campaign} />
                </div>
              </Layer>

              <p className="px-2 pb-1 text-center text-[11px] leading-relaxed text-mute">
                Only verified views are paid, through Stripe.{' '}
                <TransitionLink href="/legal/campaign-rules" className="underline underline-offset-4 hover:text-paper">
                  Campaign rules
                </TransitionLink>
              </p>
            </div>
          </article>
        </div>
      </Tilt3D>

      <div aria-hidden="true" className="animate-float-shadow mx-auto mt-8 h-8 w-[55%] rounded-full bg-black blur-2xl" />
    </div>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="px-2">
      <p className="font-display text-2xl leading-none md:text-3xl">{value}</p>
      <p className="mt-1.5 text-[11px] text-mute">{label}</p>
    </div>
  )
}

function Rules({ title, items, kind }: { title: string; items: string[]; kind: 'do' | 'dont' }) {
  const Icon = kind === 'do' ? Plus : Minus
  return (
    <div className="rounded-[24px] bg-white/[0.035] px-4 py-3.5">
      <h3 className="text-center font-mono text-[11px] tracking-widest text-mute uppercase">{title}</h3>
      <ul className="mt-3 flex flex-col gap-2">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-xs leading-snug text-paper/85">
            <Icon aria-hidden="true" className={kind === 'do' ? 'mt-0.5 size-3 shrink-0' : 'mt-0.5 size-3 shrink-0 text-signal'} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}
