'use client'

import { motion } from 'framer-motion'
import type { Campaign } from '@/lib/campaigns'
import { useReveal } from '@/components/motion/use-reveal'
import { useDesign } from '@/components/shell/design-provider'
import { useFeature } from '@/components/shell/features-provider'
import { EASE_OUT } from '@/lib/layout'
import type { LayoutId } from '@/lib/design-choices'
import { CampaignRow } from './campaign-row'
import { CampaignTile } from './campaign-tile'

/** How many covers are usually on screen when the page opens: those rise in with plain CSS, so they show even before the page's scripts run. */
const FIRST = 8

function Cell({ campaign, i, layout }: { campaign: Campaign; i: number; layout: LayoutId }) {
  const { scrollEffects } = useDesign()
  const soft = useFeature('home-motion')
  const { ref, state } = useReveal<HTMLLIElement>(scrollEffects && !soft)
  const body = layout === 'list' ? <CampaignRow campaign={campaign} priority={i < 5} /> : <CampaignTile campaign={campaign} priority={i < 5} />
  const shape = layout === 'mosaic' && i % 9 === 0 ? 'col-span-2 row-span-2' : undefined
  const marks = { 'data-kb-cell': true, 'data-tour': i === 0 ? 'tile' : undefined, 'data-campaign': i === 0 ? campaign.id : undefined }
  if (soft) {
    // a light rise as each cover arrives: a little movement and a fade, staggered across the row, once
    if (i < FIRST) return <li {...marks} className={`cover-in ${shape ?? ''}`} style={{ ['--d' as string]: `${80 + (i % 4) * 60 + Math.floor(i / 4) * 90}ms` }}>{body}</li>
    return (
      <motion.li
        {...marks}
        className={shape}
        initial={{ opacity: 0, y: 18, scale: 0.975 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, margin: '0px 0px -6% 0px' }}
        transition={{ duration: 0.6, ease: EASE_OUT, delay: (i % 4) * 0.055 }}
      >
        {body}
      </motion.li>
    )
  }
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
