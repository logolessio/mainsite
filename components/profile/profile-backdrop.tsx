'use client'

import { useEffect, useRef } from 'react'
import { useMotionPrefs } from '@/hooks/use-motion-prefs'
import { bgVideoSrc, giphyImage, noiseLayer, tintHex, type ProfileExtras } from '@/lib/profile-extras'
import type { CardEffect } from '@/lib/profile-style'
import { cn } from '@/lib/utils'
import { BG_PAINTERS, hexRgb, type Painter } from './backdrop-effects'
import { CardEffectLayer } from './card-effect'

type Props = {
  bg: ProfileExtras['bg']
  overlay: ProfileExtras['overlay']
  /** The effect colour (the old "dot colour"). */
  color: string
  accents: [string, string]
  /** `page` covers the whole window behind everything; `box` fills its parent (the editor's preview). */
  scope?: 'page' | 'box'
  className?: string
}

/**
 * What is behind a profile card: one of the background effects, a solid colour (with optional grain), a picture, a
 * GIF or a short looping video, dimmed so the card stays readable, with an optional overlay effect on top.
 */
export function ProfileBackdrop({ bg, overlay, color, accents, scope = 'page', className }: Props) {
  const page = scope === 'page'
  const dim = (bg.dim / 100) * 0.85
  const media = bg.kind === 'image' || bg.kind === 'gif' || bg.kind === 'video'
  const show = bg.kind !== 'default' || overlay.effect !== 'none' || !page
  if (!show) return null
  return (
    <div aria-hidden="true" className={cn(page ? 'pointer-events-none fixed inset-0 z-0' : 'pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]', className)} style={{ background: bg.kind === 'default' ? (page ? undefined : 'radial-gradient(120% 80% at 50% 0%, #1a1a1f, #050506)') : bg.color }}>
      {bg.kind === 'effect' && <EffectCanvas effect={bg.effect} color={color} accents={accents} base={bg.color} intensity={bg.intensity} speed={bg.speed} page={page} />}
      {bg.kind === 'image' && bg.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/api/img/${bg.image}`} alt="" className="absolute inset-0 size-full object-cover" />
      )}
      {bg.kind === 'gif' && bg.gif && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={giphyImage(bg.gif)} alt="" referrerPolicy="no-referrer" className="absolute inset-0 size-full object-cover" />
      )}
      {bg.kind === 'video' && bg.video && <LoopVideo src={bgVideoSrc(bg.video)} />}
      {(bg.kind === 'color' || bg.kind === 'effect') && bg.noise > 0 && <div className="absolute inset-0" style={{ background: noiseLayer(bg.noise), mixBlendMode: 'overlay' }} />}
      {(media || bg.kind === 'effect') && dim > 0 && <div className="absolute inset-0 bg-black" style={{ opacity: dim }} />}
      {overlay.effect !== 'none' && (
        <CardEffectLayer
          effect={overlay.effect as CardEffect}
          intensity={overlay.intensity}
          speed={overlay.speed}
          colors={[tintHex(accents[0], overlay.tint, overlay.tintAmount), tintHex(accents[1], overlay.tint, overlay.tintAmount)]}
          tint={{ color: overlay.tint, amount: overlay.tintAmount }}
          scope={page ? 'page' : 'card'}
        />
      )}
    </div>
  )
}

function LoopVideo({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement>(null)
  const { reduced } = useMotionPrefs()
  useEffect(() => {
    const v = ref.current
    if (!v) return
    if (reduced) v.pause()
    else void v.play().catch(() => {})
    const onVis = () => (document.hidden || reduced ? v.pause() : void v.play().catch(() => {}))
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [reduced, src])
  return <video ref={ref} src={src} muted loop playsInline autoPlay={!reduced} preload="auto" disablePictureInPicture className="absolute inset-0 size-full object-cover" />
}

const WARM: Partial<Record<keyof typeof BG_PAINTERS, number>> = { warp: 40, bokeh: 20, matrix: 60, constellation: 5 }

function EffectCanvas({ effect, color, accents, base, intensity, speed, page }: { effect: keyof typeof BG_PAINTERS; color: string; accents: [string, string]; base: string; intensity: number; speed: number; page: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const { reduced } = useMotionPrefs()
  const live = useRef(speed)
  live.current = speed

  useEffect(() => {
    const cv = ref.current
    const ctx = cv?.getContext('2d')
    if (!cv || !ctx) return
    let w = 0
    let h = 0
    let paint = null as Painter | null
    let raf = 0
    let last = 0
    let t = 0
    let onScreen = true
    const build = () => {
      const r = cv.getBoundingClientRect()
      w = Math.max(1, r.width)
      h = Math.max(1, r.height)
      const dpr = Math.min(page ? 1.5 : 2, window.devicePixelRatio || 1)
      cv.width = Math.round(w * dpr)
      cv.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      paint = BG_PAINTERS[effect]({ w, h, c: hexRgb(color), p: hexRgb(accents[0]), q: hexRgb(accents[1]), base: hexRgb(base), k: intensity / 100 })
    }
    const draw = (dt: number) => {
      ctx.clearRect(0, 0, w, h)
      t += dt
      paint?.(ctx, t, dt)
    }
    const sp = () => 0.25 + (live.current / 100) * 1.75
    const frame = (now: number) => {
      raf = 0
      if (!onScreen || document.hidden) return
      // 30 frames a second is plenty for a background, and halves the work
      if (now - last >= 32) {
        const dt = Math.min(0.1, (now - last) / 1000)
        last = now
        draw(dt * sp())
      }
      raf = requestAnimationFrame(frame)
    }
    const start = () => {
      if (raf || reduced || !onScreen || document.hidden) return
      last = performance.now()
      raf = requestAnimationFrame(frame)
    }
    build()
    // let moving things spread out first (off screen, on a 1 by 1 canvas), then paint the first frame at once
    const scratch = document.createElement('canvas').getContext('2d')!
    for (let i = 0; i < (WARM[effect] ?? 0); i++) {
      t += 0.1
      paint?.(scratch, t, 0.1)
    }
    draw(0)
    const ro = new ResizeObserver(() => {
      build()
      draw(0)
    })
    ro.observe(cv)
    const io = new IntersectionObserver((e) => {
      onScreen = e[0]?.isIntersecting ?? true
      start()
    })
    io.observe(cv)
    const onVis = () => start()
    document.addEventListener('visibilitychange', onVis)
    start()
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [effect, color, accents[0], accents[1], base, intensity, page, reduced]) // eslint-disable-line react-hooks/exhaustive-deps

  return <canvas ref={ref} className="absolute inset-0 size-full" />
}
