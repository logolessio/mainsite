'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useFeature } from './features-provider'
import { useMotionPrefs } from '@/hooks/use-motion-prefs'

/** A cloud edge that eases out to nothing (a smooth S curve), so there is no visible ring where it ends. */
const soft = (rgb: string, alpha: number, end: number, power = 2): [number, string][] =>
  Array.from({ length: 9 }, (_, i) => {
    const t = i / 8
    const k = 0.5 + 0.5 * Math.cos(Math.PI * t)
    return [t * end, `rgba(${rgb},${(alpha * Math.pow(k, power)).toFixed(4)})`] as [number, string]
  })

/** One glow of the Anubis background: where it floats, how it breathes, and how bright it is. */
type Glow = {
  rgb: string
  /** where it floats around, as fractions of the screen's width and height, and how far it travels (also as fractions) */
  x: number
  y: number
  ax: number
  ay: number
  /** the seconds one lap takes, sideways and up and down: different, and not a multiple of each other, so the path never repeats */
  px: number
  py: number
  /** its size as a fraction of the longer side, and how much that size breathes in and out (a fraction) over `bp` seconds */
  r: number
  squash: number
  breathe: number
  bp: number
  phase: number
  alpha: number
}

type Cloud = { cx: number; cy: number; rx: number; ry: number; stops: [number, string][]; sway: [number, number]; period: number; phase: number; spin: number; breathe: number }

/**
 * A soft gradient that drifts and changes shape behind everything, with a faint grid over it. In the standard look it is black and white; in the
 * Anubis look it is the Anubis page's red, blue, teal and amber, floating around and breathing.
 * It is painted on a tiny canvas (about 200 pixels across) that the browser stretches over the screen, so it costs almost
 * nothing to move, and soft gradients lose nothing when stretched. 24 frames a second, paused when the tab is hidden or a
 * sheet is open. Calm mode and reduced motion keep one still frame.
 */
export function GradientField() {
  const ref = useRef<HTMLCanvasElement>(null)
  const { reduced } = useMotionPrefs()
  const look = useFeature('anubis-look')
  // the red rails belong to the public pages; the dashboards have a sidebar and their own edges
  const inApp = /^\/(dashboard|brand|admin|owner|dev)(\/|$)/.test(usePathname() ?? '')

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d', { alpha: false })
    if (!canvas || !ctx) return
    let w = 200
    let h = 120
    let raf = 0
    let last = 0

    const resize = () => {
      w = 200
      h = Math.max(80, Math.round((200 * window.innerHeight) / Math.max(1, window.innerWidth)))
      canvas.width = w
      canvas.height = h
    }

    // The Anubis look: the colours of the Anubis page (its red, blue, teal and amber, over the deep navy it uses for panels) as glows that are added to
    // one another on black, so where two meet they make a third. Each one floats around the screen on a long lap of its own and breathes: it swells and
    // shrinks while it gets brighter and dimmer, and no two breathe together, so the light seems to move through the page.
    const GLOWS: Glow[] = [
      { rgb: '255,31,56', x: 0.2, y: 0.14, ax: 0.3, ay: 0.3, px: 57, py: 71, r: 0.8, squash: 0.82, breathe: 0.3, bp: 11, phase: 0, alpha: 0.34 },
      { rgb: '75,169,220', x: 0.82, y: 0.38, ax: 0.28, ay: 0.32, px: 67, py: 53, r: 0.74, squash: 0.9, breathe: 0.26, bp: 13, phase: 2.1, alpha: 0.28 },
      { rgb: '46,208,176', x: 0.5, y: 1.0, ax: 0.32, ay: 0.26, px: 61, py: 47, r: 0.8, squash: 0.6, breathe: 0.32, bp: 9.5, phase: 4.0, alpha: 0.22 },
      { rgb: '255,200,87', x: 0.72, y: 0.78, ax: 0.34, ay: 0.3, px: 43, py: 59, r: 0.38, squash: 1, breathe: 0.4, bp: 8, phase: 5.3, alpha: 0.1 },
    ]
    const glowStops = GLOWS.map((g) => soft(g.rgb, 1, 1, 0.85))
    const navyStops = soft('2,34,51', 1, 1)
    const drawLook = (t: number) => {
      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = 1
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, w, h)
      const m = Math.max(w, h)
      const paint = (cx: number, cy: number, rx: number, ry: number, stops: [number, string][], alpha: number) => {
        ctx.save()
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha))
        ctx.translate(cx, cy)
        ctx.scale(rx, ry)
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
        for (const [o, col] of stops) g.addColorStop(o, col)
        ctx.fillStyle = g
        ctx.fillRect(-1, -1, 2, 2)
        ctx.restore()
      }
      // a wide wash of navy under everything, breathing very slowly, so the black is a deep blue-black
      paint(0.5 * w, 0.42 * h, 0.95 * m, 0.7 * m, navyStops, 0.85 + 0.15 * Math.sin((t / 17) * Math.PI * 2))
      ctx.globalCompositeOperation = 'lighter'
      GLOWS.forEach((g, i) => {
        const tau = Math.PI * 2
        const cx = (g.x + g.ax * Math.sin((t / g.px) * tau + g.phase)) * w
        const cy = (g.y + g.ay * Math.sin((t / g.py) * tau + g.phase * 1.7)) * h
        const b = Math.sin((t / g.bp) * tau + g.phase)
        const size = g.r * m * (1 + g.breathe * b)
        paint(cx, cy, size, size * g.squash, glowStops[i], g.alpha * (0.8 + 0.3 * b))
      })
      // a soft dark patch drifting behind the middle of the page, so the glow gathers round the edges and the words always sit on something calm
      ctx.globalCompositeOperation = 'source-over'
      const dx = 0.5 + 0.08 * Math.sin((t / 83) * Math.PI * 2)
      const dy = 0.45 + 0.06 * Math.sin((t / 97) * Math.PI * 2 + 1)
      paint(dx * w, dy * h, 0.46 * m, 0.3 * m, soft('0,0,0', 1, 1), 0.7 + 0.08 * Math.sin((t / 14) * Math.PI * 2))
      ctx.globalAlpha = 1
    }

    const tint = ['255,255,255', '225,225,225', '255,255,255', '255,255,255']
    const clouds = (): Cloud[] => {
      const m = Math.max(w, h)
      return [
        { cx: 0.21 * m, cy: 0.05 * m, rx: 0.39 * m, ry: 0.29 * m, stops: soft(tint[0], 0.32, 0.8), sway: [0.2 * w, 0.2 * h], period: 41, phase: 0, spin: 0.35, breathe: 0.18 },
        { cx: w - 0.07 * m, cy: 0.02 * h + 0.37 * m, rx: 0.31 * m, ry: 0.37 * m, stops: soft(tint[1], 0.26, 0.82), sway: [-0.26 * w, 0.18 * h], period: 53, phase: 1.3, spin: -0.5, breathe: 0.2 },
        { cx: 0.49 * m, cy: h + 0.02 * m, rx: 0.43 * m, ry: 0.26 * m, stops: soft(tint[2], 0.22, 0.84), sway: [0.2 * w, -0.24 * h], period: 47, phase: 2.4, spin: 0.4, breathe: 0.2 },
        { cx: 0.36 * w + 0.19 * m, cy: 0.24 * h + 0.19 * m, rx: 0.19 * m, ry: 0.19 * m, stops: soft(tint[3], 0.2, 0.78), sway: [-0.22 * w, 0.18 * h], period: 29, phase: 3.1, spin: 0, breathe: 0.35 },
        { cx: 0.28 * w + 0.3 * m, cy: 0.44 * h + 0.22 * m, rx: 0.3 * m, ry: 0.22 * m, stops: soft('0,0,0', 0.7, 0.9), sway: [-0.24 * w, -0.16 * h], period: 37, phase: 4.2, spin: 0.5, breathe: 0.25 },
      ]
    }
    let cs = clouds()

    const draw = (t: number) => {
      if (look) return drawLook(t)
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, w, h)
      for (const c of cs) {
        const s = Math.sin((t / c.period) * Math.PI * 2 + c.phase)
        const s2 = Math.sin((t / (c.period * 0.73)) * Math.PI * 2 + c.phase * 1.7)
        ctx.save()
        ctx.translate(c.cx + c.sway[0] * 0.5 * s, c.cy + c.sway[1] * 0.5 * s2)
        ctx.rotate(c.spin * s2)
        ctx.scale(c.rx * (1 + c.breathe * 0.5 * s2), c.ry * (1 - c.breathe * 0.5 * s2))
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
        for (const [o, col] of c.stops) g.addColorStop(o, col)
        ctx.fillStyle = g
        ctx.fillRect(-1, -1, 2, 2)
        ctx.restore()
      }
    }

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      const d = document.documentElement.dataset
      if (document.hidden || d.tour || d.modal) return
      if (now - last < (look ? 33 : 40)) return // about 24 frames a second (30 for the Anubis glows, which breathe)
      last = now
      draw(now / 1000)
    }

    const onResize = () => {
      resize()
      cs = clouds()
      if (reduced) draw(8)
    }
    resize()
    cs = clouds()
    draw(performance.now() / 1000) // a first frame at once, so the page never starts out flat black
    window.addEventListener('resize', onResize)
    if (!reduced) raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
    }
  }, [reduced, look])

  return (
    <div aria-hidden="true" className="gradient-field pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <canvas ref={ref} data-bg className="absolute inset-0 h-full w-full" />
      <span className="gf-grid" />
      {!inApp && <span className="gf-rails" />}
    </div>
  )
}
