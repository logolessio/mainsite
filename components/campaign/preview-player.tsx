'use client'

import { Pause, Play } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { usePreview } from '@/components/shell/preview-provider'
import type { Campaign } from '@/lib/campaigns'

const BARS = 64
// deterministic pseudo-waveform so the bar looks the same on server and client
const heights = Array.from({ length: BARS }, (_, i) => Math.round(28 + Math.abs(Math.sin(i * 1.7) * 48 + Math.sin(i * 0.6) * 24)))

/** Play / pause plus a scrubbable waveform for the campaign's preview. */
export function PreviewPlayer({ campaign }: { campaign: Campaign }) {
  const { playingId, toggle, progress, seek, duration } = usePreview()
  const playing = playingId === campaign.id
  const fill = useRef<HTMLDivElement>(null)
  const time = useRef<HTMLSpanElement>(null)
  const slider = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!playing) {
      if (fill.current) fill.current.style.clipPath = 'inset(0 100% 0 0)'
      if (time.current) time.current.textContent = '0:00'
      slider.current?.setAttribute('aria-valuenow', '0')
      slider.current?.setAttribute('aria-valuetext', 'Not playing')
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
      if (slider.current) {
        slider.current.setAttribute('aria-valuenow', String(Math.round(p * 100)))
        slider.current.setAttribute('aria-valuetext', `${Math.floor(p * duration())} of ${Math.floor(duration())} seconds`)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, progress, duration])

  return (
    <div data-tour="cc-preview" className="flex items-center gap-4 rounded-full border border-white/10 bg-white/[0.05] p-2.5 pr-5 backdrop-blur">
      <button
        type="button"
        onClick={() => toggle(campaign.id, campaign.previewUrl)}
        aria-label={playing ? `Pause preview of ${campaign.title}` : `Play preview of ${campaign.title}`}
        data-key="p"
        data-key-label="Play or pause the preview"
        aria-keyshortcuts="p"
        className="grid size-14 shrink-0 place-items-center rounded-full bg-paper text-ink transition-transform hover:scale-105 active:scale-95"
      >
        {playing ? <Pause className="size-5 fill-ink" /> : <Play className="size-5 translate-x-px fill-ink" />}
      </button>
      <div
        ref={slider}
        role="slider"
        tabIndex={0}
        aria-label="Preview position"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={0}
        aria-valuetext="Not playing"
        onKeyDown={(e) => {
          if (!playing) return
          const step = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 0.05 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -0.05 : e.key === 'PageUp' ? 0.2 : e.key === 'PageDown' ? -0.2 : 0
          if (step) {
            e.preventDefault()
            seek(Math.min(1, Math.max(0, progress() + step)))
          } else if (e.key === 'Home' || e.key === 'End') {
            e.preventDefault()
            seek(e.key === 'Home' ? 0 : 0.999)
          }
        }}
        onClick={(e) => {
          if (!playing) return
          const r = e.currentTarget.getBoundingClientRect()
          seek((e.clientX - r.left) / r.width)
        }}
        className="relative h-12 min-w-0 flex-1 cursor-pointer"
      >
        <div className="absolute inset-0 flex items-center gap-[2px]">
          {heights.map((h, i) => (
            <span key={i} style={{ height: `${h}%` }} className="w-full max-w-[4px] rounded-full bg-white/25" />
          ))}
        </div>
        <div ref={fill} className="absolute inset-0 flex items-center gap-[2px]" style={{ clipPath: 'inset(0 100% 0 0)' }}>
          {heights.map((h, i) => (
            <span key={i} style={{ height: `${h}%` }} className="w-full max-w-[4px] rounded-full bg-paper" />
          ))}
        </div>
      </div>
      <span ref={time} className="w-10 shrink-0 text-right font-mono text-xs text-mute">
        0:00
      </span>
    </div>
  )
}
