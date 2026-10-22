'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useFeature } from './features-provider'
import { useMotionPrefs } from '@/hooks/use-motion-prefs'

/** A cloud edge that eases out to nothing (a smooth S curve), so there is no visible ring where it ends. */
const soft = (rgb: string, alpha: number, end: number): [number, string][] =>
  Array.from({ length: 9 }, (_, i) => {
    const t = i / 8
    const k = 0.5 + 0.5 * Math.cos(Math.PI * t)
    return [t * end, `rgba(${rgb},${(alpha * k * k).toFixed(4)})`] as [number, string]
  })

type Cloud = { cx: number; cy: number; rx: number; ry: number; stops: [number, string][]; sway: [number, number]; period: number; phase: number; spin: number; breathe: number }

/**
 * A soft black-and-white gradient that drifts and changes shape behind everything, with a faint grid over it.
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

    // the Anubis look recolours the same four clouds with the Anubis page's own colours, kept faint so the page stays black: its red, its blue,
    // a trace of teal and the deep navy it uses for panels (the fifth cloud, a dark one, stays dark)
    const tint = look ? ['255,31,56', '75,169,220', '46,208,176', '2,34,51'] : ['255,255,255', '225,225,225', '255,255,255', '255,255,255']
    const gains = look ? [0.62, 0.5, 0.3, 3.4] : [1, 1, 1, 1]
    const clouds = (): Cloud[] => {
      const m = Math.max(w, h)
      return [
        { cx: 0.21 * m, cy: 0.05 * m, rx: 0.39 * m, ry: 0.29 * m, stops: soft(tint[0], 0.32 * gains[0], 0.8), sway: [0.2 * w, 0.2 * h], period: 41, phase: 0, spin: 0.35, breathe: 0.18 },
        { cx: w - 0.07 * m, cy: 0.02 * h + 0.37 * m, rx: 0.31 * m, ry: 0.37 * m, stops: soft(tint[1], 0.26 * gains[1], 0.82), sway: [-0.26 * w, 0.18 * h], period: 53, phase: 1.3, spin: -0.5, breathe: 0.2 },
        { cx: 0.49 * m, cy: h + 0.02 * m, rx: 0.43 * m, ry: 0.26 * m, stops: soft(tint[2], 0.22 * gains[2], 0.84), sway: [0.2 * w, -0.24 * h], period: 47, phase: 2.4, spin: 0.4, breathe: 0.2 },
        { cx: 0.36 * w + 0.19 * m, cy: 0.24 * h + 0.19 * m, rx: 0.19 * m, ry: 0.19 * m, stops: soft(tint[3], 0.2 * gains[3], 0.78), sway: [-0.22 * w, 0.18 * h], period: 29, phase: 3.1, spin: 0, breathe: 0.35 },
        { cx: 0.28 * w + 0.3 * m, cy: 0.44 * h + 0.22 * m, rx: 0.3 * m, ry: 0.22 * m, stops: soft('0,0,0', 0.7, 0.9), sway: [-0.24 * w, -0.16 * h], period: 37, phase: 4.2, spin: 0.5, breathe: 0.25 },
      ]
    }
    let cs = clouds()

    const draw = (t: number) => {
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
      if (now - last < 40) return // about 24 frames a second
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
