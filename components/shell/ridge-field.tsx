'use client'

import { useEffect, useRef } from 'react'
import { useMotionPrefs } from '@/hooks/use-motion-prefs'

const ROWS = 68
export const DOT_EVENT = 'logoless:dots'

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/**
 * Full-page background: rows of crisp dots that roll like a landscape, peak in the middle and fade into the dark.
 * Drawn at the screen's real resolution, so every dot has a clean edge. Near rows are bigger and brighter, peaks swell,
 * and the whole surface leans slightly towards the cursor, which also pushes ripples into it.
 * The canvas is transparent, so the moving gradient behind it shows through.
 */
export function RidgeField() {
  const ref = useRef<HTMLCanvasElement>(null)
  const { reduced } = useMotionPrefs()

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    // one dot, drawn once and stamped thousands of times: a solid core with a thin soft edge. Profiles can change its colour.
    const SP = 64
    const sprite = document.createElement('canvas')
    sprite.width = sprite.height = SP
    const buildSprite = (hex: string) => {
      const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex)
      const [r, g, b] = m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [255, 255, 255]
      const sg = sprite.getContext('2d')!
      sg.clearRect(0, 0, SP, SP)
      const grad = sg.createRadialGradient(SP / 2, SP / 2, 0, SP / 2, SP / 2, SP / 2)
      grad.addColorStop(0, `rgba(${r},${g},${b},1)`)
      grad.addColorStop(0.62, `rgba(${r},${g},${b},1)`)
      grad.addColorStop(0.86, `rgba(${r},${g},${b},0.45)`)
      grad.addColorStop(1, `rgba(${r},${g},${b},0)`)
      sg.fillStyle = grad
      sg.fillRect(0, 0, SP, SP)
    }
    buildSprite(document.documentElement.dataset.dotColor ?? '#ffffff')
    const onDots = (e: Event) => buildSprite(String((e as CustomEvent).detail ?? '#ffffff'))
    window.addEventListener(DOT_EVENT, onDots)

    let w = 0
    let h = 0
    let cols = 150
    let colU: number[] = []
    let colEnv: number[] = []
    let raf = 0
    let mx = -9999
    let my = -9999
    let sx = -9999
    let sy = -9999
    let lean = 0 // how far the surface leans towards the pointer, eased
    let energy = 0
    let lastX = 0
    let lastY = 0
    let boost = 0 // click shock

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      cols = w < 700 ? 82 : 168
      colU = Array.from({ length: cols + 1 }, (_, j) => j / cols)
      colEnv = colU.map((u) => Math.exp(-Math.pow((u - 0.5) * 3.1, 2)))
    }

    const draw = (now: number) => {
      const t = now / 1000
      if (sx < -9000) {
        sx = mx
        sy = my
      } else {
        sx += (mx - sx) * 0.1
        sy += (my - sy) * 0.1
      }
      const target = mx < -9000 ? 0 : (mx / w - 0.5) * 2
      lean += (target - lean) * 0.05
      energy *= 0.96
      boost *= 0.95
      // the landscape belongs to the top of a page: it recedes as you read so text always sits on a calm background
      const fade = Math.max(0.14, 1 - window.scrollY / (h * 0.85))

      ctx.clearRect(0, 0, w, h)

      const horizon = h * 0.44 - Math.min(window.scrollY, h) * 0.12 // drifts slower than the page
      const bottom = h * 1.05
      const base = Math.min(h * 0.12, 130)

      for (let i = 0; i < ROWS; i++) {
        const p = i / (ROWS - 1)
        const y0 = horizon + (bottom - horizon) * Math.pow(p, 1.6)
        const scale = 0.28 + 0.72 * p
        const halfW = w * (0.3 + 0.62 * p)
        const z = i * 0.27 - t * 0.34
        const size = 1.1 + 3.2 * Math.pow(p, 1.15) // far rows are fine points, near rows are bigger
        const rowAlpha = (0.16 + 0.7 * Math.pow(p, 1.1)) * fade
        const sway = lean * 26 * (0.3 + p) // near rows lean further than far ones

        ctx.globalAlpha = rowAlpha
        for (let j = 0; j <= cols; j++) {
          const u = colU[j]
          const x = w / 2 + (u - 0.5) * 2 * halfW + sway
          const env = colEnv[j]
          const n =
            Math.sin(u * 8 + z * 1.05 + Math.sin(z * 0.45) * 1.5) * 0.6 +
            Math.sin(u * 16 - z * 0.72 + 1.7) * 0.28 +
            Math.sin(u * 29 + z * 1.25) * 0.1
          const peak = Math.max(0, n + 0.18)
          // a low swell runs the full width so the edges are never flat, and the middle rises into a ridge
          const swell = 0.13 * (0.5 + 0.5 * Math.sin(u * 5 + z * 0.9))
          const lift = scale * base * (env * peak * peak * 2.15 + swell)
          let hgt = lift

          // cursor ripple: a travelling wave centred on the pointer
          const dx = x - sx
          const dy = y0 - sy
          const d2 = dx * dx + dy * dy
          let glow = 0
          if (d2 < 460 * 460) {
            const d = Math.sqrt(d2)
            const fall = Math.exp(-d2 / (2 * 160 * 160))
            hgt += scale * (fall * (20 + energy * 3.4) * (0.6 + 0.4 * Math.sin(d * 0.04 - t * 3.2)))
            glow = fall
          }
          if (boost > 0.01) hgt += scale * boost * 28 * env * Math.sin(u * 30 - t * 8)

          // peaks swell a little and the edges thin out
          const rise = Math.min(1, lift / (scale * base * 1.7 + 0.001))
          const edge = 0.45 + 0.55 * smooth(0, 0.35, env + 0.08)
          const s2 = size * (0.78 + 0.5 * rise) * (0.85 + 0.15 * edge) * (1 + glow * 0.4)
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
