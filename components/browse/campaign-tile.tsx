'use client'

import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { Pause, Play } from 'lucide-react'
import { usePreview } from '@/components/shell/preview-provider'
import { useTransitions } from '@/components/shell/transition-provider'
import { useMotionPrefs } from '@/hooks/use-motion-prefs'
import { type Campaign, usd } from '@/lib/campaigns'
import { EASE_OUT } from '@/lib/layout'
import { cn } from '@/lib/utils'

const SPRING = { stiffness: 220, damping: 22, mass: 0.5 }

export function CampaignTile({ campaign, priority }: { campaign: Campaign; priority?: boolean }) {
  const { expand } = useTransitions()
  const { playingId, toggle } = usePreview()
  const playing = playingId === campaign.id
  const { rich, canHover } = useMotionPrefs()
  const tilt = rich && canHover

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
      className="relative aspect-square w-full overflow-hidden rounded-[22px] bg-surface shadow-[0_14px_26px_-14px_rgb(0_0_0/0.9)] transition-shadow duration-300 hover:shadow-[0_34px_50px_-18px_rgb(0_0_0/0.95)]"
    >
      <button
        type="button"
        onClick={() => {
          reset()
          expand(campaign)
        }}
        aria-label={`${campaign.title} by ${campaign.creator}. ${usd(campaign.ratePer1k, 2)} per 1,000 views. Open campaign.`}
        className="absolute inset-0 block rounded-[22px] text-left outline-none focus-visible:ring-2 focus-visible:ring-paper"
      >
        <motion.img
          src={campaign.cover}
          alt=""
          loading={priority ? 'eager' : 'lazy'}
          variants={{ rest: { scale: 1.12 }, hover: { scale: 1.18 } }}
          style={tilt ? { x: imgX, y: imgY } : undefined}
          transition={{ duration: 0.6, ease: EASE_OUT }}
          className="absolute inset-0 h-full w-full object-cover contrast-[1.05] saturate-[1.08]"
        />

        {/* a soft fade at the bottom and the name sitting on it: that is all the text there is */}
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-[58%] bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
        <span className="pointer-events-none absolute inset-x-0 bottom-0 p-4 md:p-5">
          <span className="block truncate font-display text-[1.4rem] leading-none tracking-[-0.03em] text-white md:text-[1.65rem]">{campaign.title}</span>
          <span className="mt-1.5 block truncate text-[12px] text-white/70 md:text-[13px]">{campaign.creator}</span>
        </span>
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-[22px] ring-1 ring-inset ring-white/10" />

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
