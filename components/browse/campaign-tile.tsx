'use client'

import { useInView } from 'framer-motion'
import { useRef } from 'react'
import { FadeImg } from '@/components/ui/fade-img'
import { useCampaignModal } from '@/components/campaign/campaign-modal'
import { useDesign } from '@/components/shell/design-provider'
import { type Campaign, usd } from '@/lib/campaigns'
import { useFeature } from '@/components/shell/features-provider'
import { COVER_IMG, COVER_IMG_SOFT, COVER_LIFT, COVER_LIFT_SOFT, CoverSlide } from './cover-slide'

/**
 * A campaign cover, and nothing else: no icons, no text on top of the art. When the pointer (or keyboard focus) is on it, one
 * panel slides up from the bottom with the name, who it is for and what it pays. The cover is cropped in a touch so the thin white
 * edge some album art has baked in never shows. The border and the budget bar can be switched on from Design.
 */
export function CampaignTile({ campaign, priority }: { campaign: Campaign; priority?: boolean }) {
  const { open } = useCampaignModal()
  const { coverBorder, coverBar } = useDesign()
  const left = Math.max(0, Math.min(100, campaign.budgetLeftPct ?? 100))
  const root = useRef<HTMLDivElement>(null)
  const seen = useInView(root, { once: true, margin: '0px 0px -10% 0px' })
  const soft = useFeature('home-motion')
  // a faint light that follows the pointer across the cover; only a CSS variable changes, so it costs no re-render
  const glow = soft
    ? (e: React.PointerEvent<HTMLDivElement>) => {
        if (e.pointerType !== 'mouse') return
        const r = e.currentTarget.getBoundingClientRect()
        e.currentTarget.style.setProperty('--gx', `${((e.clientX - r.left) / r.width) * 100}%`)
        e.currentTarget.style.setProperty('--gy', `${((e.clientY - r.top) / r.height) * 100}%`)
      }
    : undefined

  return (
    <div ref={root} data-vt-cover={campaign.id} onPointerMove={glow} className={`group/tile relative aspect-square w-full rounded-[calc(22px*var(--round,1))] bg-surface shadow-[0_14px_30px_-18px_rgb(0_0_0/0.9)] ${soft ? COVER_LIFT_SOFT : COVER_LIFT}`}>
      <button
        type="button"
        onClick={() => open(campaign)}
        aria-label={`${campaign.title} by ${campaign.creator}. ${usd(campaign.ratePer1k, 2)} per 1,000 views. Open campaign.`}
        className="absolute inset-0 block overflow-hidden rounded-[inherit] text-left outline-none focus-visible:ring-2 focus-visible:ring-paper"
      >
        {/* a fixed crop just past the edge hides any white border the artwork was exported with */}
        <FadeImg src={campaign.cover} alt="" loading={priority ? 'eager' : 'lazy'} className={`absolute inset-0 h-full w-full scale-[1.07] object-cover ${soft ? COVER_IMG_SOFT : COVER_IMG}`} />
        {soft && <span aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-0 mix-blend-soft-light transition-opacity duration-500 group-hover/tile:opacity-100 motion-reduce:hidden" style={{ background: 'radial-gradient(420px circle at var(--gx, 50%) var(--gy, 30%), rgb(255 255 255 / 0.32), transparent 45%)' }} />}
        <CoverSlide title={campaign.title} creator={campaign.creator} rate={campaign.ratePer1k} />
        {coverBorder && <span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-white/10" />}
        {coverBar && (
          <span role="img" aria-label={`${left}% of the budget left`} title={`${left}% of the budget left`} className="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-white/15">
            <span style={{ width: seen ? `${left}%` : '0%' }} className="block h-full rounded-r-pill bg-white/90 transition-[width] duration-[1200ms] ease-[cubic-bezier(.22,1,.36,1)] [transition-delay:300ms]" />
          </span>
        )}
      </button>
    </div>
  )
}
