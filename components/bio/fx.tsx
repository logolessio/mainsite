'use client'

import { AnimatePresence, motion, useMotionTemplate, useTransform } from 'framer-motion'
import { type RefObject, useEffect, useRef, useState } from 'react'
import { type BioConfig, type CursorTrail } from '@/lib/bio'
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

type Pt = { x: number; y: number; t: number; vx?: number; vy?: number; r?: number }

/** What follows the pointer: dots, a comet, a ring, sparks or ink. Drawn on one canvas that stops working the moment nothing is moving. */
export function CursorTrailLayer({ rootRef, kind }: { rootRef: RefObject<HTMLDivElement | null>; kind: CursorTrail }) {
  const { cfg } = useBio()
  const cv = useRef<HTMLCanvasElement>(null)
  const ink = cfg.theme.tone > 55 ? '0,0,0' : '255,255,255'
  useEffect(() => {
    const root = rootRef.current
    const c = cv.current
    if (!root || !c || kind === 'none') return
    const ctx = c.getContext('2d')
    if (!ctx) return
    let w = 0
    let h = 0
    let left = 0
    let top = 0
    const resize = () => {
      const r = root.getBoundingClientRect()
      left = r.left
      top = r.top
      w = r.width
      h = r.height
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      c.width = Math.round(w * dpr)
      c.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(root)
    const pts: Pt[] = []
    let mx = -200
    let my = -200
    let rx = -200
    let ry = -200
    let big = 0
    let raf = 0
    let moved = 0
    const LIFE = kind === 'ink' ? 800 : kind === 'comet' ? 520 : kind === 'dots' ? 420 : 900
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      mx = e.clientX - left
      my = e.clientY - top
      moved = performance.now()
      const over = (e.target as HTMLElement | null)?.closest?.('[data-link], a, button')
      big = over ? 1 : 0
      if (kind === 'spark') for (let i = 0; i < 2; i++) pts.push({ x: mx, y: my, t: performance.now(), vx: (Math.random() - 0.5) * 2.4, vy: -Math.random() * 1.6 - 0.2, r: Math.random() * 1.6 + 0.8 })
      else if (kind !== 'ring') pts.push({ x: mx, y: my, t: performance.now() })
      if (!raf) raf = requestAnimationFrame(draw)
    }
    const draw = (now: number) => {
      raf = 0
      ctx.clearRect(0, 0, w, h)
      while (pts.length && now - pts[0].t > LIFE) pts.shift()
      if (kind === 'dots') {
        pts.forEach((p) => {
          const a = 1 - (now - p.t) / LIFE
          ctx.fillStyle = `rgba(${ink},${a * 0.7})`
          ctx.beginPath()
          ctx.arc(p.x, p.y, 1 + a * 3.2, 0, 6.283)
          ctx.fill()
        })
      } else if (kind === 'comet' || kind === 'ink') {
        for (let i = 1; i < pts.length; i++) {
          const a = 1 - (now - pts[i].t) / LIFE
          ctx.strokeStyle = `rgba(${ink},${a * (kind === 'ink' ? 0.5 : 0.85)})`
          ctx.lineWidth = Math.max(0.5, a * (kind === 'ink' ? 10 : 4.5))
          ctx.lineCap = 'round'
          ctx.beginPath()
          ctx.moveTo(pts[i - 1].x, pts[i - 1].y)
          ctx.lineTo(pts[i].x, pts[i].y)
          ctx.stroke()
        }
      } else if (kind === 'spark') {
        pts.forEach((p) => {
          const a = 1 - (now - p.t) / LIFE
          p.x += p.vx ?? 0
          p.y += (p.vy ?? 0) + (1 - a) * 0.9
          ctx.fillStyle = `rgba(${ink},${a})`
          ctx.fillRect(p.x, p.y, (p.r ?? 1) * (0.6 + a), (p.r ?? 1) * (0.6 + a))
        })
      } else if (kind === 'ring') {
        rx += (mx - rx) * 0.16
        ry += (my - ry) * 0.16
        const rad = 16 + big * 14
        ctx.strokeStyle = `rgba(${ink},${0.55 + big * 0.3})`
        ctx.lineWidth = 1.3
        ctx.beginPath()
        ctx.arc(rx, ry, rad, 0, 6.283)
        ctx.stroke()
      }
      const busy = pts.length > 0 || (kind === 'ring' && (Math.abs(mx - rx) > 0.4 || Math.abs(my - ry) > 0.4)) || now - moved < 200
      if (busy) raf = requestAnimationFrame(draw)
    }
    root.addEventListener('pointermove', onMove)
    return () => {
      root.removeEventListener('pointermove', onMove)
      ro.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [kind, ink, rootRef])
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
