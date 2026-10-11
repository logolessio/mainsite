'use client'

import { useEffect, useRef } from 'react'
import { useMotionPrefs } from '@/hooks/use-motion-prefs'

/** A small copy of the site's rolling dot landscape, in the chosen colour, so the colour can be judged before saving. */
export function MiniDots({ color, className }: { color: string; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const { reduced } = useMotionPrefs()
  const colour = useRef(color)
  colour.current = color

  useEffect(() => {
    const cv = ref.current
    const ctx = cv?.getContext('2d')
    if (!cv || !ctx) return
    let w = 0
    let h = 0
    let raf = 0
    const resize = () => {
      const r = cv.getBoundingClientRect()
      w = r.width
      h = r.height
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      cv.width = Math.round(w * dpr)
      cv.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    const draw = (now: number) => {
      const t = now / 1000
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, w, h)
      const [r, g, b] = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(colour.current)?.slice(1).map((x) => parseInt(x, 16)) ?? [255, 255, 255]
      const ROWS = 26
      const COLS = 72
      const base = Math.min(h * 0.12, 60)
      for (let i = 0; i < ROWS; i++) {
        const p = i / (ROWS - 1)
        const y0 = h * 0.34 + h * 0.74 * Math.pow(p, 1.6)
        const scale = 0.3 + 0.7 * p
        const halfW = w * (0.32 + 0.6 * p)
        const z = i * 0.3 - t * 0.38
        const size = 0.7 + 2 * Math.pow(p, 1.2)
        ctx.fillStyle = `rgba(${r},${g},${b},${0.16 + 0.64 * Math.pow(p, 1.2)})`
        for (let j = 0; j <= COLS; j++) {
          const u = j / COLS
          const env = Math.exp(-Math.pow((u - 0.5) * 3.4, 2))
          const n = Math.sin(u * 9 + z * 1.1) * 0.62 + Math.sin(u * 17 - z * 0.7 + 1.7) * 0.28 + Math.sin(u * 27 + z * 1.3) * 0.1
          const lift = env * scale * base * Math.pow(Math.max(0, n + 0.15), 2) * 2.1
          ctx.beginPath()
          ctx.arc(w / 2 + (u - 0.5) * 2 * halfW, y0 - lift, size, 0, 6.283)
          ctx.fill()
        }
      }
      // fade the edges like the real background
      const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.max(w, h) * 0.7)
      v.addColorStop(0, 'rgba(0,0,0,0)')
      v.addColorStop(1, 'rgba(0,0,0,0.92)')
      ctx.fillStyle = v
      ctx.fillRect(0, 0, w, h)
    }
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      if (!document.hidden) draw(now)
    }
    resize()
    draw(performance.now()) // paint at once, so there is a picture even before the first animation frame
    const ro = new ResizeObserver(() => {
      resize()
      draw(performance.now())
    })
    ro.observe(cv)
    if (reduced) draw(0)
    else raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [reduced])

  return <canvas ref={ref} aria-hidden="true" className={className ?? 'absolute inset-0 size-full'} />
}
