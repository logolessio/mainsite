'use client'

import { motion } from 'framer-motion'
import type { Campaign } from '@/lib/campaigns'
import { EASE_OUT } from '@/lib/layout'
import { CampaignTile } from './campaign-tile'

export function CampaignGrid({ campaigns }: { campaigns: Campaign[] }) {
  return (
    <motion.ul
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.05, delayChildren: 0.15 } } }}
      className="mx-auto grid max-w-[1200px] grid-cols-2 gap-4 [perspective:1400px] sm:grid-cols-3 md:gap-8 lg:grid-cols-4"
    >
      {campaigns.map((campaign, i) => (
        <motion.li
          key={campaign.id}
          data-tour={i === 0 ? 'tile' : undefined}
          data-campaign={i === 0 ? campaign.id : undefined}
          variants={{
            hidden: { opacity: 0, y: 24, scale: 0.97 },
            show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.55, ease: EASE_OUT } },
          }}
        >
          <CampaignTile campaign={campaign} priority={i < 5} />
        </motion.li>
      ))}
    </motion.ul>
  )
}
