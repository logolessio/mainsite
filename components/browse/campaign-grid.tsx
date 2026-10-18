'use client'

import { motion } from 'framer-motion'
import type { Campaign } from '@/lib/campaigns'
import { useDesign } from '@/components/shell/design-provider'
import { EASE_OUT } from '@/lib/layout'
import { CampaignTile } from './campaign-tile'

export function CampaignGrid({ campaigns }: { campaigns: Campaign[] }) {
  const { scrollEffects } = useDesign()
  return (
    <ul data-no-copy data-kb-grid className="mx-auto grid max-w-[1200px] grid-cols-2 gap-4 sm:grid-cols-3 md:gap-8 lg:grid-cols-4">
      {campaigns.map((campaign, i) => (
        <motion.li
          key={campaign.id}
          data-kb-cell
          data-tour={i === 0 ? 'tile' : undefined}
          data-campaign={i === 0 ? campaign.id : undefined}
          initial={scrollEffects ? 'hidden' : false}
          whileInView={scrollEffects ? 'show' : undefined}
          viewport={{ once: true, margin: '0px 0px -8% 0px' }}
          custom={(i % 4) * 0.07}
          variants={{
            hidden: { opacity: 0, y: 28, scale: 0.96 },
            show: (d: number) => ({ opacity: 1, y: 0, scale: 1, transition: { duration: 0.75, ease: EASE_OUT, delay: d } }),
          }}
        >
          <CampaignTile campaign={campaign} priority={i < 5} />
        </motion.li>
      ))}
    </ul>
  )
}
