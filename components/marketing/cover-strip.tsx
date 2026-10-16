'use client'

import { Reveal } from '@/components/motion/reveal'
import { TransitionLink } from '@/components/shell/transition-link'
import type { Campaign } from '@/lib/campaigns'
import { CONTAINER } from '@/lib/layout'

/** A row of real, live campaigns: the covers, who they are for and what they pay. Hidden when nothing is live. */
export function CoverStrip({ campaigns, heading = 'Live right now', browse = true }: { campaigns: Campaign[]; heading?: string; browse?: boolean }) {
  const shown = campaigns.slice(0, 5)
  if (shown.length === 0) return null
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
          <Reveal key={c.id} delay={Math.min(i, 4) * 0.06}>
            <li>
              <TransitionLink href={`/campaign/${c.id}`} className="group block">
                <span className="relative block aspect-square overflow-hidden rounded-3xl bg-surface">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.cover} alt="" loading="lazy" className="size-full scale-[1.07] object-cover transition-transform duration-700 group-hover:scale-[1.12]" />
                </span>
                <span className="mt-4 block text-lg leading-tight tracking-[-0.01em]">{c.title}</span>
                <span className="mt-1 block text-[15px] text-paper/50">
                  {c.creator} · ${c.ratePer1k % 1 ? c.ratePer1k.toFixed(2) : c.ratePer1k} per 1K
                </span>
              </TransitionLink>
            </li>
          </Reveal>
        ))}
      </ul>
    </section>
  )
}
