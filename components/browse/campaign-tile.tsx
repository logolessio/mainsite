'use client'

import { motion, useInView, useMotionTemplate, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { ArrowUpRight, Pause, Play } from 'lucide-react'
import { useRef } from 'react'
import { usePreview } from '@/components/shell/preview-provider'
import { useCampaignModal } from '@/components/campaign/campaign-modal'
import { useDesign } from '@/components/shell/design-provider'
import { useMotionPrefs } from '@/hooks/use-motion-prefs'
import { type Campaign, usd } from '@/lib/campaigns'
import { EASE_OUT } from '@/lib/layout'
import { cn } from '@/lib/utils'

const SPRING = { stiffness: 220, damping: 22, mass: 0.5 }

export function CampaignTile({ campaign, priority }: { campaign: Campaign; priority?: boolean }) {
  const { open } = useCampaignModal()
  const { playingId, toggle } = usePreview()
  const playing = playingId === campaign.id
  const { rich, canHover } = useMotionPrefs()
  const { coverEffects, coverBorder } = useDesign()
  const tilt = coverEffects && rich && canHover
  const left = Math.max(0, Math.min(100, campaign.budgetLeftPct ?? 100))
  const root = useRef<HTMLDivElement>(null)
  const seen = useInView(root, { once: true, margin: '0px 0px -10% 0px' }) // the budget bar fills when the cover comes into view

  const px = useMotionValue(0.5)
  const py = useMotionValue(0.5)
  const sx = useSpring(px, SPRING)
  const sy = useSpring(py, SPRING)
  const rotateY = useTransform(sx, [0, 1], [-12, 12])
  const rotateX = useTransform(sy, [0, 1], [12, -12])
  // the cover slides the other way inside the frame, which makes it read as a real object with depth
  const imgX = useTransform(sx, [0, 1], [9, -9])
  const imgY = useTransform(sy, [0, 1], [9, -9])
  const sheenPos = useTransform([sx, sy], ([x, y]: number[]) => ((x + y) / 2) * 100)
  const sheenStart = useTransform(sheenPos, (v) => v - 22)
  const sheenEnd = useTransform(sheenPos, (v) => v + 22)
  const sheen = useMotionTemplate`linear-gradient(115deg, transparent ${sheenStart}%, rgba(243,242,238,0.18) ${sheenPos}%, transparent ${sheenEnd}%)`

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
      initial="rest"
      animate={canHover ? 'rest' : 'hover'}
      whileHover="hover"
      style={tilt ? { rotateX, rotateY, transformPerspective: 700 } : undefined}
      className={cn('group/tile relative aspect-square w-full overflow-hidden rounded-[22px] bg-surface transition-transform duration-500 ease-[cubic-bezier(.22,1,.36,1)] hover:-translate-y-1 active:translate-y-0 active:scale-[0.985]', coverEffects && 'shadow-[0_14px_26px_-14px_rgb(0_0_0/0.9)] transition-shadow duration-300 hover:shadow-[0_34px_50px_-18px_rgb(0_0_0/0.95)]')}
    >
      <button
        type="button"
        onClick={() => {
          reset()
          open(campaign)
        }}
        aria-label={`${campaign.title} by ${campaign.creator}. ${usd(campaign.ratePer1k, 2)} per 1,000 views. Open campaign.`}
        className="absolute inset-0 block rounded-[22px] text-left outline-none focus-visible:ring-2 focus-visible:ring-paper"
      >
        {coverEffects ? (
          <motion.img
            src={campaign.cover}
            alt=""
            loading={priority ? 'eager' : 'lazy'}
            variants={{ rest: { scale: 1.12 }, hover: { scale: 1.18 } }}
            style={tilt ? { x: imgX, y: imgY } : undefined}
            transition={{ duration: 0.6, ease: EASE_OUT }}
            className="absolute inset-0 h-full w-full object-cover contrast-[1.05] saturate-[1.08]"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={campaign.cover} alt="" loading={priority ? 'eager' : 'lazy'} className="absolute inset-0 h-full w-full scale-100 object-cover transition-transform duration-[900ms] ease-[cubic-bezier(.22,1,.36,1)] will-change-transform group-hover/tile:scale-[1.08] group-focus-within/tile:scale-[1.08]" />
        )}

        {/* a fade at the bottom deepens on hover; the name rises to make room for the rate and a cue to open */}
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-black/85 via-black/25 to-transparent opacity-80 transition-opacity duration-500 group-hover/tile:opacity-100 group-focus-within/tile:opacity-100" />
        <span className="pointer-events-none absolute inset-x-0 bottom-0 p-4 pb-5 md:p-5 md:pb-6">
          <span className="block transition-transform duration-500 ease-[cubic-bezier(.22,1,.36,1)] group-hover/tile:-translate-y-6 group-focus-within/tile:-translate-y-6">
            <span className="block truncate font-display text-[1.4rem] leading-none tracking-[-0.03em] text-white md:text-[1.65rem]">{campaign.title}</span>
            <span className="mt-1.5 block truncate text-[12px] text-white/70 md:text-[13px]">{campaign.creator}</span>
          </span>
          <span className="absolute inset-x-4 bottom-5 flex translate-y-2 items-center justify-between text-[12px] text-white opacity-0 transition-[opacity,transform] duration-500 ease-[cubic-bezier(.22,1,.36,1)] [transition-delay:50ms] group-hover/tile:translate-y-0 group-hover/tile:opacity-100 group-focus-within/tile:translate-y-0 group-focus-within/tile:opacity-100 md:inset-x-5 md:bottom-6 md:text-[13px]">
            <span className="whitespace-nowrap">{usd(campaign.ratePer1k, 2)} per 1k</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/15 py-1 pr-2 pl-3 backdrop-blur-sm">
              Open <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </span>
          </span>
        </span>
        {coverBorder && <span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-[22px] ring-1 ring-inset ring-white/10" />}

        {/* how much of the budget is still there */}
        <span role="img" aria-label={`${left}% of the budget left`} title={`${left}% of the budget left`} className="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-white/15 transition-[height] duration-300 group-hover/tile:h-1.5">
          <span style={{ width: seen ? `${left}%` : '0%' }} className="block h-full rounded-r-full bg-white/90 transition-[width] duration-[1200ms] ease-[cubic-bezier(.22,1,.36,1)] [transition-delay:300ms]" />
        </span>

        {tilt && (
          <motion.span
            aria-hidden="true"
            style={{ backgroundImage: sheen }}
            variants={{ rest: { opacity: 0 }, hover: { opacity: 1 } }}
            className="pointer-events-none absolute inset-0"
          />
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
          'absolute top-3 right-3 z-10 grid size-10 place-items-center rounded-full border transition-all duration-200 hover:scale-110 active:scale-95',
          playing ? 'border-paper bg-paper text-ink' : 'border-white/20 bg-ink/70 text-paper hover:bg-ink/90',
        )}
      >
        {playing ? <Pause className="size-4 fill-current" /> : <Play className="size-4 translate-x-px fill-current" />}
        {playing && <span aria-hidden="true" className="absolute inset-0 animate-ping rounded-full border border-paper/60" />}
      </button>
    </motion.div>
  )
}
