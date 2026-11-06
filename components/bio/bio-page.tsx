'use client'

import './bio.css'
import { useMotionValue, useScroll, useSpring } from 'framer-motion'
import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMotionPrefs } from '@/hooks/use-motion-prefs'
import { type BioBlock, hexLum, hexRgb, isLive, pageLight } from '@/lib/bio'
import { BioBackground, BioFilm } from './background'
import { fontClass } from './bits'
import { MusicPlayer } from './audio'
import { type Arrange, BioProvider, type BioMode, type BioPageData, type EditPart } from './context'
import { cursorVars, CursorTrailLayer, EnterGate, Spotlight } from './fx'
import { Canvas } from './canvas'
import { Classic, Card, Side } from './layouts-c'
import { Corner } from './corner'

const LAYOUT_VIEWS = { classic: Classic, card: Card, side: Side, canvas: Canvas } as const

const gray = (tone: number, a = 1) => {
  const v = Math.round((Math.max(0, Math.min(100, tone)) / 100) * 255)
  return a >= 1 ? `rgb(${v} ${v} ${v})` : `rgb(${v} ${v} ${v} / ${a})`
}

/**
 * A link-in-bio page: the background, the film over it, the cursor and the layout, in one box that scrolls on its own (so the same page works as the full
 * screen page, as the editor's preview and as a small moving picture on the home page). Everything that moves against the scroll reads one smoothed scroll
 * position, so the whole page eases together.
 */
export function BioPage({ data, mode = 'live', className, style, still = false, arrange, onPart }: { data: BioPageData; mode?: BioMode; className?: string; style?: CSSProperties; still?: boolean; arrange?: Arrange; onPart?: (part: EditPart) => void }) {
  const cfg = data.config
  const { reduced, canHover } = useMotionPrefs()
  const root = useRef<HTMLDivElement>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const [entered, setEntered] = useState(mode === 'mini' || cfg.fx.enter === 'none')
  useEffect(() => setEntered(mode === 'mini' || cfg.fx.enter === 'none'), [cfg.fx.enter, mode])

  // scroll and pointer, smoothed
  const { scrollY } = useScroll({ container: scroller })
  const sy = useSpring(scrollY, { stiffness: 130, damping: 26, mass: 0.35, restDelta: 0.2 })
  const level = useMotionValue(0)
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const px = useSpring(mx, { stiffness: 90, damping: 22, mass: 0.6 })
  const py = useSpring(my, { stiffness: 90, damping: 22, mass: 0.6 })
  const box = useRef<{ r: DOMRect; at: number } | null>(null)
  const onMove = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      const now = performance.now()
      if (!box.current || now - box.current.at > 500) {
        const rr = root.current?.getBoundingClientRect()
        if (rr) box.current = { r: rr, at: now }
      }
      const r = box.current?.r
      if (!r) return
      mx.set(((e.clientX - r.left) / r.width - 0.5) * 2)
      my.set(((e.clientY - r.top) / r.height - 0.5) * 2)
    },
    [mx, my],
  )

  // the small moving picture drifts down the page and back by itself, but only while it is on screen (and not at all if it was asked to stand still)
  useEffect(() => {
    if (mode !== 'mini' || reduced || still) return
    const el = scroller.current
    if (!el) return
    let raf = 0
    let on = false
    const t0 = performance.now() + Math.random() * 4000
    const tick = (now: number) => {
      raf = 0
      if (!on) return
      const max = el.scrollHeight - el.clientHeight
      if (max > 0) el.scrollTop = ((Math.sin((now - t0) / 3200 - 1.2) + 1) / 2) * max
      raf = requestAnimationFrame(tick)
    }
    const io = new IntersectionObserver(([e]) => {
      on = e.isIntersecting
      if (on && !raf) raf = requestAnimationFrame(tick)
    })
    io.observe(el)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [mode, reduced, still])

  // one count per visit, and one per link press (only on the real page)
  const sent = useRef(false)
  useEffect(() => {
    if (mode !== 'live' || sent.current) return
    sent.current = true
    try {
      const k = `bio-seen:${data.handle}`
      if (sessionStorage.getItem(k)) return
      sessionStorage.setItem(k, '1')
    } catch {
      /* a private window: counted every time */
    }
    navigator.sendBeacon?.('/api/bio/hit', new Blob([JSON.stringify({ h: data.handle, k: 'view' })], { type: 'application/json' }))
  }, [mode, data.handle])
  const track = useCallback(
    (_k: 'click', id: string) => {
      if (mode !== 'live') return
      navigator.sendBeacon?.('/api/bio/hit', new Blob([JSON.stringify({ h: data.handle, k: 'click', b: id })], { type: 'application/json' }))
    },
    [mode, data.handle],
  )

  const blocks = cfg.blocks
  // Links can be set to appear and disappear on a date, so the page checks the clock now and then.
  const scheduled = blocks.some((b) => b.t === 'link' && (b.from || b.until))
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!scheduled) return
    setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(t)
  }, [scheduled])
  const items = useMemo(() => {
    // in the editor preview every link stays, so it can still be edited; on the live page the schedule applies
    const visible = blocks.filter((b: BioBlock) => b.t !== 'social' && !('hidden' in b && b.hidden) && (mode === 'live' ? isLive(b, now) : true))
    const pinned = visible.filter((b) => b.t === 'link' && b.pin)
    return [...pinned, ...visible.filter((b) => !(b.t === 'link' && b.pin))]
  }, [blocks, mode, now])
  const socials = useMemo(() => blocks.filter((b): b is Extract<BioBlock, { t: 'social' }> => b.t === 'social' && !b.hidden), [blocks])

  const custom = cfg.colors.on
  const light = pageLight(cfg)
  const fgTone = light ? 4 : 97
  const fgRgb = custom ? hexRgb(cfg.colors.text).join(' ') : light ? '10 10 10' : '247 247 247'
  const accent = custom ? cfg.colors.accent : gray(fgTone)
  const accent2 = custom ? cfg.colors.accent2 : gray(fgTone)
  const accentRgb = custom ? hexRgb(cfg.colors.accent).join(' ') : fgRgb
  const accent2Rgb = custom ? hexRgb(cfg.colors.accent2).join(' ') : fgRgb
  const cv = cursorVars(cfg)
  const vars = {
    '--bio-bg': custom ? cfg.colors.bg : gray(cfg.theme.tone),
    '--bio-fg': custom ? cfg.colors.text : gray(fgTone),
    '--bio-fg-rgb': fgRgb,
    '--bio-accent': accent,
    '--bio-accent-rgb': accentRgb,
    '--bio-accent2': accent2,
    '--bio-accent2-rgb': accent2Rgb,
    /** the ink on top of an accent: black on a light accent, white on a dark one */
    '--bio-on-accent': custom ? (hexLum(cfg.colors.accent) > 0.5 ? '#0a0a0a' : '#ffffff') : gray(light ? 97 : 4),
    '--bio-mute': `rgb(${fgRgb} / 0.58)`,
    '--bio-line': `rgb(${fgRgb} / ${light ? 0.2 : 0.16})`,
    '--bio-soft': `rgb(${fgRgb} / ${light ? 0.06 : 0.07})`,
    '--bio-r': `${cfg.theme.radius}px`,
    ...cv,
    ...style,
  } as CSSProperties
  const Layout = LAYOUT_VIEWS[cfg.layout as keyof typeof LAYOUT_VIEWS] ?? Classic
  const gate = !entered && mode !== 'mini' && cfg.fx.enter !== 'none'
  const trail = canHover && mode !== 'mini' && cfg.cursor.trail !== 'none'

  return (
    <BioProvider value={{ data, cfg, mode, sy, px, py, level, reduced, scroller, entered, track, items, socials, arrange: mode === 'preview' ? arrange : undefined, onPart: mode === 'preview' ? onPart : undefined }}>
      <div
        ref={root}
        className={`bio-root ${fontClass(cfg.theme.font)} ${className ?? ''}`}
        style={vars}
        data-fixed={mode === 'live' ? 1 : undefined}
        data-mini={mode === 'mini' ? 1 : undefined}
        data-light={light ? 1 : undefined}
        data-custom={custom ? 1 : undefined}
        data-btn={cfg.theme.buttons}
        data-size={cfg.theme.size}
        data-reveal={reduced ? 'none' : cfg.fx.reveal}
        data-paused={gate ? 1 : undefined}
        data-cur={Object.keys(cv).length ? 1 : undefined}
        data-edit={mode === 'preview' && onPart ? 1 : undefined}
        data-layout={cfg.layout}
        data-font={cfg.theme.font}
        onPointerMove={mode === 'mini' ? undefined : onMove}
      >
        <BioBackground />
        {cfg.fx.spotlight && canHover && mode !== 'mini' && <Spotlight />}
        <BioFilm />
        {trail && <CursorTrailLayer rootRef={root} kind={cfg.cursor.trail} />}
        <div ref={scroller} className="bio-scroll" style={gate ? { overflow: 'hidden' } : undefined}>
          <Layout />
        </div>
        <Corner />
        <MusicPlayer level={level} />
        {gate && <EnterGate onEnter={() => setEntered(true)} />}
      </div>
    </BioProvider>
  )
}
