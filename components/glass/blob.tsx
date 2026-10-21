'use client'

import { AnimatePresence, motion, useMotionValue, useSpring, useTransform, useVelocity } from 'framer-motion'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { GlassSurface } from './glass'

// The blobby part of Apple's liquid glass: the piece that shows what is chosen is a lens of glass that lifts out of the bar when you
// touch it, stretches as it travels and settles with a little squash, and a slider's knob swells into a lens under your finger.

const SPRING = { stiffness: 420, damping: 32, mass: 0.85 }
/** How much a lens stretches along its way: more the faster it goes. Returns the two scale values for a lens moving at `v` px per second. */
function useStretch(x: ReturnType<typeof useMotionValue<number>>) {
  const v = useVelocity(x)
  const sv = useSpring(v, { stiffness: 300, damping: 40 })
  const scaleX = useTransform(sv, [-2400, 0, 2400], [1.22, 1, 1.22])
  const scaleY = useTransform(sv, [-2400, 0, 2400], [0.88, 1, 0.88])
  return { scaleX, scaleY }
}

export type BlobItem = { id: string; label?: React.ReactNode; icon?: React.ReactNode; aria: string; className?: string }

/**
 * A row of choices on a bar of glass, with the chosen one held by a lens that glides, stretches and can be dragged. Used for the site's
 * filters and tabs, and anywhere a choice slides.
 */
export function BlobTabs({
  items,
  value,
  onChange,
  className,
  itemClassName,
  bar = true,
  height = 44,
  lensTint,
  ariaLabel,
}: {
  items: BlobItem[]
  value: string
  onChange: (id: string) => void
  className?: string
  itemClassName?: string
  /** draw the bar of glass behind (false when the tabs already sit on a glass surface) */
  bar?: boolean
  height?: number
  lensTint?: string
  ariaLabel: string
}) {
  const wrap = useRef<HTMLDivElement>(null)
  const refs = useRef<Record<string, HTMLButtonElement | null>>({})
  const x = useMotionValue(0)
  const w = useMotionValue(0)
  const sx = useSpring(x, SPRING)
  const sw = useSpring(w, SPRING)
  const { scaleX, scaleY } = useStretch(sx)
  const [lift, setLift] = useState(false)
  const [ready, setReady] = useState(false)
  const drag = useRef<{ id: number; startX: number; moved: boolean } | null>(null)

  const place = useCallback(
    (instant = false) => {
      const el = refs.current[value]
      if (!el) return
      x.set(el.offsetLeft)
      w.set(el.offsetWidth)
      if (instant) {
        sx.jump(el.offsetLeft)
        sw.jump(el.offsetWidth)
      }
    },
    [value, x, w, sx, sw],
  )

  useLayoutEffect(() => {
    place(!ready)
    setReady(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, items.length])

  useEffect(() => {
    if (!wrap.current) return
    const ro = new ResizeObserver(() => place(true))
    ro.observe(wrap.current)
    return () => ro.disconnect()
  }, [place])

  const nearest = (clientX: number) => {
    const box = wrap.current!.getBoundingClientRect()
    let best = items[0].id
    let bestD = Infinity
    for (const it of items) {
      const el = refs.current[it.id]
      if (!el) continue
      const c = box.left + el.offsetLeft + el.offsetWidth / 2
      const d = Math.abs(c - clientX)
      if (d < bestD) {
        bestD = d
        best = it.id
      }
    }
    return best
  }

  const down = (e: React.PointerEvent) => {
    drag.current = { id: e.pointerId, startX: e.clientX, moved: false }
    setLift(true)
  }
  const move = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    if (!d.moved && Math.abs(e.clientX - d.startX) > 5) {
      d.moved = true
      wrap.current?.setPointerCapture(e.pointerId)
    }
    if (d.moved) {
      const box = wrap.current!.getBoundingClientRect()
      const cur = w.get()
      x.set(Math.max(0, Math.min(box.width - cur, e.clientX - box.left - cur / 2)))
    }
  }
  const up = (e: React.PointerEvent) => {
    const d = drag.current
    drag.current = null
    setLift(false)
    if (d?.moved) {
      const id = nearest(e.clientX)
      if (id !== value) onChange(id)
      else place()
    }
  }

  const inner = (
    <div
      ref={wrap}
      role="tablist"
      aria-label={ariaLabel}
      className={cn('relative inline-flex items-center', bar ? 'p-1.5' : '')}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      style={{ height: bar ? height + 12 : height }}
    >
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-0 z-0"
        style={{ x: sx, width: sw, height, y: '-50%', scaleX, scaleY, opacity: ready ? 1 : 0 }}
      >
        <motion.div className="size-full" animate={{ scale: lift ? 1.16 : 1, y: lift ? -2 : 0 }} transition={{ type: 'spring', stiffness: 520, damping: 26 }}>
          <GlassSurface lens lifted={lift} tint={lensTint} className="size-full" />
        </motion.div>
      </motion.div>
      {items.map((it) => {
        const on = it.id === value
        return (
          <button
            key={it.id}
            ref={(el) => {
              refs.current[it.id] = el
            }}
            type="button"
            role="tab"
            aria-selected={on}
            aria-label={it.aria}
            onClick={() => onChange(it.id)}
            style={{ height }}
            className={cn('relative z-10 inline-flex items-center justify-center gap-2 rounded-full px-5 text-[15px] transition-colors duration-300 outline-none focus-visible:ring-2 focus-visible:ring-paper/60', on ? 'text-paper' : 'text-paper/55 hover:text-paper/90', itemClassName, it.className)}
          >
            {it.icon}
            {it.label}
          </button>
        )
      })}
    </div>
  )

  if (!bar) return <div className={className}>{inner}</div>
  return (
    <GlassSurface className={cn('inline-block', className)}>
      {inner}
    </GlassSurface>
  )
}

/**
 * A slider whose knob is a lens: at rest a small capsule on the track, and under the pointer it swells and lifts, bending the track
 * beneath it.
 */
export function GlassSlider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  ariaLabel,
  className,
}: {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  ariaLabel: string
  className?: string
}) {
  const track = useRef<HTMLDivElement>(null)
  const [down, setDown] = useState(false)
  const [width, setWidth] = useState(0)
  const pct = (value - min) / (max - min)
  const kw = down ? 64 : 42
  const kh = down ? 40 : 26
  const px = useMotionValue(0)
  const spx = useSpring(px, { stiffness: 900, damping: 50 })
  const { scaleX, scaleY } = useStretch(spx)

  useEffect(() => {
    const el = track.current
    if (!el) return
    const ro = new ResizeObserver(() => setWidth(el.offsetWidth))
    ro.observe(el)
    setWidth(el.offsetWidth)
    return () => ro.disconnect()
  }, [])
  useEffect(() => {
    px.set(pct * width)
  }, [pct, width, px])

  const set = (clientX: number) => {
    const r = track.current!.getBoundingClientRect()
    const raw = min + ((clientX - r.left) / r.width) * (max - min)
    const snapped = Math.round(raw / step) * step
    onChange(Math.max(min, Math.min(max, snapped)))
  }

  return (
    <div
      ref={track}
      role="slider"
      tabIndex={0}
      aria-label={ariaLabel}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      className={cn('relative h-11 w-full cursor-pointer touch-none outline-none select-none focus-visible:[&>.knob]:ring-2', className)}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        setDown(true)
        set(e.clientX)
      }}
      onPointerMove={(e) => down && set(e.clientX)}
      onPointerUp={() => setDown(false)}
      onPointerCancel={() => setDown(false)}
      onKeyDown={(e) => {
        const d = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? step : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -step : 0
        if (d) {
          e.preventDefault()
          onChange(Math.max(min, Math.min(max, value + d)))
        } else if (e.key === 'Home') onChange(min)
        else if (e.key === 'End') onChange(max)
      }}
    >
      <div className="absolute top-1/2 right-0 left-0 h-[7px] -translate-y-1/2 overflow-hidden rounded-full bg-white/12 shadow-[inset_0_1px_2px_rgb(0_0_0/0.5)]">
        <motion.div className="h-full rounded-full bg-paper/90" style={{ width: spx }} />
      </div>
      <motion.div className="knob pointer-events-none absolute top-1/2 left-0 z-10" style={{ x: spx, scaleX, scaleY, y: '-50%' }}>
        <motion.div animate={{ width: kw, height: kh, y: down ? -3 : 0 }} transition={{ type: 'spring', stiffness: 520, damping: 28 }} style={{ marginLeft: -kw / 2 }} className="relative">
          <GlassSurface lens lifted={down} className="size-full" tint="linear-gradient(180deg, rgb(255 255 255 / 0.5), rgb(255 255 255 / 0.2))" />
        </motion.div>
      </motion.div>
    </div>
  )
}

/** A switch whose knob is a lens that stretches wide while you press it and glides across with a squash. */
export function GlassSwitch({ checked, onChange, ariaLabel }: { checked: boolean; onChange: (v: boolean) => void; ariaLabel: string }) {
  const [down, setDown] = useState(false)
  const x = useMotionValue(checked ? 28 : 0)
  const sx = useSpring(x, SPRING)
  const { scaleX, scaleY } = useStretch(sx)
  useEffect(() => x.set(checked ? 28 : 0), [checked, x])
  const kw = down ? 46 : 34
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onPointerDown={() => setDown(true)}
      onPointerUp={() => setDown(false)}
      onPointerLeave={() => setDown(false)}
      onClick={() => onChange(!checked)}
      className="relative inline-block h-[38px] w-[66px] shrink-0 cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-paper/60"
    >
      <span className={cn('absolute inset-0 rounded-full transition-colors duration-500', checked ? 'bg-paper/85' : 'bg-white/12')} style={{ boxShadow: 'inset 0 1px 3px rgb(0 0 0 / 0.45), inset 0 0 0 1px rgb(255 255 255 / 0.08)' }} />
      <motion.span className="absolute top-[2px] left-[2px]" style={{ x: sx, scaleX, scaleY }}>
        <motion.span className="relative block" animate={{ width: kw, height: 34, marginLeft: down && checked ? -12 : 0 }} transition={{ type: 'spring', stiffness: 520, damping: 28 }}>
          <GlassSurface lens lifted={down} className="size-full" tint={checked ? 'linear-gradient(180deg, rgb(255 255 255 / 0.55), rgb(255 255 255 / 0.25))' : undefined} />
        </motion.span>
      </motion.span>
    </button>
  )
}

/**
 * A menu that grows out of the button that opens it, like a drop of glass that spreads, with a lens that slides between the options.
 */
export function GlassMenu<T extends string>({
  value,
  options,
  onChange,
  label,
  className,
  width = 240,
}: {
  value: T
  options: { id: T; label: string; hint?: string }[]
  onChange: (v: T) => void
  label: string
  className?: string
  width?: number
}) {
  const [open, setOpen] = useState(false)
  const [hover, setHover] = useState<T | null>(null)
  const box = useRef<HTMLDivElement>(null)
  const current = options.find((o) => o.id === value)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={box} className={cn('relative inline-block', className)}>
      <GlassSurface shine flat className="inline-block">
        <button type="button" aria-haspopup="listbox" aria-expanded={open} aria-label={label} onClick={() => setOpen((o) => !o)} className="relative z-10 flex h-11 items-center gap-3 rounded-full pr-4 pl-5 text-[15px] outline-none focus-visible:ring-2 focus-visible:ring-paper/60">
          <span>{current?.label}</span>
          <motion.svg animate={{ rotate: open ? 180 : 0 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }} width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="m2 4.5 4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </motion.svg>
        </button>
      </GlassSurface>
      <AnimatePresence>
        {open && (
          <motion.div
            role="listbox"
            aria-label={label}
            initial={{ opacity: 0, scale: 0.55, borderRadius: 40 }}
            animate={{ opacity: 1, scale: 1, borderRadius: 26 }}
            exit={{ opacity: 0, scale: 0.7, transition: { duration: 0.16 } }}
            transition={{ type: 'spring', stiffness: 460, damping: 30 }}
            style={{ transformOrigin: 'top left', width }}
            className="absolute top-[calc(100%+10px)] left-0 z-50"
          >
            <GlassSurface radius={26} className="w-full" inner="p-2">
              <div className="relative max-h-72 overflow-y-auto" onPointerLeave={() => setHover(null)}>
                {options.map((o) => {
                  const lit = (hover ?? value) === o.id
                  return (
                    <button
                      key={o.id}
                      role="option"
                      aria-selected={o.id === value}
                      type="button"
                      onPointerEnter={() => setHover(o.id)}
                      onClick={() => {
                        onChange(o.id)
                        setOpen(false)
                      }}
                      className="relative flex h-11 w-full items-center justify-between rounded-[18px] px-4 text-left text-[15px] outline-none"
                    >
                      {lit && <motion.span layoutId={`menu-lens-${label}`} transition={{ type: 'spring', stiffness: 520, damping: 34 }} aria-hidden="true" className="absolute inset-0 rounded-[18px] bg-white/12 shadow-[inset_0_1px_0_rgb(255_255_255/0.25),inset_0_0_0_1px_rgb(255_255_255/0.1)]" />}
                      <span className="relative">{o.label}</span>
                      {o.id === value && <span className="relative text-paper/60">✓</span>}
                    </button>
                  )
                })}
              </div>
            </GlassSurface>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
