'use client'

import { FadeImg } from '@/components/ui/fade-img'
import { COVER_IMG, COVER_LIFT, CoverSlide } from '@/components/browse/cover-slide'
import { NoCampaigns } from '@/components/browse/no-campaigns'
import { Reveal } from '@/components/motion/reveal'
import { TransitionLink } from '@/components/shell/transition-link'
import type { Campaign } from '@/lib/campaigns'
import { CONTAINER } from '@/lib/layout'

/** A row of real, live campaigns: the covers, who they are for and what they pay. When nothing is live it says new ones are coming. */
export function CoverStrip({ campaigns, heading = 'Browse our active campaigns.', browse = true }: { campaigns: Campaign[]; heading?: string; browse?: boolean }) {
  const shown = campaigns.slice(0, 5)
  if (shown.length === 0)
    return (
      <section className={`${CONTAINER} pb-24 md:pb-40`} aria-label="Campaigns">
        <div className="border-t border-line pt-8 md:pt-10">
          <NoCampaigns as="h2" className="max-w-2xl" />
        </div>
      </section>
    )
  return (
    <section className={`${CONTAINER} pb-24 md:pb-40`} aria-label={heading}>
      <div className="mb-8 flex items-end justify-between gap-6 border-t border-line pt-5">
        <p className="text-[15px] text-paper/50">{heading}</p>
        {browse && (
          <TransitionLink href="/" className="text-[15px] text-paper/70 underline underline-offset-4 transition-colors hover:text-paper">
            See all campaigns
          </TransitionLink>
        )}
      </div>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-5 md:gap-x-5">
        {shown.map((c, i) => (
          <Reveal key={c.id} as="li" delay={Math.min(i, 4) * 0.06}>
            <TransitionLink href={`/campaign/${c.id}`} aria-label={`${c.title} by ${c.creator}`} className={`group/tile block rounded-3xl shadow-[0_14px_30px_-18px_rgb(0_0_0/0.9)] ${COVER_LIFT}`}>
              <span className="relative block aspect-square overflow-hidden rounded-[inherit] bg-surface">
                <FadeImg src={c.cover} alt="" loading="lazy" className={`size-full scale-[1.07] object-cover ${COVER_IMG}`} />
                <CoverSlide title={c.title} creator={c.creator} rate={c.ratePer1k} />
              </span>
            </TransitionLink>
          </Reveal>
        ))}
      </ul>
    </section>
  )
}
