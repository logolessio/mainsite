'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { GlassSurface } from '@/components/glass/glass'
import type { Face } from '@/lib/fonts'

const ITEM = 176

/**
 * A dial of typefaces. Every face sits in one long row under a lens of glass; turn it by dragging, the arrow buttons, the arrow keys, or
 * a sideways scroll (a trackpad swipe, or Shift and the wheel), and whatever stops under the lens is chosen. A plain up and down scroll
 * with the wheel still scrolls the page: the dial never holds on to it. The faces fall away in size and strength with their distance from the lens, like the numbers on a wheel.
 */
export function FontDial({ faces, value, onChange, label }: { faces: Face[]; value: string | null; onChange: (id: string) => void; label: string }) {
  const box = useRef<HTMLDivElement>(null)
  const items = useRef<(HTMLButtonElement | null)[]>([])
  const [pad, setPad] = useState(0)
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null)
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null)
  const quiet = useRef(false) // true while the dial is being moved by code (so that does not count as a choice)
  const idx = Math.max(0, faces.findIndex((f) => f.id === value))

  // the room either side, so the first and last faces can reach the lens
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(() => setPad(Math.max(0, (el.clientWidth - ITEM) / 2)))
    ro.observe(el)
    setPad(Math.max(0, (el.clientWidth - ITEM) / 2))
    return () => ro.disconnect()
  }, [])

  // how far each face is from the lens, written straight to the elements (no React render per frame)
  const paint = useCallback(() => {
    const el = box.current
    if (!el) return
    const mid = el.scrollLeft / ITEM
    items.current.forEach((b, i) => {
      if (!b) return
      const d = Math.min(Math.abs(i - mid), 3.4)
      b.style.setProperty('--d', d.toFixed(3))
    })
  }, [])

  const goTo = useCallback((i: number, smooth: boolean) => {
    const el = box.current
    if (!el) return
    quiet.current = !smooth
    el.scrollTo({ left: Math.max(0, Math.min(faces.length - 1, i)) * ITEM, behavior: smooth ? 'smooth' : 'instant' })
  }, [faces.length])

  // put the dial on the current choice when it appears or the list changes
  useLayoutEffect(() => {
    goTo(idx, false)
    paint()
    const t = setTimeout(() => (quiet.current = false), 60)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pad, faces])

  const onScroll = () => {
    paint()
    if (quiet.current) return
    if (settle.current) clearTimeout(settle.current)
    settle.current = setTimeout(() => {
      const el = box.current
      if (!el || drag.current) return
      const i = Math.max(0, Math.min(faces.length - 1, Math.round(el.scrollLeft / ITEM)))
      if (faces[i] && faces[i].id !== value) onChange(faces[i].id)
    }, 140)
  }

  // a sideways scroll turns the dial; an up and down scroll is left alone, so the page keeps scrolling under the pointer
  useEffect(() => {
    const el = box.current
    if (!el) return
    const wheel = (e: WheelEvent) => {
      const sideways = e.shiftKey ? e.deltaY || e.deltaX : Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : 0
      if (!sideways) return
      e.preventDefault()
      quiet.current = false
      el.scrollLeft += sideways
    }
    el.addEventListener('wheel', wheel, { passive: false })
    return () => el.removeEventListener('wheel', wheel)
  }, [])

  const step = (by: number) => {
    quiet.current = false
    goTo(Math.round((box.current?.scrollLeft ?? 0) / ITEM) + by, true)
  }

  const down = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = box.current!
    quiet.current = false
    drag.current = { x: e.clientX, left: el.scrollLeft, moved: false }
  }
  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d) return
    const el = box.current!
    if (!d.moved && Math.abs(e.clientX - d.x) > 4) {
      d.moved = true
      el.setPointerCapture(e.pointerId)
      el.style.scrollSnapType = 'none'
    }
    if (d.moved) el.scrollLeft = d.left - (e.clientX - d.x)
  }
  const up = () => {
    const d = drag.current
    drag.current = null
    const el = box.current
    if (!el || !d?.moved) return
    el.style.scrollSnapType = ''
    goTo(Math.round(el.scrollLeft / ITEM), true)
  }

  return (
    <div className="relative">
      {/* the lens the dial turns under: behind the faces, so the one in the lens is seen through the glass */}
      <div aria-hidden="true" className="pointer-events-none absolute top-1/2 left-1/2 -ml-[92px] -translate-y-1/2" style={{ width: 184, height: 124 }}>
        <GlassSurface lens flat radius={30} className="size-full" tint="linear-gradient(180deg, rgb(255 255 255 / 0.1), rgb(255 255 255 / 0.03))" />
      </div>
      <div
        ref={box}
        role="listbox"
        aria-label={label}
        tabIndex={0}
        onScroll={onScroll}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
            e.preventDefault()
            quiet.current = false
            goTo(Math.round((box.current?.scrollLeft ?? 0) / ITEM) + (e.key === 'ArrowRight' ? 1 : -1), true)
          }
        }}
        className="no-scrollbar relative z-10 flex h-[148px] cursor-grab snap-x snap-mandatory overflow-x-auto overflow-y-hidden outline-none select-none active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-paper/40 [mask-image:linear-gradient(to_right,transparent,#000_16%,#000_84%,transparent)]"
      >
        <div aria-hidden="true" className="shrink-0" style={{ width: pad }} />
        {faces.map((f, i) => (
          <button
            key={f.id}
            ref={(el) => {
              items.current[i] = el
            }}
            type="button"
            role="option"
            aria-selected={f.id === value}
            tabIndex={-1}
            onClick={() => {
              if (drag.current?.moved) return
              quiet.current = false
              goTo(i, true)
            }}
            style={{ width: ITEM, ['--d' as string]: Math.min(Math.abs(i - idx), 3.4) }}
            className="flex shrink-0 snap-center flex-col items-center justify-center gap-2 rounded-none px-2 [opacity:calc(1-var(--d)*0.27)] [scale:calc(1-var(--d)*0.1)] transition-[opacity,scale] duration-150"
          >
            <span className="text-[3.1rem] leading-none text-paper" style={{ fontFamily: `var(${f.var}), ui-sans-serif, system-ui, sans-serif`, fontWeight: f.kind === 'mono' ? 500 : 400 }} aria-hidden="true">
              Aa
            </span>
            <span className="max-w-full truncate text-[12.5px] text-paper/60">{f.label}</span>
          </button>
        ))}
        <div aria-hidden="true" className="shrink-0" style={{ width: pad }} />
      </div>
      <button type="button" onClick={() => step(-1)} disabled={idx <= 0} aria-label="Previous typeface" className="absolute top-1/2 left-3 z-20 grid size-9 -translate-y-1/2 place-items-center rounded-pill border border-line-strong bg-ink/70 text-paper/80 transition-colors hover:bg-white/10 hover:text-paper disabled:opacity-30">
        <ChevronLeft aria-hidden="true" className="size-4" />
      </button>
      <button type="button" onClick={() => step(1)} disabled={idx >= faces.length - 1} aria-label="Next typeface" className="absolute top-1/2 right-3 z-20 grid size-9 -translate-y-1/2 place-items-center rounded-pill border border-line-strong bg-ink/70 text-paper/80 transition-colors hover:bg-white/10 hover:text-paper disabled:opacity-30">
        <ChevronRight aria-hidden="true" className="size-4" />
      </button>
    </div>
  )
}

export const DIAL_ITEM = ITEM
