'use client'

import { useFeature } from '@/components/shell/features-provider'
import { TransitionLink } from '@/components/shell/transition-link'
import type { Campaign } from '@/lib/campaigns'

/** A short row of the campaigns whose pool is nearly gone, so the ones worth hurrying for are easy to spot. */
export function EndingSoon({ campaigns }: { campaigns: Campaign[] }) {
  const on = useFeature('ending-soon')
  if (!on) return null
  const list = campaigns
    .filter((c) => c.budgetLeftPct !== undefined && c.budgetLeftPct <= 25)
    .sort((a, b) => (a.budgetLeftPct ?? 100) - (b.budgetLeftPct ?? 100))
    .slice(0, 4)
  if (list.length === 0) return null
  return (
    <section aria-label="Ending soon" className="mx-auto mb-8 flex max-w-[1300px] flex-wrap items-center justify-center gap-2 text-[15px]">
      <span className="mr-1 text-mute">Ending soon</span>
      {list.map((c) => (
        <TransitionLink key={c.id} href={`/campaign/${c.id}`} className="inline-flex h-9 items-center gap-2 rounded-pill border border-line-strong px-4 transition-colors hover:border-paper/60 hover:bg-paper/[0.05]">
          {c.title}
          <span className="text-mute tabular-nums">{c.budgetLeftPct}% left</span>
        </TransitionLink>
      ))}
    </section>
  )
}
