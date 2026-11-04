'use client'

import './bio.css'
import { useMotionValue, useScroll, useSpring } from 'framer-motion'
import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMotionPrefs } from '@/hooks/use-motion-prefs'
import { type BioBlock, isLight } from '@/lib/bio'
import { BioBackground, BioFilm } from './background'
import { fontClass } from './bits'
import { MusicPlayer } from './audio'
import { BioProvider, type BioMode, type BioPageData } from './context'
import { cursorVars, CursorTrailLayer, EnterGate, Spotlight } from './fx'
import { Aura, Bento, Poster, Split, Stack } from './layouts-a'
import { Chapters, Index, Orbit, Reel, Terminal } from './layouts-b'

const LAYOUT_VIEWS = { aura: Aura, split: Split, poster: Poster, bento: Bento, stack: Stack, orbit: Orbit, index: Index, terminal: Terminal, chapters: Chapters, reel: Reel } as const

const gray = (tone: number, a = 1) => {
  const v = Math.round((Math.max(0, Math.min(100, tone)) / 100) * 255)
  return a >= 1 ? `rgb(${v} ${v} ${v})` : `rgb(${v} ${v} ${v} / ${a})`
}

/**
 * A link-in-bio page: the background, the film over it, the cursor and the layout, in one box that scrolls on its own (so the same page works as the full
 * screen page, as the editor's preview and as a small moving picture on the home page). Everything that moves against the scroll reads one smoothed scroll
 * position, so the whole page eases together.
 */
export function BioPage({ data, mode = 'live', className, style }: { data: BioPageData; mode?: BioMode; className?: string; style?: CSSProperties }) {
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
  const onMove = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      const r = root.current?.getBoundingClientRect()
      if (!r) return
      mx.set(((e.clientX - r.left) / r.width - 0.5) * 2)
      my.set(((e.clientY - r.top) / r.height - 0.5) * 2)
    },
    [mx, my],
  )

  // the small moving picture drifts down the page and back by itself
  useEffect(() => {
    if (mode !== 'mini' || reduced) return
    const el = scroller.current
    if (!el) return
    let raf = 0
    const t0 = performance.now() + Math.random() * 4000
    const tick = (now: number) => {
      const max = el.scrollHeight - el.clientHeight
      if (max > 0) el.scrollTop = ((Math.sin((now - t0) / 3200 - 1.2) + 1) / 2) * max
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [mode, reduced])

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
  const items = useMemo(() => {
    const visible = blocks.filter((b: BioBlock) => b.t !== 'social' && !('hidden' in b && b.hidden))
    const pinned = visible.filter((b) => b.t === 'link' && b.pin)
    return [...pinned, ...visible.filter((b) => !(b.t === 'link' && b.pin))]
  }, [blocks])
  const socials = useMemo(() => blocks.filter((b): b is Extract<BioBlock, { t: 'social' }> => b.t === 'social' && !b.hidden), [blocks])

  const light = isLight(cfg.theme.tone)
  const fgTone = light ? 4 : 97
  const fgRgb = light ? '10 10 10' : '247 247 247'
  const cv = cursorVars(cfg)
  const vars = {
    '--bio-bg': gray(cfg.theme.tone),
    '--bio-fg': gray(fgTone),
    '--bio-fg-rgb': fgRgb,
    '--bio-mute': `rgb(${fgRgb} / 0.58)`,
    '--bio-line': `rgb(${fgRgb} / ${light ? 0.2 : 0.16})`,
    '--bio-soft': `rgb(${fgRgb} / ${light ? 0.06 : 0.07})`,
    '--bio-r': `${cfg.theme.radius}px`,
    ...cv,
    ...style,
  } as CSSProperties
  const Layout = LAYOUT_VIEWS[cfg.layout as keyof typeof LAYOUT_VIEWS] ?? Aura
  const gate = !entered && mode !== 'mini' && cfg.fx.enter !== 'none'
  const trail = canHover && mode !== 'mini' && cfg.cursor.trail !== 'none'

  return (
    <BioProvider value={{ data, cfg, mode, sy, px, py, level, reduced, scroller, entered, track, items, socials }}>
      <div
        ref={root}
        className={`bio-root ${fontClass(cfg.theme.font)} ${className ?? ''}`}
        style={vars}
        data-fixed={mode === 'live' ? 1 : undefined}
        data-mini={mode === 'mini' ? 1 : undefined}
        data-light={light ? 1 : undefined}
        data-btn={cfg.theme.buttons}
        data-size={cfg.theme.size}
        data-reveal={reduced ? 'none' : cfg.fx.reveal}
        data-paused={gate ? 1 : undefined}
        data-cur={Object.keys(cv).length ? 1 : undefined}
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
        <MusicPlayer level={level} />
        {gate && <EnterGate onEnter={() => setEntered(true)} />}
      </div>
    </BioProvider>
  )
}
