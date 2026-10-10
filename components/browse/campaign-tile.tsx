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
  const rotateY = useTransform(sx, [0, 1], [-7, 7])
  const rotateX = useTransform(sy, [0, 1], [7, -7])
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
      initial="rest"
      animate={canHover ? 'rest' : 'hover'}
      whileHover="hover"
      style={tilt ? { rotateX, rotateY, transformPerspective: 900 } : undefined}
      className="relative aspect-square w-full overflow-hidden rounded-[8px] bg-surface"
    >
      <button
        type="button"
        onClick={() => {
          reset()
          expand(campaign)
        }}
        aria-label={`${campaign.title} by ${campaign.creator}. ${usd(campaign.ratePer1k, 2)} per 1,000 views. Open campaign.`}
        className="absolute inset-0 block rounded-[8px] text-left outline-none focus-visible:ring-2 focus-visible:ring-paper"
      >
        <motion.img
          src={campaign.cover}
          alt=""
          loading={priority ? 'eager' : 'lazy'}
          variants={{ rest: { scale: 1 }, hover: { scale: 1.05 } }}
          transition={{ duration: 0.6, ease: EASE_OUT }}
          className="absolute inset-0 h-full w-full object-cover"
        />

        {tilt && (
          <motion.span
            aria-hidden="true"
            style={{ backgroundImage: sheen }}
            variants={{ rest: { opacity: 0 }, hover: { opacity: 1 } }}
            className="pointer-events-none absolute inset-0"
          />
        )}

        <motion.span
          variants={{ rest: { y: '101%' }, hover: { y: '0%' } }}
          transition={{ duration: 0.4, ease: EASE_OUT }}
          className="absolute inset-x-0 bottom-0 block bg-ink/80 px-4 py-3"
        >
          <span className="block truncate font-display text-lg leading-tight md:text-xl">{campaign.title}</span>
          <span className="mt-0.5 block truncate text-xs text-mute">
            {campaign.creator} · {campaign.type}
          </span>
        </motion.span>
      </button>

      <span
        data-rate
        className="pointer-events-none absolute top-3 left-3 rounded-full bg-ink/70 px-2.5 py-1 font-mono text-[11px] text-paper"
      >
        {usd(campaign.ratePer1k, 2)}/1K
      </span>

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
