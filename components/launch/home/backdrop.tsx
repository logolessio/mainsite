'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { CardEffectLayer } from '@/components/profile/card-effect'
import { useMotionPrefs } from '@/hooks/use-motion-prefs'
import type { PageLook } from '@/lib/launch-page'
import { BANNER_PRESETS } from '@/lib/profile-style'
import { cn } from '@/lib/utils'
import s from './launch-home.module.css'

// A fixed, repeatable scatter (no Math.random during render, so the server and the browser draw the same frames).
const seeded = (n: number) => {
  const x = Math.sin(n * 91.17 + 7.31) * 43758.5453
  return x - Math.floor(x)
}

type Frame = { x: number; w: number; o: number; r: number; t: number; p: number; s: number; views: number }

function frames(count: number, wide: boolean): Frame[] {
  return Array.from({ length: count }, (_, i) => {
    const depth = i % 3 // 0 far, 1 middle, 2 near
    const lane = (i + 0.5) / count
    return {
      x: Math.round((lane * 100 + (seeded(i) - 0.5) * (wide ? 9 : 14)) * 10) / 10 - (wide ? 6 : 12),
      w: Math.round((wide ? [96, 140, 196] : [64, 88, 116])[depth] * (0.88 + seeded(i + 40) * 0.24)),
      o: [0.3, 0.5, 0.72][depth],
      r: Math.round((seeded(i + 9) - 0.5) * 14),
      t: Math.round([70, 52, 38][depth] * (0.85 + seeded(i + 3) * 0.3)),
      p: seeded(i + 21),
      s: Math.round(5 + seeded(i + 33) * 9),
      views: Math.round(800 + seeded(i + 60) ** 2 * 480_000),
    }
  })
}

const short = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(n >= 100_000 ? 0 : 1)}K` : String(n))

/** Clips floating up past the page, each one counting its views. The numbers only tick on a computer, and never with reduced motion. */
function Reels({ wide, reduced }: { wide: boolean; reduced: boolean }) {
  const list = useMemo(() => frames(wide ? 12 : 7, wide), [wide])
  const labels = useRef<(HTMLSpanElement | null)[]>([])
  useEffect(() => {
    if (reduced || !wide) return
    const views = list.map((f) => f.views)
    const id = window.setInterval(() => {
      for (let i = 0; i < views.length; i++) {
        if (Math.random() < 0.55) continue
        views[i] += Math.round(views[i] * (0.002 + Math.random() * 0.01)) + 1
        const el = labels.current[i]
        if (el) el.textContent = short(views[i])
      }
    }, 1400)
    return () => window.clearInterval(id)
  }, [list, reduced, wide])

  return (
    <>
      {list.map((f, i) => (
        <div
          key={i}
          className={s.frame}
          style={
            {
              '--x': `${f.x}%`,
              '--w': `${f.w}px`,
              '--o': f.o,
              '--r': `${f.r}deg`,
              '--t': `${f.t}s`,
              '--s': `${f.s}s`,
              '--delay': `${-f.p * f.t}s`,
              '--still': `calc(${(-0.15 - f.p * 0.85).toFixed(3)} * (100dvh + 130%))`,
            } as React.CSSProperties
          }
        >
          <span className={s.frameTop}>
            <span ref={(el) => void (labels.current[i] = el)}>{short(f.views)}</span>
          </span>
          <span className={s.framePlay} />
          <span className={s.frameLines} />
          <span className={s.scrub} />
        </div>
      ))}
    </>
  )
}

/** The page's background: one of its own (reels, glow, black) or a profile banner, then the chosen effect. */
export function Backdrop({ look }: { look: PageLook }) {
  const { reduced, wide } = useMotionPrefs()
  const preset = BANNER_PRESETS.find((b) => b.id === look.bg)

  return (
    <>
      <div className={s.backdrop} aria-hidden="true">
        {preset && <div className={s.preset} style={{ background: preset.css }} />}
        {look.bg === 'reels' && (
          <>
            <div className={s.halo} />
            <Reels wide={wide} reduced={reduced} />
            <div className={s.veil} />
          </>
        )}
        {look.bg === 'glow' && (
          <>
            <div className={s.glowA} />
            <div className={s.glowB} />
            <div className={s.halo} />
          </>
        )}
        {look.bg === 'void' && <div className={s.halo} style={{ opacity: 0.5 }} />}
      </div>
      {look.effect !== 'none' && (
        <div className={s.effect} aria-hidden="true">
          {/* phones get a lighter version of the effect */}
          <CardEffectLayer effect={look.effect} intensity={wide ? look.intensity : Math.round(look.intensity * 0.55)} speed={50} colors={[look.accent, '#ffffff']} />
        </div>
      )}
    </>
  )
}
