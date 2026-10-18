'use client'

import { motion } from 'framer-motion'
import type { Campaign } from '@/lib/campaigns'
import { useReveal } from '@/components/motion/use-reveal'
import { useDesign } from '@/components/shell/design-provider'
import { EASE_OUT } from '@/lib/layout'
import type { LayoutId } from '@/lib/design-choices'
import { CampaignRow } from './campaign-row'
import { CampaignTile } from './campaign-tile'

function Cell({ campaign, i, layout }: { campaign: Campaign; i: number; layout: LayoutId }) {
  const { scrollEffects } = useDesign()
  const { ref, state } = useReveal<HTMLLIElement>(scrollEffects)
  return (
    <motion.li
      ref={ref}
      className={layout === 'mosaic' && i % 9 === 0 ? 'col-span-2 row-span-2' : undefined}
      data-kb-cell
      data-tour={i === 0 ? 'tile' : undefined}
      data-campaign={i === 0 ? campaign.id : undefined}
      initial={false}
      animate={state === 'hidden' ? { opacity: 0, y: 28, scale: 0.96 } : { opacity: 1, y: 0, scale: 1 }}
      transition={state === 'hidden' ? { duration: 0 } : { duration: 0.75, ease: EASE_OUT, delay: (i % 4) * 0.07 }}
    >
      {layout === 'list' ? <CampaignRow campaign={campaign} priority={i < 5} /> : <CampaignTile campaign={campaign} priority={i < 5} />}
    </motion.li>
  )
}

/** How the campaigns sit on the page; chosen under Design, Layout. The grid is the standard look. */
const SHAPE: Record<LayoutId, string> = {
  grid: 'max-w-[1200px] grid-cols-2 gap-4 sm:grid-cols-3 md:gap-8 lg:grid-cols-4',
  large: 'max-w-[1100px] grid-cols-1 gap-6 sm:grid-cols-2 md:gap-10 lg:grid-cols-3',
  compact: 'max-w-[1240px] grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5 md:gap-5 lg:grid-cols-6',
  mosaic: 'max-w-[1200px] grid-flow-dense grid-cols-2 gap-4 sm:grid-cols-3 md:gap-8 lg:grid-cols-4',
  list: 'max-w-3xl grid-cols-1 gap-3',
}

export function CampaignGrid({ campaigns }: { campaigns: Campaign[] }) {
  const { layout } = useDesign()
  return (
    <ul data-no-copy data-kb-grid data-layout={layout} className={`mx-auto grid ${SHAPE[layout]}`}>
      {campaigns.map((campaign, i) => (
        <Cell key={campaign.id} campaign={campaign} i={i} layout={layout} />
      ))}
    </ul>
  )
}
