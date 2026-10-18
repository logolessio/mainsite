'use client'

import { motion } from 'framer-motion'
import type { Campaign } from '@/lib/campaigns'
import { useReveal } from '@/components/motion/use-reveal'
import { useDesign } from '@/components/shell/design-provider'
import { EASE_OUT } from '@/lib/layout'
import { CampaignTile } from './campaign-tile'

function Cell({ campaign, i }: { campaign: Campaign; i: number }) {
  const { scrollEffects } = useDesign()
  const { ref, state } = useReveal<HTMLLIElement>(scrollEffects)
  return (
    <motion.li
      ref={ref}
      data-kb-cell
      data-tour={i === 0 ? 'tile' : undefined}
      data-campaign={i === 0 ? campaign.id : undefined}
      initial={false}
      animate={state === 'hidden' ? { opacity: 0, y: 28, scale: 0.96 } : { opacity: 1, y: 0, scale: 1 }}
      transition={state === 'hidden' ? { duration: 0 } : { duration: 0.75, ease: EASE_OUT, delay: (i % 4) * 0.07 }}
    >
      <CampaignTile campaign={campaign} priority={i < 5} />
    </motion.li>
  )
}

export function CampaignGrid({ campaigns }: { campaigns: Campaign[] }) {
  return (
    <ul data-no-copy data-kb-grid className="mx-auto grid max-w-[1200px] grid-cols-2 gap-4 sm:grid-cols-3 md:gap-8 lg:grid-cols-4">
      {campaigns.map((campaign, i) => (
        <Cell key={campaign.id} campaign={campaign} i={i} />
      ))}
    </ul>
  )
}
