'use client'

import { useEffect, useRef } from 'react'
import { useMotionPrefs } from '@/hooks/use-motion-prefs'

export const DOT_EVENT = 'logoless:dots'

const ROWS = 56
const WAVE_SPAN = 18.1 // how many wave lengths the landscape covers, from the far rows to the near ones
const TIERS = [1, 0.75, 0.55] // dot density, from full to the lightest the page falls back to on a slow device
const D_MIN = 0.7
const D_MAX = 8.4
const NB = 26 // dot sizes are rounded to one of these, each drawn once and stamped, so nothing is scaled while animating
const STEP = (D_MAX - D_MIN) / (NB - 1)

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/**
 * Full-page background: rows of crisp dots that roll like a landscape, peak in the middle and fade into the dark.
 * It is light on purpose: about a third of the dots it used to draw, 30 frames a second (the motion is slow), sines
 * worked out once per column instead of once per dot, pre-drawn dots in a few sizes, and a slower beat once you
 * scroll past the top or open a sheet. If the device still struggles it thins the dots out by itself.
 * The canvas is transparent, so the moving gradient behind it shows through.
 */
export function RidgeField() {
  const ref = useRef<HTMLCanvasElement>(null)
  const { reduced } = useMotionPrefs()

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    let dpr = 1
    let hex = document.documentElement.dataset.dotColor ?? '#ffffff'
    const sprites: HTMLCanvasElement[] = []
    const spriteCss: number[] = []
    const buildSprites = () => {
      const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex)
      const [r, g, b] = m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [255, 255, 255]
      for (let k = 0; k < NB; k++) {
        const px = Math.ceil((D_MIN + k * STEP) * dpr) + 2
        const c = sprites[k] ?? (sprites[k] = document.createElement('canvas'))
        c.width = c.height = px
        spriteCss[k] = px / dpr
        const sg = c.getContext('2d')!
        sg.clearRect(0, 0, px, px)
        const grad = sg.createRadialGradient(px / 2, px / 2, 0, px / 2, px / 2, px / 2)
        grad.addColorStop(0, `rgba(${r},${g},${b},1)`)
        grad.addColorStop(0.62, `rgba(${r},${g},${b},1)`)
        grad.addColorStop(0.86, `rgba(${r},${g},${b},0.45)`)
        grad.addColorStop(1, `rgba(${r},${g},${b},0)`)
        sg.fillStyle = grad
        sg.fillRect(0, 0, px, px)
      }
    }
    const onDots = (e: Event) => {
      hex = String((e as CustomEvent).detail ?? '#ffffff')
      buildSprites()
    }
    window.addEventListener(DOT_EVENT, onDots)

    let w = 0
    let h = 0
    let tier = 0
    let rows = ROWS
    let cols = 140
    // per column: sines and cosines of the wave terms, so each dot only needs multiplications
    let S8 = new Float32Array(0)
    let C8 = S8
    let S16 = S8
    let C16 = S8
    let S29 = S8
    let C29 = S8
    let S5 = S8
    let C5 = S8
    let colU = S8
    let colEnv = S8
    let colEdge = S8
    let raf = 0
    let mx = -9999
    let my = -9999
    let sx = -9999
    let sy = -9999
    let lean = 0
    let energy = 0
    let boost = 0

    const build = () => {
      rows = Math.max(18, Math.round(ROWS * TIERS[tier]))
      cols = Math.max(36, Math.round((w < 700 ? 76 : 140) * TIERS[tier]))
      const mk = () => new Float32Array(cols + 1)
      S8 = mk()
      C8 = mk()
      S16 = mk()
      C16 = mk()
      S29 = mk()
      C29 = mk()
      S5 = mk()
      C5 = mk()
      colU = mk()
      colEnv = mk()
      colEdge = mk()
      for (let j = 0; j <= cols; j++) {
        const u = j / cols
        colU[j] = u
        S8[j] = Math.sin(u * 8)
        C8[j] = Math.cos(u * 8)
        S16[j] = Math.sin(u * 16)
        C16[j] = Math.cos(u * 16)
        S29[j] = Math.sin(u * 29)
        C29[j] = Math.cos(u * 29)
        S5[j] = Math.sin(u * 5)
        C5[j] = Math.cos(u * 5)
        colEnv[j] = Math.exp(-Math.pow((u - 0.5) * 3.1, 2))
        colEdge[j] = 0.85 + 0.15 * (0.45 + 0.55 * smooth(0, 0.35, colEnv[j] + 0.08))
      }
    }

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      buildSprites()
      build()
    }

    const draw = (now: number) => {
      const t = now / 1000
      if (sx < -9000) {
        sx = mx
        sy = my
      } else {
        sx += (mx - sx) * 0.18
        sy += (my - sy) * 0.18
      }
      const target = mx < -9000 ? 0 : (mx / w - 0.5) * 2
      lean += (target - lean) * 0.09
      energy *= 0.93
      boost *= 0.91
      // the landscape belongs to the top of a page: it recedes as you read so text always sits on a calm background
      const fade = Math.max(0.14, 1 - window.scrollY / (h * 0.85))

      ctx.clearRect(0, 0, w, h)

      const horizon = h * 0.44 - Math.min(window.scrollY, h) * 0.12
      const bottom = h * 1.05
      const base = Math.min(h * 0.12, 130)
      const pointer = sx > -9000
      const maxR2 = 460 * 460

      for (let i = 0; i < rows; i++) {
        const p = i / (rows - 1)
        const y0 = horizon + (bottom - horizon) * Math.pow(p, 1.6)
        const scale = 0.28 + 0.72 * p
        const halfW = w * (0.3 + 0.62 * p)
        const z = p * WAVE_SPAN - t * 0.34
        const size = 1.1 + 3.2 * Math.pow(p, 1.15)
        const sway = lean * 26 * (0.3 + p)
        const x0 = w / 2 + sway
        const span = 2 * halfW
        const lo = scale * base
        ctx.globalAlpha = (0.16 + 0.7 * Math.pow(p, 1.1)) * fade

        const a1 = z * 1.05 + Math.sin(z * 0.45) * 1.5
        const a2 = 1.7 - z * 0.72
        const a3 = z * 1.25
        const a4 = z * 0.9
        const c1 = Math.cos(a1)
        const s1 = Math.sin(a1)
        const c2 = Math.cos(a2)
        const s2 = Math.sin(a2)
        const c3 = Math.cos(a3)
        const s3 = Math.sin(a3)
        const c4 = Math.cos(a4)
        const s4 = Math.sin(a4)
        const near = pointer && Math.abs(y0 - sy) < 460

        for (let j = 0; j <= cols; j++) {
          const u = colU[j]
          const x = x0 + (u - 0.5) * span
          const n = 0.6 * (S8[j] * c1 + C8[j] * s1) + 0.28 * (S16[j] * c2 + C16[j] * s2) + 0.1 * (S29[j] * c3 + C29[j] * s3)
          const pk = n + 0.18 > 0 ? n + 0.18 : 0
          const swell = 0.13 * (0.5 + 0.5 * (S5[j] * c4 + C5[j] * s4))
          const env = colEnv[j]
          const lift = lo * (env * pk * pk * 2.15 + swell)
          let hgt = lift
          let glow = 0
          if (near) {
            const dx = x - sx
            const dy = y0 - sy
            const d2 = dx * dx + dy * dy
            if (d2 < maxR2) {
              const fall = Math.exp(-d2 / 51200)
              hgt += scale * (fall * (20 + energy * 3.4) * (0.6 + 0.4 * Math.sin(Math.sqrt(d2) * 0.04 - t * 3.2)))
              glow = fall
            }
          }
          if (boost > 0.01) hgt += scale * boost * 28 * env * Math.sin(u * 30 - t * 8)

          const rise = lift / (lo * 1.7 + 0.001)
          const d = size * (0.78 + 0.5 * (rise > 1 ? 1 : rise)) * colEdge[j] * (1 + glow * 0.4)
          let k = ((d - D_MIN) / STEP + 0.5) | 0
          k = k < 0 ? 0 : k >= NB ? NB - 1 : k
          const sz = spriteCss[k]
          ctx.drawImage(sprites[k], x - sz / 2, y0 - hgt - sz / 2, sz, sz)
        }
      }
      ctx.globalAlpha = 1
    }

    let last = 0
    let interval = 33 // 30 frames a second: the landscape moves slowly, so more would only cost battery
    let frames = 0
    let cost = 0
    let gap = 0
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      const d = document.documentElement.dataset
      if (document.hidden || d.tour || d.modal) {
        last = 0
        return
      }
      const lazy = window.scrollY > h * 0.9 // text is on top now: a slower beat is enough
      const want = lazy ? 100 : interval
      if (now - last < want - 5) return
      const waited = last ? now - last : want
      last = now
      const t0 = performance.now()
      draw(now)
      if (lazy) return
      cost = cost ? cost * 0.9 + (performance.now() - t0) * 0.1 : performance.now() - t0
      gap = gap ? gap * 0.9 + waited * 0.1 : waited
      if (++frames % 40 === 0) {
        // too slow to draw, or frames arriving late: thin the dots out one step, then slow down
        if ((cost > 5 || gap > interval * 1.6) && tier < TIERS.length - 1) {
          tier++
          build()
          cost = gap = 0
        } else if ((cost > 9 || gap > interval * 1.9) && interval < 66) interval = 66
      }
    }

    resize()
    window.addEventListener('resize', resize)
    if (reduced) draw(0)
    else {
      raf = requestAnimationFrame(loop)
    }
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener(DOT_EVENT, onDots)
      window.removeEventListener('resize', resize)
    }
  }, [reduced])

  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 h-full w-full" />
}
