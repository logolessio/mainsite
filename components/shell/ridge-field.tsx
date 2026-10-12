'use client'

import { useEffect, useRef } from 'react'
import { useMotionPrefs } from '@/hooks/use-motion-prefs'

const ROWS = 54
export const DOT_EVENT = 'logoless:dots'

/**
 * Full-page background: rows of soft-edged dots that roll like a landscape and peak in the middle.
 * Every dot is a pre-rendered sprite drawn flat (no additive blending, so nothing glows), which keeps it cheap.
 * The cursor pushes ripples into the surface.
 */
export function RidgeField() {
  const ref = useRef<HTMLCanvasElement>(null)
  const { reduced } = useMotionPrefs()

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d', { alpha: false })
    if (!canvas || !ctx) return

    // one soft dot, drawn once and stamped thousands of times. Profiles can change its colour.
    const sprite = document.createElement('canvas')
    sprite.width = sprite.height = 96
    const buildSprite = (hex: string) => {
      const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex)
      const [r, g, b] = m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [255, 255, 255]
      const sg = sprite.getContext('2d')!
      sg.clearRect(0, 0, 96, 96)
      const grad = sg.createRadialGradient(48, 48, 0, 48, 48, 48)
      grad.addColorStop(0, `rgba(${r},${g},${b},0.95)`)
      grad.addColorStop(0.5, `rgba(${r},${g},${b},0.85)`)
      grad.addColorStop(0.78, `rgba(${r},${g},${b},0.35)`)
      grad.addColorStop(1, `rgba(${r},${g},${b},0)`)
      sg.fillStyle = grad
      sg.fillRect(0, 0, 96, 96)
    }
    buildSprite(document.documentElement.dataset.dotColor ?? '#ffffff')
    const onDots = (e: Event) => buildSprite(String((e as CustomEvent).detail ?? '#ffffff'))
    window.addEventListener(DOT_EVENT, onDots)

    let w = 0
    let h = 0
    let cols = 100
    let colU: number[] = []
    let colEnv: number[] = []
    let raf = 0
    let mx = -9999
    let my = -9999
    let sx = -9999
    let sy = -9999
    let energy = 0
    let lastX = 0
    let lastY = 0
    let boost = 0 // click shock

    const resize = () => {
      const dpr = 1 // the dots are tiny and soft, so full retina resolution only costs speed
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      cols = w < 700 ? 70 : 130
    }

    const draw = (now: number) => {
      const t = now / 1000
      // ease the pointer, and let its speed drive how strongly it disturbs the surface
      if (sx < -9000) {
        sx = mx
        sy = my
      } else {
        sx += (mx - sx) * 0.1
        sy += (my - sy) * 0.1
      }
      energy *= 0.96
      boost *= 0.95
      // the landscape belongs to the top of a page: it recedes as you read so text always sits on a calm background
      const fade = Math.max(0.16, 1 - window.scrollY / (h * 0.85))

      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, w, h)

      const horizon = h * 0.46 - Math.min(window.scrollY, h) * 0.12 // the landscape drifts slower than the page
      const bottom = h * 1.04
      const base = Math.min(h * 0.1, 115)
      // per-column values are the same for every row, so compute them once
      if (colU.length !== cols + 1) {
        colU = Array.from({ length: cols + 1 }, (_, j) => j / cols)
        colEnv = colU.map((u) => Math.exp(-Math.pow((u - 0.5) * 3.4, 2)))
      }

      for (let i = 0; i < ROWS; i++) {
        const p = i / (ROWS - 1)
        const y0 = horizon + (bottom - horizon) * Math.pow(p, 1.65)
        const scale = 0.3 + 0.7 * p
        const halfW = w * (0.3 + 0.55 * p)
        const z = i * 0.3 - t * 0.38
        const size = 1.4 + 3.1 * Math.pow(p, 1.25) // far rows are tiny points, near rows larger soft dots
        const rowAlpha = 0.14 + 0.62 * Math.pow(p, 1.2)

        for (let j = 0; j <= cols; j++) {
          const u = colU[j]
          const x = w / 2 + (u - 0.5) * 2 * halfW
          const env = colEnv[j]
          const n =
            Math.sin(u * 9 + z * 1.1 + Math.sin(z * 0.5) * 1.4) * 0.62 +
            Math.sin(u * 17 - z * 0.7 + 1.7) * 0.28 +
            Math.sin(u * 27 + z * 1.3) * 0.1
          const peak = Math.max(0, n + 0.15)
          const lift = env * scale * base * peak * peak * 2.1
          let hgt = lift

          // cursor ripple: a travelling wave centred on the pointer
          const dx = x - sx
          const dy = y0 - sy
          const d2 = dx * dx + dy * dy
          let glow = 0
          if (d2 < 420 * 420) {
            const d = Math.sqrt(d2)
            const fall = Math.exp(-d2 / (2 * 150 * 150))
            hgt += scale * (fall * (18 + energy * 3.2) * (0.6 + 0.4 * Math.sin(d * 0.04 - t * 3.2)))
            glow = fall
          }
          if (boost > 0.01) hgt += scale * boost * 26 * env * Math.sin(u * 30 - t * 8)

          // flat, even tone: only the position moves, nothing brightens
          ctx.globalAlpha = rowAlpha * fade
          const s2 = size * (1 + glow * 0.3)
          ctx.drawImage(sprite, x - s2 / 2, y0 - hgt - s2 / 2, s2, s2)
        }
      }
      ctx.globalAlpha = 1
    }

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      if (document.hidden || document.documentElement.dataset.tour) return
      draw(now)
    }

    const onMove = (e: PointerEvent) => {
      energy = Math.min(40, energy + Math.hypot(e.clientX - lastX, e.clientY - lastY) * 0.12)
      lastX = e.clientX
      lastY = e.clientY
      mx = e.clientX
      my = e.clientY
    }
    const onLeave = () => {
      mx = my = -9999
    }
    const onDown = () => {
      boost = 1
    }

    resize()
    window.addEventListener('resize', resize)
    if (reduced) draw(0)
    else {
      window.addEventListener('pointermove', onMove, { passive: true })
      window.addEventListener('pointerdown', onDown, { passive: true })
      document.addEventListener('pointerleave', onLeave)
      raf = requestAnimationFrame(loop)
    }
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener(DOT_EVENT, onDots)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onDown)
      document.removeEventListener('pointerleave', onLeave)
    }
  }, [reduced])

  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 h-full w-full" />
}
