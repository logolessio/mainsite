'use client'

import { type RefObject, useEffect, useRef } from 'react'
import { hexLum, hexRgb } from '@/lib/bio'
import { useBio } from './context'

/**
 * The cursor effects: what follows the pointer, and what happens where the page is pressed. One canvas over the page that stops working the moment nothing
 * is moving. Particles are laid down along the whole path the pointer took (never just where an event happened to fire, so a fast flick leaves no gaps),
 * lines are smoothed and drawn as tapered ribbons with a glow, and soft things are soft sprites rather than hard discs.
 */
type Shape = 'soft' | 'dot' | 'ring' | 'star' | 'heart' | 'sq' | 'cross' | 'line' | 'emoji' | 'bubble' | 'flame' | 'flake'
type P = {
  x: number
  y: number
  vx: number
  vy: number
  ax: number
  ay: number
  r: number
  t: number
  life: number
  rot: number
  vr: number
  shape: Shape
  c: string
  grow: number
  a0: number
  txt?: string
  drag?: number
  add?: boolean
  sway?: number
  seed: number
}
type Pt = { x: number; y: number; t: number }

const MAX = 320
const TAU = Math.PI * 2
const rnd = (a: number, b: number) => a + Math.random() * (b - a)
const warm = ['255,214,110', '255,150,50', '255,98,40']
const colour = (c: string, a: number) => (c[0] === 'h' ? `hsla(${c.slice(1)},95%,66%,${a})` : `rgba(${c},${a})`)

/** A soft round sprite per colour, drawn scaled: much cheaper and smoother than a gradient made for every puff. */
const sprites = new Map<string, HTMLCanvasElement>()
function soft(c: string): HTMLCanvasElement {
  let s = sprites.get(c)
  if (!s) {
    s = document.createElement('canvas')
    s.width = s.height = 64
    const g = s.getContext('2d')!
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32)
    gr.addColorStop(0, colour(c, 1))
    gr.addColorStop(0.35, colour(c, 0.55))
    gr.addColorStop(0.7, colour(c, 0.14))
    gr.addColorStop(1, colour(c, 0))
    g.fillStyle = gr
    g.fillRect(0, 0, 64, 64)
    if (sprites.size > 40) sprites.clear()
    sprites.set(c, s)
  }
  return s
}

export function CursorFxLayer({ rootRef }: { rootRef: RefObject<HTMLDivElement | null> }) {
  const { cfg } = useBio()
  const cv = useRef<HTMLCanvasElement>(null)
  const { trail, click, emoji, color, amount } = cfg.cursor
  const ink = cfg.theme.tone > 55 || (cfg.colors.on && hexLum(cfg.colors.bg) > 0.55) ? '0,0,0' : '255,255,255'
  const accents = cfg.colors.on ? [hexRgb(cfg.colors.accent).join(','), hexRgb(cfg.colors.accent2).join(',')] : [ink, ink]
  const key = `${trail}|${click}|${emoji}|${color}|${amount}|${ink}|${accents.join('/')}`
  useEffect(() => {
    const root = rootRef.current
    const c = cv.current
    if (!root || !c || (trail === 'none' && click === 'none')) return
    const ctx = c.getContext('2d')
    if (!ctx) return
    let w = 1
    let h = 1
    let left = 0
    let top = 0
    let k = 1 // layout pixels per screen pixel (the editor shows the page shrunk)
    const resize = () => {
      const r = root.getBoundingClientRect()
      left = r.left
      top = r.top
      w = root.offsetWidth || r.width
      h = root.offsetHeight || r.height
      k = r.width ? w / r.width : 1
      const dpr = Math.min(1.5, window.devicePixelRatio || 1)
      c.width = Math.round(w * dpr)
      c.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(root)

    const amt = amount / 100
    let hue = Math.random() * 360
    let flip = 0
    /** One colour for the next thing: the ink, the page's colours in turn, or the next hue of a rainbow. */
    const pick = (): string => {
      if (color === 'rainbow') {
        hue = (hue + 11) % 360
        return `h${Math.round(hue)}`
      }
      if (color === 'accent') return accents[flip++ % 2]
      return ink
    }
    /** The colour at a point along a line (0 head, 1 tail), for ribbons. */
    const along = (u: number, now: number): string => (color === 'rainbow' ? `h${Math.round((now / 8 + u * 200) % 360)}` : color === 'accent' ? accents[u < 0.5 ? 0 : 1] : ink)

    const parts: P[] = []
    const line: Pt[] = []
    let mx = -300
    let my = -300
    let px = -300 // the pointer before this move
    let py = -300
    let fx = -300 // the follower (ring, glow)
    let fy = -300
    let acc = 0 // distance walked since the last thing was laid down
    let vxp = 0
    let vyp = 0
    let press = 0
    let big = 0
    let moved = 0
    let raf = 0
    let last = 0
    let shed = 0

    const mk = (o: Partial<P> & { shape: Shape }, now: number, x = mx, y = my) => {
      if (parts.length >= MAX) parts.shift()
      parts.push({ x, y, vx: 0, vy: 0, ax: 0, ay: 0, r: 3, t: now, life: 700, rot: 0, vr: 0, c: pick(), grow: 0, a0: 1, seed: Math.random() * 100, ...o })
    }

    /* ---- what follows the pointer: laid down along the path, every `step` pixels */
    const stepFor = (kind: string) => (({ dots: 9, stars: 24, hearts: 32, bubbles: 28, snow: 16, fire: 5, smoke: 11, pixels: 10, emoji: 30, ripple: 44, spark: 7 }) as Record<string, number>)[kind] ?? 12
    const lay = (now: number, x: number, y: number) => {
      const sx = vxp * 0.12
      const sy = vyp * 0.12
      if (trail === 'dots') mk({ shape: 'dot', r: 3.6, life: 620, a0: 0.8 }, now, x, y)
      else if (trail === 'stars') mk({ shape: 'star', r: rnd(4, 8), vx: rnd(-0.35, 0.35) + sx * 0.2, vy: rnd(0.05, 0.6), ay: 0.012, vr: rnd(-0.07, 0.07), life: 1000 }, now, x, y)
      else if (trail === 'hearts') mk({ shape: 'heart', r: rnd(5, 9), vx: rnd(-0.3, 0.3), vy: rnd(-0.9, -0.4), life: 1150, vr: rnd(-0.025, 0.025) }, now, x, y)
      else if (trail === 'bubbles') mk({ shape: 'bubble', r: rnd(3, 9), vx: rnd(-0.25, 0.25), vy: rnd(-0.9, -0.3), grow: 0.004, life: 1300, sway: rnd(0.4, 1) }, now, x, y)
      else if (trail === 'snow') mk({ shape: 'flake', r: rnd(1.4, 3.2), vx: rnd(-0.2, 0.2), vy: rnd(0.25, 0.8), life: 1700, sway: rnd(0.3, 0.9) }, now, x, y)
      else if (trail === 'fire') {
        for (let i = 0; i < 2; i++) mk({ shape: 'flame', r: rnd(5, 9), vx: rnd(-0.4, 0.4), vy: rnd(-1.7, -0.7), life: rnd(520, 820), c: color === 'auto' ? warm[0] : pick(), add: true, sway: rnd(0.4, 1) }, now, x + rnd(-2, 2), y + rnd(-2, 2))
      } else if (trail === 'smoke') mk({ shape: 'soft', r: rnd(7, 12), vx: rnd(-0.15, 0.15), vy: rnd(-0.55, -0.2), grow: 0.022, life: 1700, a0: 0.2, sway: rnd(0.3, 0.8), c: color === 'auto' ? (ink === '255,255,255' ? '215,220,232' : '40,44,54') : pick() }, now, x, y)
      else if (trail === 'pixels') mk({ shape: 'sq', x: Math.round(x / 6) * 6, y: Math.round(y / 6) * 6, r: 6, life: 560, a0: 0.9 }, now)
      else if (trail === 'ripple') mk({ shape: 'ring', r: 2, grow: 0.05, life: 780, a0: 0.8 }, now, x, y)
      else if (trail === 'emoji') mk({ shape: 'emoji', txt: emoji, r: rnd(13, 19), vx: rnd(-0.35, 0.35), vy: rnd(-0.6, 0.2), ay: 0.018, vr: rnd(-0.04, 0.04), life: 1150 }, now, x, y)
      else if (trail === 'spark') {
        // bright specks thrown off backwards, falling
        for (let i = 0; i < Math.max(1, Math.round(2 * amt)); i++) mk({ shape: 'soft', r: rnd(2, 4.5), vx: -sx * rnd(0.3, 1.2) + rnd(-0.9, 0.9), vy: -sy * rnd(0.3, 1.2) + rnd(-1.6, -0.1), ay: 0.07, drag: 0.97, life: rnd(500, 900), add: true, c: color === 'auto' ? '255,236,190' : pick() }, now, x, y)
      }
    }

    /* ---- what happens where the page is pressed */
    const burst = (now: number) => {
      const n = (v: number) => Math.max(2, Math.round(v * amt))
      const out = (count: number, o: (i: number, a: number) => Partial<P> & { shape: Shape }) => {
        for (let i = 0; i < count; i++) mk(o(i, (i / count) * TAU + rnd(-0.2, 0.2)), now)
      }
      if (click === 'ripple') for (let i = 0; i < 3; i++) mk({ shape: 'ring', r: 2, grow: 0.075, life: 950, t: now + i * 150, a0: 0.8 }, now)
      else if (click === 'shockwave') {
        mk({ shape: 'ring', r: 4, grow: 0.2, life: 800, a0: 0.9 }, now)
        mk({ shape: 'ring', r: 2, grow: 0.13, life: 650, t: now + 80, a0: 0.5 }, now)
        mk({ shape: 'soft', r: 10, grow: 0.16, life: 420, a0: 0.35, add: true }, now)
      } else if (click === 'burst') out(n(18), (_, a) => ({ shape: 'line', r: rnd(6, 13), vx: Math.cos(a) * rnd(2, 5.5), vy: Math.sin(a) * rnd(2, 5.5), drag: 0.92, life: 650, rot: a }))
      else if (click === 'firework') {
        mk({ shape: 'soft', r: 14, grow: 0.05, life: 300, a0: 0.5, add: true }, now)
        out(n(34), (i, a) => ({ shape: 'soft', r: rnd(2, 4), vx: Math.cos(a) * rnd(1.2, 4.8), vy: Math.sin(a) * rnd(1.2, 4.8), ay: 0.045, drag: 0.955, life: rnd(800, 1400), add: true, c: color === 'auto' ? warm[i % 3] : pick() }))
      } else if (click === 'confetti')
        out(n(32), (_, a) => ({ shape: 'sq', r: rnd(4, 7), vx: Math.cos(a) * rnd(1.5, 5), vy: Math.sin(a) * rnd(1.5, 5) - 2.8, ay: 0.13, drag: 0.972, vr: rnd(-0.3, 0.3), c: color === 'auto' ? ['255,90,110', '255,200,60', '90,200,255', '130,255,160', '200,120,255'][Math.floor(Math.random() * 5)] : pick(), life: 1500 }))
      else if (click === 'stars') out(n(10), (_, a) => ({ shape: 'star', r: rnd(5, 10), vx: Math.cos(a) * rnd(1, 3.6), vy: Math.sin(a) * rnd(1, 3.6) - 0.8, ay: 0.05, drag: 0.95, vr: rnd(-0.12, 0.12), life: 1000 }))
      else if (click === 'hearts') out(n(8), () => ({ shape: 'heart', r: rnd(6, 11), vx: rnd(-1.5, 1.5), vy: rnd(-2.6, -1), ay: -0.01, vr: rnd(-0.05, 0.05), life: 1300 }))
      else if (click === 'sparkle') out(n(7), () => ({ shape: 'cross', x: mx + rnd(-26, 26), y: my + rnd(-26, 26), r: rnd(5, 11), life: rnd(500, 900), t: now + rnd(0, 200), vr: 0.03 }))
      else if (click === 'bubbles') out(n(10), () => ({ shape: 'bubble', r: rnd(3, 9), vx: rnd(-1.2, 1.2), vy: rnd(-2.2, -0.6), grow: 0.003, life: 1400, sway: rnd(0.3, 0.8) }))
      else if (click === 'pixels') out(n(18), (_, a) => ({ shape: 'sq', r: 5, vx: Math.cos(a) * rnd(1, 4), vy: Math.sin(a) * rnd(1, 4) - 1.5, ay: 0.12, drag: 0.96, life: 800 }))
      else if (click === 'emoji') out(n(10), (_, a) => ({ shape: 'emoji', txt: emoji, r: rnd(14, 22), vx: Math.cos(a) * rnd(1, 3.4), vy: Math.sin(a) * rnd(1, 3.4) - 2.4, ay: 0.1, drag: 0.97, vr: rnd(-0.1, 0.1), life: 1300 }))
    }

    /* ---- drawing */
    const star = (r: number) => {
      ctx.beginPath()
      for (let i = 0; i < 10; i++) {
        const rr = i % 2 ? r * 0.42 : r
        const a = (i / 10) * TAU - Math.PI / 2
        ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, Math.sin(a) * rr)
      }
      ctx.closePath()
    }
    const heart = (r: number) => {
      ctx.beginPath()
      ctx.moveTo(0, r * 0.9)
      ctx.bezierCurveTo(-r * 1.6, -r * 0.1, -r * 0.7, -r * 1.2, 0, -r * 0.45)
      ctx.bezierCurveTo(r * 0.7, -r * 1.2, r * 1.6, -r * 0.1, 0, r * 0.9)
      ctx.closePath()
    }
    /** A smooth tapered ribbon along the points (head first at the end of the array). `width(u, i)`: u is 0 at the head, 1 at the tail. */
    const ribbon = (pts: Pt[], width: (u: number, i: number) => number) => {
      const n = pts.length
      const L: [number, number][] = []
      const R: [number, number][] = []
      for (let i = 0; i < n; i++) {
        const a = pts[Math.max(0, i - 1)]
        const b = pts[Math.min(n - 1, i + 1)]
        let tx = b.x - a.x
        let ty = b.y - a.y
        const l = Math.hypot(tx, ty) || 1
        tx /= l
        ty /= l
        const u = 1 - i / (n - 1) // the last point is the head
        const wd = width(u, i) / 2
        L.push([pts[i].x - ty * wd, pts[i].y + tx * wd])
        R.push([pts[i].x + ty * wd, pts[i].y - tx * wd])
      }
      const path = new Path2D()
      const edge = (e: [number, number][], rev: boolean) => {
        const a = rev ? [...e].reverse() : e
        if (!rev) path.moveTo(a[0][0], a[0][1])
        else path.lineTo(a[0][0], a[0][1])
        for (let i = 1; i < a.length - 1; i++) path.quadraticCurveTo(a[i][0], a[i][1], (a[i][0] + a[i + 1][0]) / 2, (a[i][1] + a[i + 1][1]) / 2)
        path.lineTo(a[a.length - 1][0], a[a.length - 1][1])
      }
      edge(L, false)
      edge(R, true)
      path.closePath()
      return path
    }
    const fillRibbon = (path: Path2D, from: Pt, to: Pt, now: number, head: number, tail: number, add = false) => {
      const g = ctx.createLinearGradient(to.x, to.y, from.x, from.y) // tail to head
      const steps = color === 'rainbow' ? 5 : 1
      for (let s = 0; s <= steps; s++) {
        const u = s / steps
        g.addColorStop(u, colour(along(1 - u, now), tail + (head - tail) * Math.pow(u, 1.4)))
      }
      ctx.save()
      if (add) ctx.globalCompositeOperation = 'lighter'
      ctx.fillStyle = g
      ctx.fill(path)
      ctx.restore()
    }

    const draw = (now: number) => {
      raf = 0
      const dt = Math.min(2.4, (now - (last || now - 16)) / 16.67)
      last = now
      ctx.clearRect(0, 0, w, h)

      /* the follower: a ring that trails the pointer and swells over links, or a glow */
      if (trail === 'ring' || trail === 'glow') {
        const sp = 1 - Math.pow(1 - 0.2, Math.min(2.5, dt))
        fx += (mx - fx) * sp
        fy += (my - fy) * sp
        press *= Math.pow(0.88, dt)
        const col = color === 'rainbow' ? `h${Math.round((now / 12) % 360)}` : color === 'accent' ? accents[0] : ink
        if (trail === 'ring') {
          const r = (15 + big * 13) * (1 - press * 0.28)
          if (big) {
            ctx.fillStyle = colour(col, 0.1)
            ctx.beginPath()
            ctx.arc(fx, fy, r, 0, TAU)
            ctx.fill()
          }
          ctx.strokeStyle = colour(col, 0.7)
          ctx.lineWidth = 1.5
          ctx.beginPath()
          ctx.arc(fx, fy, r, 0, TAU)
          ctx.stroke()
          ctx.fillStyle = colour(col, 0.9)
          ctx.beginPath()
          ctx.arc(mx, my, 2.2, 0, TAU)
          ctx.fill()
        } else {
          const rad = 40 + big * 24 + press * 10
          ctx.save()
          ctx.globalCompositeOperation = 'lighter'
          ctx.globalAlpha = 0.65
          ctx.drawImage(soft(col), fx - rad, fy - rad, rad * 2, rad * 2)
          ctx.globalAlpha = 0.9
          ctx.drawImage(soft(col), mx - 9, my - 9, 18, 18)
          ctx.restore()
        }
      }

      /* the line trails: smoothed ribbons that taper to nothing */
      if (trail === 'comet' || trail === 'ink' || trail === 'laser' || trail === 'ribbon' || trail === 'electric') {
        const life = trail === 'ink' ? 1000 : trail === 'laser' ? 420 : trail === 'electric' ? 360 : trail === 'ribbon' ? 760 : 620
        while (line.length && now - line[0].t > life) line.shift()
        if (line.length > 2) {
          const head = line[line.length - 1]
          const tail = line[0]
          const age = (i: number) => (now - line[i].t) / life
          if (trail === 'comet') {
            const wd = (u: number, i: number) => 9 * Math.pow(1 - age(i), 0.9) * Math.pow(1 - u, 0.6) + 0.3
            fillRibbon(ribbon(line, (u, i) => wd(u, i) * 3.2), head, tail, now, 0.2, 0, true)
            fillRibbon(ribbon(line, wd), head, tail, now, 0.95, 0)
            const col = along(0, now)
            ctx.save()
            ctx.globalCompositeOperation = 'lighter'
            ctx.globalAlpha = 0.8
            ctx.drawImage(soft(col), head.x - 15, head.y - 15, 30, 30)
            ctx.restore()
            // specks shed from the head
            if (now - shed > 38 && now - moved < 120) {
              shed = now
              mk({ shape: 'soft', r: rnd(1.5, 3), vx: rnd(-0.5, 0.5), vy: rnd(-0.4, 0.8), ay: 0.02, life: rnd(500, 900), add: true, c: color === 'auto' ? '255,255,255' : pick() }, now, head.x, head.y)
            }
          } else if (trail === 'laser') {
            const wd = (u: number, i: number) => Math.max(0.4, (1 - age(i)) * 1.9)
            fillRibbon(ribbon(line, (u, i) => wd(u, i) * 5.5), head, tail, now, 0.32, 0, true)
            fillRibbon(ribbon(line, wd), head, tail, now, 1, 0)
            ctx.save()
            ctx.globalCompositeOperation = 'lighter'
            ctx.drawImage(soft(along(0, now)), head.x - 11, head.y - 11, 22, 22)
            ctx.restore()
          } else if (trail === 'ribbon') {
            const wd = (u: number, i: number) => (22 * Math.pow(1 - age(i), 1.1) + 1) * (0.25 + 0.75 * Math.sin(Math.min(1, (1 - u) * 1.4) * 1.57))
            fillRibbon(ribbon(line, wd), head, tail, now, 0.8, 0)
          } else if (trail === 'ink') {
            // wide where the pointer is slow, thin where it flies, like a brush
            const wd = (u: number, i: number) => {
              const a = line[Math.max(0, i - 1)]
              const b = line[Math.min(line.length - 1, i + 1)]
              const speed = Math.hypot(b.x - a.x, b.y - a.y) / Math.max(1, b.t - a.t + 1) * 16
              return Math.max(1.6, Math.min(12, 13 - speed * 0.45)) * Math.pow(1 - age(i), 0.7) * Math.pow(1 - u, 0.35)
            }
            fillRibbon(ribbon(line, wd), head, tail, now, 0.85, 0.05)
          } else {
            // electric: a flickering bolt that jumps around the path
            const col = along(0, now)
            ctx.save()
            ctx.globalCompositeOperation = 'lighter'
            ctx.lineJoin = 'round'
            ctx.lineCap = 'round'
            for (const [lw, a] of [[5, 0.14], [1.4, 0.95]] as const) {
              ctx.lineWidth = lw
              ctx.strokeStyle = colour(col, a)
              ctx.beginPath()
              for (let i = 0; i < line.length; i += 2) {
                const j = (1 - age(i)) * 7
                const x = line[i].x + rnd(-j, j)
                const y = line[i].y + rnd(-j, j)
                if (i === 0) ctx.moveTo(x, y)
                else ctx.lineTo(x, y)
              }
              ctx.stroke()
            }
            ctx.restore()
          }
        }
      }

      /* the particles */
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i]
        const age = now - p.t
        if (age < 0) continue
        if (age > p.life) {
          parts.splice(i, 1)
          continue
        }
        const q = age / p.life
        if (p.sway) p.vx += Math.sin(age / 260 + p.seed) * 0.012 * p.sway * dt
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.vx += p.ax * dt
        p.vy += p.ay * dt
        if (p.drag) {
          p.vx *= Math.pow(p.drag, dt)
          p.vy *= Math.pow(p.drag, dt)
        }
        p.rot += p.vr * dt
        const a = Math.max(0, (1 - q) * p.a0)
        const r = Math.max(0.2, p.r + p.grow * age * (p.shape === 'ring' || p.shape === 'soft' ? 16.67 : 1))
        if (p.shape === 'soft' || p.shape === 'flake') {
          ctx.save()
          if (p.add) ctx.globalCompositeOperation = 'lighter'
          ctx.globalAlpha = p.shape === 'flake' ? Math.min(1, (1 - q) * 1.6) * 0.9 : Math.min(1, q * 8) * a
          const rr = p.shape === 'flake' ? r : r * (p.add ? 1 - q * 0.5 : 1)
          ctx.drawImage(soft(p.c), p.x - rr, p.y - rr, rr * 2, rr * 2)
          ctx.restore()
          continue
        }
        if (p.shape === 'flame') {
          // white-hot, then yellow, then orange, then a red ember: a flame cools as it rises
          const col = color !== 'auto' ? p.c : q < 0.22 ? '255,244,200' : q < 0.5 ? '255,176,60' : q < 0.78 ? '240,96,34' : '170,40,20'
          const rr = r * (1 - q * 0.75)
          ctx.save()
          ctx.globalCompositeOperation = 'lighter'
          ctx.globalAlpha = Math.min(1, q * 10) * (1 - q) * 0.9
          ctx.drawImage(soft(col), p.x - rr * 1.6, p.y - rr * 1.6, rr * 3.2, rr * 3.2)
          ctx.restore()
          continue
        }
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.fillStyle = colour(p.c, a)
        ctx.strokeStyle = colour(p.c, a)
        if (p.shape === 'dot') {
          ctx.beginPath()
          ctx.arc(0, 0, r * (1 - q * 0.7), 0, TAU)
          ctx.fill()
        } else if (p.shape === 'ring') {
          ctx.lineWidth = 0.6 + 1.4 * (1 - q)
          ctx.beginPath()
          ctx.arc(0, 0, r, 0, TAU)
          ctx.stroke()
        } else if (p.shape === 'bubble') {
          ctx.lineWidth = 1.2
          ctx.fillStyle = colour(p.c, a * 0.12)
          ctx.beginPath()
          ctx.arc(0, 0, r, 0, TAU)
          ctx.fill()
          ctx.stroke()
          ctx.strokeStyle = colour(p.c, a * 0.9)
          ctx.beginPath()
          ctx.arc(0, 0, r * 0.68, 3.6, 4.5)
          ctx.stroke()
        } else if (p.shape === 'sq') {
          // paper and pixels: a flip makes confetti turn over as it falls
          ctx.scale(1, p.vr ? Math.cos(p.rot * 1.7) : 1)
          ctx.fillRect(-r / 2, -r / 2, r, r * (p.vr ? 0.62 : 1))
        } else if (p.shape === 'star') {
          const s = Math.min(1, q * 7) * (1 - q * 0.35)
          ctx.scale(s, s)
          star(r)
          ctx.fill()
        } else if (p.shape === 'heart') {
          const s = (q < 0.18 ? 0.4 + (q / 0.18) * 0.8 : 1.2 - Math.min(0.3, (q - 0.18) * 0.4)) * (1 - q * 0.25)
          ctx.scale(s, s)
          heart(r)
          ctx.fill()
        } else if (p.shape === 'cross') {
          const s = r * Math.sin(Math.min(1, q * 2) * Math.PI)
          ctx.lineWidth = 1.6
          ctx.beginPath()
          ctx.moveTo(-s, 0)
          ctx.lineTo(s, 0)
          ctx.moveTo(0, -s)
          ctx.lineTo(0, s)
          ctx.stroke()
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(-s * 0.45, -s * 0.45)
          ctx.lineTo(s * 0.45, s * 0.45)
          ctx.moveTo(-s * 0.45, s * 0.45)
          ctx.lineTo(s * 0.45, -s * 0.45)
          ctx.stroke()
        } else if (p.shape === 'line') {
          ctx.lineWidth = 1.8
          ctx.lineCap = 'round'
          ctx.beginPath()
          ctx.moveTo(0, 0)
          ctx.lineTo(r * (1 - q * 0.5), 0)
          ctx.stroke()
        } else if (p.shape === 'emoji') {
          ctx.globalAlpha = a
          const s = q < 0.15 ? 0.5 + (q / 0.15) * 0.5 : 1
          ctx.font = `${r * s}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(p.txt ?? '✨', 0, 0)
        }
        ctx.restore()
      }
      const following = trail === 'ring' || trail === 'glow' ? Math.abs(mx - fx) > 0.5 || Math.abs(my - fy) > 0.5 || press > 0.02 || now - moved < 250 : false
      if (parts.length > 0 || line.length > 0 || following) raf = requestAnimationFrame(draw)
      else last = 0
    }
    const wake = () => {
      if (!raf) raf = requestAnimationFrame(draw)
    }
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || trail === 'none') return
      const now = performance.now()
      px = mx
      py = my
      mx = (e.clientX - left) * k
      my = (e.clientY - top) * k
      if (fx < -100) {
        fx = mx
        fy = my
        px = mx
        py = my
      }
      const dx = mx - px
      const dy = my - py
      const dist = Math.hypot(dx, dy)
      const dtm = Math.max(1, now - moved)
      vxp = vxp * 0.5 + ((dx / dtm) * 16) * 0.5
      vyp = vyp * 0.5 + ((dy / dtm) * 16) * 0.5
      moved = now
      big = (e.target as HTMLElement | null)?.closest?.('[data-link], a, button') ? 1 : 0
      if (trail === 'comet' || trail === 'ink' || trail === 'laser' || trail === 'ribbon' || trail === 'electric') {
        const tail = line[line.length - 1]
        if (!tail || Math.hypot(mx - tail.x, my - tail.y) > 2.2) line.push({ x: mx, y: my, t: now })
      } else if (trail !== 'ring' && trail !== 'glow' && dist > 0) {
        const step = stepFor(trail) / amt
        acc += dist
        while (acc >= step) {
          acc -= step
          const back = acc / dist
          lay(now, mx - dx * back, my - dy * back)
        }
      }
      wake()
    }
    const onDown = (e: PointerEvent) => {
      if (e.button > 0) return
      mx = (e.clientX - left) * k
      my = (e.clientY - top) * k
      press = 1
      if (click !== 'none') burst(performance.now())
      wake()
    }
    root.addEventListener('pointermove', onMove)
    root.addEventListener('pointerdown', onDown)
    return () => {
      root.removeEventListener('pointermove', onMove)
      root.removeEventListener('pointerdown', onDown)
      ro.disconnect()
      cancelAnimationFrame(raf)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, rootRef])
  return <canvas ref={cv} aria-hidden="true" className="bio-layer size-full" style={{ zIndex: 30 }} />
}
