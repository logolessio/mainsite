'use client'

import { motion, useInView, useMotionTemplate, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { ArrowUpRight, Pause, Play } from 'lucide-react'
import { useRef } from 'react'
import { usePreview } from '@/components/shell/preview-provider'
import { useCampaignModal } from '@/components/campaign/campaign-modal'
import { useDesign } from '@/components/shell/design-provider'
import { useMotionPrefs } from '@/hooks/use-motion-prefs'
import { type Campaign, usd } from '@/lib/campaigns'
import { cn } from '@/lib/utils'

const SPRING = { stiffness: 170, damping: 20, mass: 0.6 }

/**
 * A campaign cover. The cover leans a few degrees towards the pointer and a band of light sweeps across it on hover.
 * Only the name and the play button sit on the cover. The cover is cropped in a touch so the thin white edge some album
 * art has baked in never shows. Zoom, border, budget bar and the rate line can be switched back on from the dev dashboard.
 */
export function CampaignTile({ campaign, priority }: { campaign: Campaign; priority?: boolean }) {
  const { open } = useCampaignModal()
  const { playingId, toggle } = usePreview()
  const playing = playingId === campaign.id
  const { rich, canHover } = useMotionPrefs()
  const { coverZoom, coverBorder, coverBar, coverInfo } = useDesign()
  const tilt = rich && canHover
  const left = Math.max(0, Math.min(100, campaign.budgetLeftPct ?? 100))
  const root = useRef<HTMLDivElement>(null)
  const seen = useInView(root, { once: true, margin: '0px 0px -10% 0px' })

  const px = useMotionValue(0.5)
  const py = useMotionValue(0.5)
  const sx = useSpring(px, SPRING)
  const sy = useSpring(py, SPRING)
  const rotateY = useTransform(sx, [0, 1], [-7, 7])
  const rotateX = useTransform(sy, [0, 1], [7, -7])
  const glareX = useTransform(sx, (v) => v * 100)
  const glareY = useTransform(sy, (v) => v * 100)
  const glare = useMotionTemplate`radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.2), transparent 55%)`

  const reset = () => {
    px.set(0.5)
    py.set(0.5)
  }

  return (
    <motion.div
      ref={root}
      onPointerMove={(e) => {
        if (!tilt) return
        const r = e.currentTarget.getBoundingClientRect()
        px.set((e.clientX - r.left) / r.width)
        py.set((e.clientY - r.top) / r.height)
      }}
      onPointerLeave={reset}
      data-vt-cover={campaign.id}
      style={tilt ? { rotateX, rotateY, transformPerspective: 800 } : undefined}
      className="group/tile relative aspect-square w-full rounded-[22px] bg-surface shadow-[0_10px_24px_-14px_rgb(0_0_0/0.85)] transition-[box-shadow,translate] duration-500 ease-[cubic-bezier(.22,1,.36,1)] hover:-translate-y-1 hover:shadow-[0_30px_46px_-20px_rgb(0_0_0/0.95)] active:translate-y-0"
    >
      <button
        type="button"
        onClick={() => {
          reset()
          open(campaign)
        }}
        aria-label={`${campaign.title} by ${campaign.creator}. ${usd(campaign.ratePer1k, 2)} per 1,000 views. Open campaign.`}
        className="absolute inset-0 block overflow-hidden rounded-[22px] text-left outline-none focus-visible:ring-2 focus-visible:ring-paper"
      >
        {/* a fixed crop just past the edge hides any white border the artwork was exported with */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={campaign.cover}
          alt=""
          loading={priority ? 'eager' : 'lazy'}
          className={cn('absolute inset-0 h-full w-full scale-[1.07] object-cover', coverZoom && 'transition-transform duration-[900ms] ease-[cubic-bezier(.22,1,.36,1)] group-hover/tile:scale-[1.16] group-focus-within/tile:scale-[1.16]')}
        />
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* light: a glare that follows the pointer, and one soft band that sweeps across when the cover is entered */}
        {tilt && <motion.span aria-hidden="true" style={{ backgroundImage: glare }} className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover/tile:opacity-100" />}
        <span aria-hidden="true" className="tile-sweep pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 -skew-x-[18deg] bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-0" />

        <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 pr-16 pb-5 md:p-5 md:pr-18 md:pb-6">
          <span className="min-w-0">
            <span className="block truncate font-display text-[1.4rem] leading-none tracking-[-0.03em] text-white md:text-[1.65rem]">{campaign.title}</span>
            {coverInfo && <span className="mt-1.5 block truncate text-[12px] text-white/70 md:text-[13px]">{campaign.creator} · {usd(campaign.ratePer1k, 2)} per 1k</span>}
          </span>
          {coverInfo && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/15 py-1 pr-2 pl-3 text-[12px] text-white backdrop-blur-sm">
              Open <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </span>
          )}
        </span>
        {coverBorder && <span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-[22px] ring-1 ring-inset ring-white/10" />}
        {coverBar && (
          <span role="img" aria-label={`${left}% of the budget left`} title={`${left}% of the budget left`} className="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-white/15">
            <span style={{ width: seen ? `${left}%` : '0%' }} className="block h-full rounded-r-full bg-white/90 transition-[width] duration-[1200ms] ease-[cubic-bezier(.22,1,.36,1)] [transition-delay:300ms]" />
          </span>
        )}
      </button>

      <button
        type="button"
        data-tour-play
        aria-label={playing ? `Pause preview of ${campaign.title}` : `Play preview of ${campaign.title}`}
        aria-pressed={playing}
        onClick={(e) => {
          e.stopPropagation()
          toggle(campaign.id, campaign.previewUrl)
        }}
        className={cn(
          'absolute right-3.5 bottom-3.5 z-10 grid size-11 place-items-center rounded-full border backdrop-blur-sm transition-all duration-200 hover:scale-110 active:scale-95 md:right-4 md:bottom-4',
          playing ? 'border-paper bg-paper text-ink' : 'border-white/25 bg-ink/55 text-paper hover:bg-ink/80',
        )}
      >
        {playing ? <Pause className="size-4 fill-current" /> : <Play className="size-4 translate-x-px fill-current" />}
        {playing && <span aria-hidden="true" className="absolute inset-0 animate-ping rounded-full border border-paper/60" />}
      </button>
    </motion.div>
  )
}
