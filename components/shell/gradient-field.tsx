'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { SiteArt } from './site-art'
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
  /** it also turns a little as it floats: how far it turns (radians) */
  turn: number
  phase: number
  alpha: number
  /** how much the glow slides when the page scrolls (the further ones slide less), as a fraction of the screen height per screen scrolled */
  depth: number
}

type Cloud = { cx: number; cy: number; rx: number; ry: number; stops: [number, string][]; sway: [number, number]; period: number; phase: number; spin: number; breathe: number }

/**
 * A soft gradient that drifts and changes shape behind everything, with a faint grid over it. In the standard look it is black and white; in the
 * Anubis look it is the Anubis page's red, blue, teal and amber (and the pink, violet and sky blue between them), floating round, breathing, swaying,
 * sliding with the scroll and following the pointer, softened and under a layer of moving film grain (see globals.css).
 * It is painted on a tiny canvas (about 200 pixels across) that the browser stretches over the screen, so it costs almost
 * nothing to move, and soft gradients lose nothing when stretched. 24 frames a second (50 in the Anubis look), paused when the tab is hidden or a
 * sheet is open. Calm mode and reduced motion keep one still frame.
 */
export function GradientField() {
  const ref = useRef<HTMLCanvasElement>(null)
  const { reduced } = useMotionPrefs()
  const look = useFeature('anubis-look')
  const path = usePathname() ?? ''
  // the red rails belong to the public pages; the dashboards have a sidebar and their own edges
  const inApp = /^\/(dashboard|brand|admin|owner|dev)(\/|$)/.test(path)
  // a profile (its page, or the editor with the live preview) has backgrounds and effects of its own to animate: the glows behind it ease off
  const slow = /^\/(@|u\/|dashboard\/profile)/.test(path)

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

    // The Anubis look: the colours of the Anubis page (its red, blue, teal and amber, with the pink, violet and sky blue they make where they meet) as glows
    // that are added to one another on black. Each one floats round the screen on a quick lap of its own and breathes: it swells and shrinks while it
    // brightens and dims, and no two breathe together. The whole picture also sways slowly round the middle, slides as the page scrolls, and one warm glow
    // follows the pointer, so there is always something moving.
    const GLOWS: Glow[] = [
      { rgb: '255,31,56', x: 0.18, y: 0.12, ax: 0.38, ay: 0.34, px: 29, py: 37, r: 0.8, squash: 0.8, breathe: 0.38, bp: 6.5, turn: 0.7, phase: 0, alpha: 0.42, depth: 0.2 },
      { rgb: '255,45,150', x: 0.38, y: 0.55, ax: 0.36, ay: 0.3, px: 23, py: 31, r: 0.52, squash: 0.9, breathe: 0.42, bp: 5.2, turn: 1.1, phase: 1.3, alpha: 0.3, depth: 0.35 },
      { rgb: '45,95,255', x: 0.86, y: 0.3, ax: 0.34, ay: 0.36, px: 33, py: 27, r: 0.8, squash: 0.85, breathe: 0.34, bp: 7.4, turn: 0.6, phase: 2.1, alpha: 0.39, depth: 0.15 },
      { rgb: '75,169,220', x: 0.7, y: 0.72, ax: 0.38, ay: 0.3, px: 26, py: 41, r: 0.52, squash: 1, breathe: 0.4, bp: 5.9, turn: 0.9, phase: 3.2, alpha: 0.27, depth: 0.5 },
      { rgb: '46,208,176', x: 0.45, y: 1.0, ax: 0.4, ay: 0.28, px: 31, py: 24, r: 0.74, squash: 0.6, breathe: 0.38, bp: 6.8, turn: 0.5, phase: 4.0, alpha: 0.24, depth: 0.3 },
      { rgb: '140,70,255', x: 0.1, y: 0.85, ax: 0.3, ay: 0.32, px: 38, py: 28, r: 0.56, squash: 0.85, breathe: 0.4, bp: 8.1, turn: 0.8, phase: 4.7, alpha: 0.255, depth: 0.4 },
      { rgb: '255,200,87', x: 0.78, y: 0.9, ax: 0.36, ay: 0.3, px: 21, py: 34, r: 0.36, squash: 1, breathe: 0.45, bp: 4.8, turn: 0, phase: 5.3, alpha: 0.15, depth: 0.6 },
    ]
    const glowStops = GLOWS.map((g) => soft(g.rgb, 1, 1, 0.8))
    const pointerStops = soft('255,140,110', 1, 1, 1)
    const navyStops = soft('2,34,51', 1, 1)
    const patchStops = soft('0,0,0', 1, 1)
    // the pointer, eased (so the glow trails after it), as fractions of the screen
    const ptr = { x: 0.5, y: 0.4, tx: 0.5, ty: 0.4, on: 0 }
    const onPointer = (e: PointerEvent) => {
      ptr.tx = e.clientX / Math.max(1, window.innerWidth)
      ptr.ty = e.clientY / Math.max(1, window.innerHeight)
      ptr.on = 1
    }
    const drawLook = (t: number) => {
      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = 1
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, w, h)
      const m = Math.max(w, h)
      const tau = Math.PI * 2
      const paint = (cx: number, cy: number, rx: number, ry: number, rot: number, stops: [number, string][], alpha: number) => {
        ctx.save()
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha))
        ctx.translate(cx, cy)
        ctx.rotate(rot)
        ctx.scale(rx, ry)
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
        for (const [o, col] of stops) g.addColorStop(o, col)
        ctx.fillStyle = g
        ctx.fillRect(-1, -1, 2, 2)
        ctx.restore()
      }
      // a wide wash of navy under everything, breathing slowly, so the black is a deep blue-black
      paint(0.5 * w, 0.42 * h, 0.95 * m, 0.7 * m, 0, navyStops, 0.85 + 0.15 * Math.sin((t / 13) * tau))
      // the whole picture sways round the middle, and slides as the page scrolls
      const sway = 0.34 * Math.sin((t / 47) * tau) + 0.12 * Math.sin((t / 19) * tau + 1)
      const cs = Math.cos(sway)
      const sn = Math.sin(sway)
      const scroll = typeof window === 'undefined' ? 0 : window.scrollY / Math.max(1, window.innerHeight)
      ctx.globalCompositeOperation = 'lighter'
      GLOWS.forEach((g, i) => {
        let gx = g.x + g.ax * Math.sin((t / g.px) * tau + g.phase)
        let gy = g.y + g.ay * Math.sin((t / g.py) * tau + g.phase * 1.7) - scroll * g.depth * 0.6
        const dx = gx - 0.5
        const dy = gy - 0.5
        gx = 0.5 + dx * cs - dy * sn
        gy = 0.5 + dx * sn + dy * cs
        const b = Math.sin((t / g.bp) * tau + g.phase)
        const size = g.r * m * (1 + g.breathe * b)
        paint(gx * w, gy * h, size, size * (g.squash + 0.12 * Math.sin((t / (g.bp * 2.3)) * tau)), g.turn * Math.sin((t / (g.py * 1.4)) * tau + g.phase), glowStops[i], g.alpha * (0.78 + 0.34 * b))
      })
      // a warm glow that trails after the pointer
      ptr.x += (ptr.tx - ptr.x) * 0.045
      ptr.y += (ptr.ty - ptr.y) * 0.045
      if (ptr.on) paint(ptr.x * w, ptr.y * h, 0.34 * m, 0.34 * m, 0, pointerStops, 0.2 + 0.04 * Math.sin((t / 3.4) * tau))
      // a soft dark patch drifting behind the middle of the page, so the glow gathers round the edges and the words always sit on something calm
      ctx.globalCompositeOperation = 'source-over'
      const px = 0.5 + 0.1 * Math.sin((t / 61) * tau)
      const py = 0.45 + 0.07 * Math.sin((t / 73) * tau + 1)
      paint(px * w, py * h, 0.46 * m, 0.3 * m, 0, patchStops, 0.6 + 0.08 * Math.sin((t / 11) * tau))
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
      if (now - last < (look ? (slow ? 66 : 33) : 40)) return // about 24 frames a second; 30 for the Anubis glows, 15 on the profile pages, which animate plenty of their own
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
    if (look && !reduced) window.addEventListener('pointermove', onPointer, { passive: true })
    if (!reduced) raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('pointermove', onPointer)
    }
  }, [reduced, look, slow])

  return (
    <div aria-hidden="true" className="gradient-field pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <canvas ref={ref} data-bg className="absolute inset-0 h-full w-full" />
      <span className="gf-grid" />
      {look && !inApp && !slow && <SiteArt />}
      {look && <span className="gf-grain" />}
      {!inApp && <span className="gf-rails" />}
    </div>
  )
}
