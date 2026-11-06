'use client'

import { AnimatePresence, motion, useMotionTemplate, useTransform } from 'framer-motion'
import { type RefObject, useEffect, useRef, useState } from 'react'
import { type BioConfig, hexLum, hexRgb } from '@/lib/bio'
import { cursorCss, uploadCursorCss } from '@/lib/bio-cursors'
import { useBio } from './context'

/** The CSS variables that give a page its cursor (the page and the links on it), or nothing when it uses the ordinary one. */
export function cursorVars(cfg: BioConfig): Record<string, string> {
  const c = cfg.cursor
  if (c.kind === 'upload' && c.image) {
    const u = uploadCursorCss(c.image, c.hot, c.size)
    return { '--bio-cursor': u.arrow, '--bio-cursor-link': u.link }
  }
  if (c.kind === 'preset') {
    const u = cursorCss(c.preset, c.ink, c.size)
    return { '--bio-cursor': u.arrow, '--bio-cursor-link': u.link }
  }
  return {}
}

/** The light that follows the pointer, with the rest of the page dimmed. */
export function Spotlight() {
  const { px, py, cfg } = useBio()
  const x = useTransform(px, (v) => 50 + v * 50)
  const y = useTransform(py, (v) => 50 + v * 50)
  const shade = cfg.theme.tone > 55 ? 'rgb(0 0 0 / 0.5)' : 'rgb(0 0 0 / 0.72)'
  const bg = useMotionTemplate`radial-gradient(circle 300px at ${x}% ${y}%, transparent 0%, transparent 35%, ${shade} 100%)`
  return <motion.div aria-hidden="true" className="bio-layer" style={{ zIndex: 18, background: bg }} />
}

type Shape = 'dot' | 'ring' | 'star' | 'heart' | 'sq' | 'cross' | 'line' | 'emoji' | 'puff'
type P = { x: number; y: number; vx: number; vy: number; ax: number; ay: number; r: number; t: number; life: number; rot: number; vr: number; shape: Shape; c: string; grow: number; a0: number; txt?: string; drag?: number; add?: boolean }
type Pt = { x: number; y: number; t: number }

const MAX = 260
const rnd = (a: number, b: number) => a + Math.random() * (b - a)
const warm = ['255,214,110', '255,150,50', '255,98,40']

/** The cursor effects: what follows the pointer, and what happens where the page is pressed. One canvas over the page that stops working the moment nothing is moving. */
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
    const colour = (): string => {
      if (color === 'rainbow') {
        hue = (hue + 9) % 360
        return `h${Math.round(hue)}`
      }
      if (color === 'accent') return accents[flip++ % 2]
      return ink
    }
    const parts: P[] = []
    const line: Pt[] = []
    let mx = -300
    let my = -300
    let fx = -300
    let fy = -300
    let lx = -300
    let ly = -300
    let big = 0
    let moved = 0
    let raf = 0
    let last = 0
    const mk = (o: Partial<P> & { shape: Shape }, now: number) => {
      if (parts.length >= MAX) parts.shift()
      parts.push({ x: mx, y: my, vx: 0, vy: 0, ax: 0, ay: 0, r: 3, t: now, life: 700, rot: 0, vr: 0, c: colour(), grow: 0, a0: 1, ...o })
    }
    const style = (col: string, a: number) => (col[0] === 'h' ? `hsla(${col.slice(1)},95%,66%,${a})` : `rgba(${col},${a})`)

    /* ---- what follows the pointer */
    const stepFor = (kind: string) => (({ dots: 8, stars: 26, hearts: 34, bubbles: 30, snow: 20, fire: 6, smoke: 14, pixels: 10, emoji: 30, ripple: 46, spark: 0 }) as Record<string, number>)[kind] ?? 12
    const spawn = (now: number, dist: number) => {
      const step = stepFor(trail) / amt
      if (trail === 'spark') {
        for (let i = 0; i < Math.max(1, Math.round(2 * amt)); i++) mk({ shape: 'sq', vx: rnd(-1.2, 1.2), vy: rnd(-1.8, -0.2), ay: 0.05, r: rnd(1, 2.4), life: 800 }, now)
        return
      }
      if (dist < step) return
      lx = mx
      ly = my
      if (trail === 'dots') mk({ shape: 'dot', r: 3.4, life: 460, a0: 0.75 }, now)
      else if (trail === 'stars') mk({ shape: 'star', r: rnd(4, 8), vx: rnd(-0.4, 0.4), vy: rnd(0.1, 0.7), ay: 0.012, vr: rnd(-0.08, 0.08), life: 950 }, now)
      else if (trail === 'hearts') mk({ shape: 'heart', r: rnd(5, 9), vx: rnd(-0.3, 0.3), vy: rnd(-0.9, -0.4), life: 1100, vr: rnd(-0.03, 0.03) }, now)
      else if (trail === 'bubbles') mk({ shape: 'ring', r: rnd(3, 8), vx: rnd(-0.3, 0.3), vy: rnd(-0.8, -0.3), grow: 0.004, life: 1200 }, now)
      else if (trail === 'snow') mk({ shape: 'dot', r: rnd(1.2, 3), vx: rnd(-0.5, 0.5), vy: rnd(0.3, 0.9), life: 1500 }, now)
      else if (trail === 'fire') mk({ shape: 'dot', r: rnd(2.5, 5), vx: rnd(-0.5, 0.5), vy: rnd(-1.6, -0.6), c: color === 'auto' ? warm[Math.floor(Math.random() * 3)] : colour(), life: 650, grow: -0.004, add: true }, now)
      else if (trail === 'smoke') mk({ shape: 'puff', r: rnd(6, 11), vx: rnd(-0.2, 0.2), vy: rnd(-0.5, -0.2), grow: 0.02, life: 1400, a0: 0.28 }, now)
      else if (trail === 'pixels') mk({ shape: 'sq', x: Math.round(mx / 6) * 6, y: Math.round(my / 6) * 6, r: 6, life: 520, a0: 0.85 }, now)
      else if (trail === 'ripple') mk({ shape: 'ring', r: 2, grow: 0.045, life: 700, a0: 0.8 }, now)
      else if (trail === 'emoji') mk({ shape: 'emoji', txt: emoji, r: rnd(13, 19), vx: rnd(-0.4, 0.4), vy: rnd(-0.5, 0.3), ay: 0.02, vr: rnd(-0.04, 0.04), life: 1100 }, now)
    }

    /* ---- what happens where the page is pressed */
    const burst = (now: number) => {
      const n = (v: number) => Math.max(2, Math.round(v * amt))
      const out = (count: number, o: (i: number, a: number) => Partial<P> & { shape: Shape }) => {
        for (let i = 0; i < count; i++) mk(o(i, (i / count) * 6.2832 + rnd(-0.2, 0.2)), now)
      }
      if (click === 'ripple') for (let i = 0; i < 3; i++) mk({ shape: 'ring', r: 2, grow: 0.07, life: 900, t: now + i * 140, a0: 0.8 }, now)
      else if (click === 'shockwave') {
        mk({ shape: 'ring', r: 4, grow: 0.19, life: 750, a0: 0.9 }, now)
        mk({ shape: 'ring', r: 2, grow: 0.12, life: 600, t: now + 80, a0: 0.5 }, now)
      } else if (click === 'burst') out(n(16), (_, a) => ({ shape: 'line', r: rnd(5, 11), vx: Math.cos(a) * rnd(2, 5), vy: Math.sin(a) * rnd(2, 5), drag: 0.92, life: 600, rot: a }))
      else if (click === 'confetti') out(n(30), (_, a) => ({ shape: 'sq', r: rnd(3, 6), vx: Math.cos(a) * rnd(1.5, 5), vy: Math.sin(a) * rnd(1.5, 5) - 2.5, ay: 0.13, drag: 0.97, vr: rnd(-0.3, 0.3), c: color === 'auto' ? `h${Math.round(rnd(0, 360))}` : colour(), life: 1400 }))
      else if (click === 'stars') out(n(10), (_, a) => ({ shape: 'star', r: rnd(5, 10), vx: Math.cos(a) * rnd(1, 3.6), vy: Math.sin(a) * rnd(1, 3.6) - 0.8, ay: 0.05, drag: 0.95, vr: rnd(-0.12, 0.12), life: 1000 }))
      else if (click === 'hearts') out(n(8), () => ({ shape: 'heart', r: rnd(6, 11), vx: rnd(-1.5, 1.5), vy: rnd(-2.6, -1), ay: -0.01, vr: rnd(-0.05, 0.05), life: 1300 }))
      else if (click === 'sparkle') out(n(7), () => ({ shape: 'cross', x: mx + rnd(-26, 26), y: my + rnd(-26, 26), r: rnd(5, 11), life: rnd(500, 900), t: now + rnd(0, 200), vr: 0.03 }))
      else if (click === 'bubbles') out(n(10), () => ({ shape: 'ring', r: rnd(3, 9), vx: rnd(-1.2, 1.2), vy: rnd(-2.2, -0.6), grow: 0.003, life: 1300 }))
      else if (click === 'pixels') out(n(18), (_, a) => ({ shape: 'sq', r: 5, vx: Math.cos(a) * rnd(1, 4), vy: Math.sin(a) * rnd(1, 4) - 1.5, ay: 0.12, drag: 0.96, life: 800 }))
      else if (click === 'emoji') out(n(10), (_, a) => ({ shape: 'emoji', txt: emoji, r: rnd(14, 22), vx: Math.cos(a) * rnd(1, 3.4), vy: Math.sin(a) * rnd(1, 3.4) - 2.4, ay: 0.1, drag: 0.97, vr: rnd(-0.1, 0.1), life: 1300 }))
    }

    /* ---- drawing */
    const star = (r: number) => {
      ctx.beginPath()
      for (let i = 0; i < 10; i++) {
        const rr = i % 2 ? r * 0.45 : r
        const a = (i / 10) * 6.2832 - 1.5708
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
    const draw = (now: number) => {
      raf = 0
      const dt = Math.min(2.4, (now - (last || now - 16)) / 16.67)
      last = now
      ctx.clearRect(0, 0, w, h)
      // the follower (ring, glow) and the line trails (comet, ink, laser)
      if (trail === 'ring' || trail === 'glow') {
        fx += (mx - fx) * 0.17 * Math.min(1.5, dt)
        fy += (my - fy) * 0.17 * Math.min(1.5, dt)
        if (trail === 'ring') {
          ctx.strokeStyle = style(colour().startsWith('h') ? colour() : ink, 0.6 + big * 0.3)
          ctx.lineWidth = 1.4
          ctx.beginPath()
          ctx.arc(fx, fy, 16 + big * 14, 0, 6.2832)
          ctx.stroke()
        } else {
          const rad = 34 + big * 22
          const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, rad)
          const col = color === 'rainbow' ? `h${Math.round((now / 12) % 360)}` : color === 'accent' ? accents[0] : ink
          g.addColorStop(0, style(col, 0.5))
          g.addColorStop(1, style(col, 0))
          ctx.fillStyle = g
          ctx.beginPath()
          ctx.arc(fx, fy, rad, 0, 6.2832)
          ctx.fill()
        }
      }
      if (trail === 'comet' || trail === 'ink' || trail === 'laser') {
        const life = trail === 'ink' ? 800 : trail === 'laser' ? 380 : 520
        while (line.length && now - line[0].t > life) line.shift()
        ctx.lineCap = 'round'
        for (let i = 1; i < line.length; i++) {
          const a = 1 - (now - line[i].t) / life
          const col = color === 'rainbow' ? `h${Math.round((i * 7 + now / 10) % 360)}` : color === 'accent' ? accents[i % 2 === 0 ? 0 : 1] : ink
          if (trail === 'laser') {
            ctx.strokeStyle = style(col, a * 0.25)
            ctx.lineWidth = Math.max(1, a * 9)
            ctx.beginPath()
            ctx.moveTo(line[i - 1].x, line[i - 1].y)
            ctx.lineTo(line[i].x, line[i].y)
            ctx.stroke()
          }
          ctx.strokeStyle = style(col, a * (trail === 'ink' ? 0.5 : 0.9))
          ctx.lineWidth = Math.max(0.5, a * (trail === 'ink' ? 10 : trail === 'laser' ? 1.8 : 4.5))
          ctx.beginPath()
          ctx.moveTo(line[i - 1].x, line[i - 1].y)
          ctx.lineTo(line[i].x, line[i].y)
          ctx.stroke()
        }
      }
      // the particles
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i]
        const age = now - p.t
        if (age < 0) continue
        if (age > p.life) {
          parts.splice(i, 1)
          continue
        }
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.vx += p.ax * dt
        p.vy += p.ay * dt
        if (p.drag) {
          p.vx *= Math.pow(p.drag, dt)
          p.vy *= Math.pow(p.drag, dt)
        }
        p.rot += p.vr * dt
        const q = age / p.life
        const a = Math.max(0, (1 - q) * p.a0)
        const r = Math.max(0.2, p.r + p.grow * age * (p.shape === 'ring' || p.shape === 'puff' ? 16.67 : 1) * (p.grow < 0 ? 1 : 1))
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        if (p.add) ctx.globalCompositeOperation = 'lighter'
        ctx.fillStyle = style(p.c, a)
        ctx.strokeStyle = style(p.c, a)
        if (p.shape === 'dot') {
          ctx.beginPath()
          ctx.arc(0, 0, p.grow < 0 ? r * (1 - q) : r * (p.life < 600 ? 0.4 + (1 - q) * 0.6 : 1), 0, 6.2832)
          ctx.fill()
        } else if (p.shape === 'puff') {
          ctx.beginPath()
          ctx.arc(0, 0, r, 0, 6.2832)
          ctx.fill()
        } else if (p.shape === 'ring') {
          ctx.lineWidth = 1.5
          ctx.beginPath()
          ctx.arc(0, 0, r, 0, 6.2832)
          ctx.stroke()
        } else if (p.shape === 'sq') {
          ctx.fillRect(-r / 2, -r / 2, r, r)
        } else if (p.shape === 'star') {
          star(r)
          ctx.fill()
        } else if (p.shape === 'heart') {
          heart(r)
          ctx.fill()
        } else if (p.shape === 'cross') {
          const s = r * Math.sin(Math.min(1, q * 2) * 3.14159) // grows, then goes
          ctx.lineWidth = 1.6
          ctx.beginPath()
          ctx.moveTo(-s, 0)
          ctx.lineTo(s, 0)
          ctx.moveTo(0, -s)
          ctx.lineTo(0, s)
          ctx.stroke()
        } else if (p.shape === 'line') {
          ctx.lineWidth = 1.8
          ctx.lineCap = 'round'
          ctx.beginPath()
          ctx.moveTo(0, 0)
          ctx.lineTo(r, 0)
          ctx.stroke()
        } else if (p.shape === 'emoji') {
          ctx.globalAlpha = a
          ctx.font = `${r}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(p.txt ?? '✨', 0, 0)
        }
        ctx.restore()
      }
      const moving = trail === 'ring' || trail === 'glow' ? Math.abs(mx - fx) > 0.5 || Math.abs(my - fy) > 0.5 || now - moved < 250 : false
      if (parts.length > 0 || line.length > 0 || moving) raf = requestAnimationFrame(draw)
      else last = 0
    }
    const wake = () => {
      if (!raf) raf = requestAnimationFrame(draw)
    }
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || trail === 'none') return
      const now = performance.now()
      mx = (e.clientX - left) * k
      my = (e.clientY - top) * k
      if (fx < -100) {
        fx = mx
        fy = my
        lx = mx
        ly = my
      }
      moved = now
      big = (e.target as HTMLElement | null)?.closest?.('[data-link], a, button') ? 1 : 0
      if (trail === 'comet' || trail === 'ink' || trail === 'laser') line.push({ x: mx, y: my, t: now })
      else if (trail !== 'ring' && trail !== 'glow') spawn(now, Math.hypot(mx - lx, my - ly))
      wake()
    }
    const onDown = (e: PointerEvent) => {
      if (click === 'none' || e.button > 0) return
      mx = (e.clientX - left) * k
      my = (e.clientY - top) * k
      burst(performance.now())
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


/** The screen in front of a page until someone enters it. */
export function EnterGate({ onEnter }: { onEnter: () => void }) {
  const { cfg, reduced } = useBio()
  const kind = cfg.fx.enter
  const text = cfg.fx.enterText || 'click to enter'
  const [typed, setTyped] = useState(kind === 'type' ? '' : text)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (kind !== 'type') return setTyped(text)
    if (reduced) return setTyped(text)
    let i = 0
    setTyped('')
    const id = window.setInterval(() => {
      i++
      setTyped(text.slice(0, i))
      if (i >= text.length) window.clearInterval(id)
    }, 70)
    return () => window.clearInterval(id)
  }, [kind, text, reduced])
  const go = () => {
    if (open) return
    setOpen(true)
    window.setTimeout(onEnter, kind === 'curtain' ? 900 : 650)
  }
  useEffect(() => {
    const key = (e: KeyboardEvent) => (e.key === 'Enter' || e.key === ' ') && go()
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }) // eslint-disable-line react-hooks/exhaustive-deps
  const light = cfg.theme.tone > 55
  const wash = light ? 'rgb(245 245 245 / 0.62)' : 'rgb(0 0 0 / 0.6)'
  return (
    <motion.button
      type="button"
      onClick={go}
      aria-label={text}
      className="absolute inset-0 z-[60] grid cursor-pointer place-items-center border-0 p-0 text-[var(--bio-fg)]"
      style={{ background: kind === 'curtain' ? 'transparent' : wash, backdropFilter: kind === 'curtain' ? undefined : 'blur(26px)', WebkitBackdropFilter: kind === 'curtain' ? undefined : 'blur(26px)' }}
      animate={open && kind !== 'curtain' ? { opacity: 0, backdropFilter: 'blur(0px)' } : { opacity: 1 }}
      transition={{ duration: 0.65, ease: [0.2, 0.8, 0.2, 1] }}
    >
      {kind === 'curtain' && (
        <>
          <motion.span aria-hidden="true" className="absolute inset-y-0 left-0 w-1/2 bg-[var(--bio-bg)]" animate={{ x: open ? '-101%' : 0 }} transition={{ duration: 0.9, ease: [0.7, 0, 0.2, 1] }} />
          <motion.span aria-hidden="true" className="absolute inset-y-0 right-0 w-1/2 bg-[var(--bio-bg)]" animate={{ x: open ? '101%' : 0 }} transition={{ duration: 0.9, ease: [0.7, 0, 0.2, 1] }} />
        </>
      )}
      <motion.span className="relative text-[0.95rem] tracking-[0.32em] uppercase" animate={open ? { opacity: 0, y: -8 } : reduced ? undefined : { opacity: [0.45, 1, 0.45] }} transition={open ? { duration: 0.3 } : { duration: 2.4, repeat: Infinity }}>
        {typed}
        {kind === 'type' && <span aria-hidden="true" style={{ animation: 'bio-blink 1s steps(1) infinite' }}>|</span>}
      </motion.span>
    </motion.button>
  )
}

export { AnimatePresence }
