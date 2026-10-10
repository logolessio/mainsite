'use client'

import { Pause, Play } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { usePreview } from '@/components/shell/preview-provider'
import type { Campaign } from '@/lib/campaigns'

const BARS = 36
// deterministic pseudo-waveform so the bar looks the same on server and client
const heights = Array.from({ length: BARS }, (_, i) => Math.round(28 + Math.abs(Math.sin(i * 1.7) * 48 + Math.sin(i * 0.6) * 24)))

/** Play / pause plus a scrubbable waveform for the campaign's preview. */
export function PreviewPlayer({ campaign }: { campaign: Campaign }) {
  const { playingId, toggle, progress, seek, duration } = usePreview()
  const playing = playingId === campaign.id
  const fill = useRef<HTMLDivElement>(null)
  const time = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!playing) {
      if (fill.current) fill.current.style.clipPath = 'inset(0 100% 0 0)'
      if (time.current) time.current.textContent = '0:00'
      return
    }
    let raf = 0
    const tick = () => {
      const p = progress()
      if (fill.current) fill.current.style.clipPath = `inset(0 ${(100 - p * 100).toFixed(2)}% 0 0)`
      if (time.current) {
        const t = Math.floor(p * duration())
        time.current.textContent = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, progress, duration])

  return (
    <div data-tour="cc-preview" className="flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.05] p-1.5 pr-4">
      <button
        type="button"
        onClick={() => toggle(campaign.id, campaign.previewUrl)}
        aria-label={playing ? `Pause preview of ${campaign.title}` : `Play preview of ${campaign.title}`}
        className="grid size-10 shrink-0 place-items-center rounded-full bg-paper text-ink transition-transform hover:scale-105 active:scale-95"
      >
        {playing ? <Pause className="size-4 fill-ink" /> : <Play className="size-4 translate-x-px fill-ink" />}
      </button>
      <div
        role="slider"
        tabIndex={0}
        aria-label="Preview position"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={0}
        onClick={(e) => {
          if (!playing) return
          const r = e.currentTarget.getBoundingClientRect()
          seek((e.clientX - r.left) / r.width)
        }}
        className="relative h-8 min-w-0 flex-1 cursor-pointer"
      >
        <div className="absolute inset-0 flex items-center gap-[3px]">
          {heights.map((h, i) => (
            <span key={i} style={{ height: `${h}%` }} className="w-full max-w-[4px] rounded-full bg-white/25" />
          ))}
        </div>
        <div ref={fill} className="absolute inset-0 flex items-center gap-[3px]" style={{ clipPath: 'inset(0 100% 0 0)' }}>
          {heights.map((h, i) => (
            <span key={i} style={{ height: `${h}%` }} className="w-full max-w-[4px] rounded-full bg-paper" />
          ))}
        </div>
      </div>
      <span ref={time} className="w-9 shrink-0 text-right font-mono text-[11px] text-mute">
        0:00
      </span>
    </div>
  )
}
