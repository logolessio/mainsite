'use client'

import { motion } from 'framer-motion'
import { CountUp } from '@/components/app/count-up'
import { useReveal } from '@/components/motion/use-reveal'
import { useDesign } from '@/components/shell/design-provider'
import type { PublicStats } from '@/lib/public-stats'
import { EASE_OUT } from '@/lib/layout'

/** Real totals, big. Appears under the campaigns once there is something to be proud of. */
export function LiveNumbers({ stats, preview }: { stats: PublicStats; preview?: boolean }) {
  const { scrollEffects } = useDesign()
  const { ref, state } = useReveal<HTMLElement>(scrollEffects)
  const items = [
    { label: 'Live campaigns', value: stats.campaigns.toLocaleString() },
    { label: 'Submissions posted', value: stats.clips.toLocaleString() },
    { label: 'Verified views', value: stats.views.toLocaleString() },
    { label: 'Paid to creators', value: `$${Math.floor(stats.paidCents / 100).toLocaleString()}` },
  ]
  return (
    <motion.section
      ref={ref}
      initial={false}
      animate={state === 'hidden' ? { opacity: 0, y: 28 } : { opacity: 1, y: 0 }}
      transition={state === 'hidden' ? { duration: 0 } : { duration: 0.8, ease: EASE_OUT }}
      aria-label="logoless in numbers"
      className="mx-auto mt-24 max-w-[1200px]"
    >
      <div className="mb-5 flex items-center justify-between">
        <p className="text-xs text-mute">logoless, right now</p>
        {preview && <p className="rounded-pill border border-amber-300/40 px-3 py-1 text-[11px] text-amber-200">Preview: hidden on logoless.io until the numbers are bigger</p>}
      </div>
      <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-[calc(2rem*var(--round,1))] border border-line bg-line lg:grid-cols-4">
        {items.map((it) => (
          <li key={it.label} className="bg-[#09090b] px-6 py-9 md:py-12">
            <p className="font-display text-4xl leading-none tracking-tight tabular-nums md:text-6xl">
              <CountUp value={it.value} />
            </p>
            <p className="mt-3 text-sm text-mute">{it.label}</p>
          </li>
        ))}
      </ul>
    </motion.section>
  )
}
