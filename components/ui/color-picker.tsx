'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

// ---------- colour maths ----------
type Hsv = { h: number; s: number; v: number } // h 0 to 360, s and v 0 to 1

const clamp = (n: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, n))

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  let h = m[1]
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  const n = Number.parseInt(h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
const rgbToHex = (r: number, g: number, b: number) => `#${[r, g, b].map((x) => Math.round(x).toString(16).padStart(2, '0')).join('')}`

function rgbToHsv(r: number, g: number, b: number): Hsv {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255]
  const max = Math.max(rn, gn, bn)
  const d = max - Math.min(rn, gn, bn)
  let h = 0
  if (d) {
    if (max === rn) h = ((gn - bn) / d) % 6
    else if (max === gn) h = (bn - rn) / d + 2
    else h = (rn - gn) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  return { h, s: max ? d / max : 0, v: max }
}

function hsvToHex({ h, s, v }: Hsv) {
  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]
  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255)
}

const toHsv = (hex: string): Hsv => {
  const rgb = hexToRgb(hex)
  return rgb ? rgbToHsv(...rgb) : { h: 0, s: 0, v: 1 }
}

/** Dragging inside an element: calls back with the pointer as fractions of its width and height, from 0 to 1. */
function useDrag(onMove: (x: number, y: number) => void) {
  const ref = useRef<HTMLDivElement>(null)
  const at = (e: React.PointerEvent) => {
    const r = ref.current?.getBoundingClientRect()
    if (r) onMove(clamp((e.clientX - r.left) / r.width), clamp((e.clientY - r.top) / r.height))
  }
  return {
    ref,
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault()
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      ;(e.currentTarget as HTMLElement).focus()
      at(e)
    },
    onPointerMove: (e: React.PointerEvent) => {
      if ((e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) at(e)
    },
  }
}

const POP_W = 244
const POP_H = 292

/**
 * A colour picker that belongs to the site: a square for how strong and how light, a bar for the hue and a field for the code, in a small window that opens
 * beside the button. It replaces the browser's own colour dialog, which looks like the operating system and cannot be styled. Children are what the
 * button shows (a plus, or nothing when it is filled with the colour); `className` and `style` are the button's.
 */
export function ColorPicker({ value, onChange, label, className, style, children }: { value: string; onChange: (hex: string) => void; label?: string; className?: string; style?: React.CSSProperties; children?: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const pop = useRef<HTMLDivElement>(null)
  // the colour is held as hue, strength and lightness while it is being chosen, so grey (no strength) does not forget which hue it was
  const [hsv, setHsv] = useState<Hsv>(() => toHsv(value))
  const [text, setText] = useState(value)
  const last = useRef(value.toLowerCase())

  // a colour that arrives from outside (a swatch was pressed, or the profile loaded) is taken up
  useEffect(() => {
    const v = value.toLowerCase()
    if (v !== last.current) {
      last.current = v
      setHsv(toHsv(v))
      setText(v)
    }
  }, [value])

  const apply = useCallback(
    (next: Hsv) => {
      setHsv(next)
      const hex = hsvToHex(next)
      last.current = hex
      setText(hex)
      onChange(hex)
    },
    [onChange],
  )

  const place = useCallback(() => {
    const r = btn.current?.getBoundingClientRect()
    if (!r) return
    const vw = window.innerWidth
    const vh = window.innerHeight
    const left = clamp(r.left + r.width / 2 - POP_W / 2, 8, Math.max(8, vw - POP_W - 8), )
    const below = r.bottom + 8 + POP_H <= vh - 8
    setPos({ left, top: below ? r.bottom + 8 : Math.max(8, r.top - 8 - POP_H) })
  }, [])

  useLayoutEffect(() => {
    if (open) place()
  }, [open, place])

  useEffect(() => {
    if (!open) return
    const away = (e: PointerEvent) => {
      const t = e.target as Node
      if (!pop.current?.contains(t) && !btn.current?.contains(t)) setOpen(false)
    }
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setOpen(false)
        btn.current?.focus()
      }
    }
    window.addEventListener('pointerdown', away)
    window.addEventListener('keydown', esc, true)
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('pointerdown', away)
      window.removeEventListener('keydown', esc, true)
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, place])

  const sv = useDrag((x, y) => apply({ ...hsv, s: x, v: 1 - y }))
  const hue = useDrag((x) => apply({ ...hsv, h: x * 360 }))
  const nudge = (e: React.KeyboardEvent, fn: (step: number) => Hsv) => {
    const step = e.shiftKey ? 0.1 : 0.02
    const keys: Record<string, number> = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1 }
    if (!(e.key in keys)) return
    e.preventDefault()
    apply(fn(step * keys[e.key]))
  }

  const hex = hsvToHex(hsv)
  const pure = hsvToHex({ h: hsv.h, s: 1, v: 1 })

  return (
    <>
      <button ref={btn} type="button" aria-haspopup="dialog" aria-expanded={open} aria-label={label ? `Custom colour for ${label}` : 'Custom colour'} onClick={() => setOpen((v) => !v)} className={className} style={style}>
        {children}
      </button>
      {open &&
        pos &&
        createPortal(
          <div
            ref={pop}
            role="dialog"
            aria-label="Pick a colour"
            style={{ left: pos.left, top: pos.top, width: POP_W }}
            className="fixed z-[400] grid gap-3 rounded-card border border-line-strong bg-[#0d0d0f] p-3 shadow-[0_28px_70px_-24px_rgb(0_0_0/0.95)]"
          >
            {/* how strong the colour is across, how light it is down */}
            <div
              {...sv}
              tabIndex={0}
              role="slider"
              aria-label="Strength and lightness"
              aria-valuetext={`Strength ${Math.round(hsv.s * 100)} percent, lightness ${Math.round(hsv.v * 100)} percent`}
              aria-valuenow={Math.round(hsv.s * 100)}
              onKeyDown={(e) => {
                const k = e.key
                if (k === 'ArrowLeft' || k === 'ArrowRight') nudge(e, (d) => ({ ...hsv, s: clamp(hsv.s + d) }))
                else if (k === 'ArrowUp' || k === 'ArrowDown') nudge(e, (d) => ({ ...hsv, v: clamp(hsv.v + d) }))
              }}
              className="relative h-[152px] cursor-crosshair touch-none overflow-hidden rounded-panel outline-none focus-visible:ring-2 focus-visible:ring-paper"
              style={{ background: `linear-gradient(to top,#000,transparent),linear-gradient(to right,#fff,${pure})` }}
            >
              <span aria-hidden="true" className="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgb(0_0_0/0.5),0_2px_8px_rgb(0_0_0/0.6)]" style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, background: hex }} />
            </div>

            {/* the hue */}
            <div
              {...hue}
              tabIndex={0}
              role="slider"
              aria-label="Hue"
              aria-valuemin={0}
              aria-valuemax={360}
              aria-valuenow={Math.round(hsv.h)}
              onKeyDown={(e) => nudge(e, (d) => ({ ...hsv, h: (hsv.h + d * 360 + 360) % 360 }))}
              className="relative h-3.5 cursor-pointer touch-none rounded-full outline-none focus-visible:ring-2 focus-visible:ring-paper"
              style={{ background: 'linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)' }}
            >
              <span aria-hidden="true" className="pointer-events-none absolute top-1/2 size-4.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgb(0_0_0/0.5),0_2px_8px_rgb(0_0_0/0.6)]" style={{ left: `${(hsv.h / 360) * 100}%`, background: pure }} />
            </div>

            {/* the code */}
            <div className="flex items-center gap-2.5">
              <span aria-hidden="true" className="size-9 shrink-0 rounded-tile border border-line-strong" style={{ background: hex }} />
              <input
                value={text}
                spellCheck={false}
                autoComplete="off"
                aria-label="Colour code"
                maxLength={7}
                onChange={(e) => {
                  const t = e.target.value
                  setText(t)
                  const rgb = hexToRgb(t)
                  if (rgb) {
                    const next = rgbToHsv(...rgb)
                    // the typed code is the colour: it is held exactly as typed, not rounded through the square
                    setHsv(next)
                    last.current = rgbToHex(...rgb)
                    onChange(rgbToHex(...rgb))
                  }
                }}
                onBlur={() => setText(hex)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), setText(hex))}
                className={cn('h-9 min-w-0 flex-1 rounded-tile border border-line-strong bg-ink px-3 font-mono text-sm uppercase outline-none transition-colors focus:border-paper/60', !hexToRgb(text) && 'border-signal/60')}
              />
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
