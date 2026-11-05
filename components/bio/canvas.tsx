'use client'

import { type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { type BioBlock, FREE_W, type FreeBox, nameSize, resolveFree } from '@/lib/bio'
import { cn } from '@/lib/utils'
import { Avatar, BlockIcon, BlockView, Divider, Footer, fontClass, Name, Bio } from './bits'
import { Badges } from './card'
import { useBio } from './context'

/** How far apart (in screen pixels) two edges may be and still snap together. */
const SNAP = 6

type Guide = { axis: 'x' | 'y'; at: number }
type Drag = { kind: 'move' | 'e' | 'w' | 'rot'; key: string; sx: number; sy: number; box: FreeBox; unit: number; moved: boolean; cx: number; cy: number; h: number }

/** The canvas layout: a blank page, 390 wide however wide the screen is, where every piece sits exactly where its box says. In the editor each piece can be dragged, resized and turned. */
export function Canvas() {
  const { data, cfg, items, socials, arrange, mode } = useBio()
  const editing = Boolean(arrange)

  const outer = useRef<HTMLElement>(null)
  const world = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [zoom, setZoom] = useState(1) // the world's size on screen over its own size: scale and the editor's own shrinking together
  const [ready, setReady] = useState(false)
  const [height, setHeight] = useState(560)
  const [live, setLive] = useState<{ key: string; box: FreeBox } | null>(null)
  const [guides, setGuides] = useState<Guide[]>([])
  const drag = useRef<Drag | null>(null)

  const base = useMemo(() => resolveFree(cfg, { name: data.name, bio: data.bio, badges: cfg.meta.badges ? (data.badges?.length ?? 0) + (cfg.meta.location ? 1 : 0) : cfg.meta.location ? 1 : 0 }), [cfg, data.name, data.bio, data.badges])
  const boxes = useMemo(() => (live ? { ...base, [live.key]: live.box } : base), [base, live])

  // the pieces, in the order they are listed (what is on top is the z value, then this order)
  const pieces = useMemo(() => {
    const list: { key: string; block?: BioBlock; social?: (typeof socials)[number] }[] = [{ key: 'avatar' }, { key: 'name' }]
    if (data.bio) list.push({ key: 'bio' })
    for (const s of socials) list.push({ key: s.id, social: s })
    for (const b of items) list.push({ key: b.id, block: b })
    return list.filter((p) => boxes[p.key])
  }, [data.bio, socials, items, boxes])

  /* the page scales to the width it has; the height follows the lowest piece */
  const measure = useCallback(() => {
    const o = outer.current
    const w = world.current
    if (!o || !w) return
    const width = o.clientWidth || FREE_W
    setScale(width / FREE_W)
    const r = w.getBoundingClientRect()
    setZoom(r.width > 0 ? r.width / FREE_W : width / FREE_W)
    let low = 0
    w.querySelectorAll<HTMLElement>('[data-fk]').forEach((el) => {
      low = Math.max(low, el.offsetTop + el.offsetHeight)
    })
    setHeight(Math.max(480, Math.ceil(low + (editing ? 200 : 56))))
    setReady(true)
  }, [editing])

  useLayoutEffect(measure, [measure, boxes, pieces.length, cfg.theme.font, cfg.theme.size, cfg.theme.buttons, cfg.theme.radius, cfg.avatar.shape, data.name, data.bio])
  useEffect(() => {
    const o = outer.current
    const w = world.current
    if (!o || !w) return
    const ro = new ResizeObserver(measure)
    ro.observe(o)
    w.querySelectorAll('[data-fk]').forEach((el) => ro.observe(el))
    window.addEventListener('resize', measure)
    void document.fonts?.ready.then(measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [measure, pieces.length])

  /* ---------------------------------------------------------------- editing */
  const lines = useCallback(
    (key: string, box: FreeBox): { box: FreeBox; guides: Guide[] } => {
      const w = world.current
      if (!w || !arrange?.snap) return { box, guides: [] }
      const th = SNAP / (drag.current?.unit ?? 1)
      const mine = w.querySelector<HTMLElement>(`[data-fk="${CSS.escape(key)}"]`)
      const h = mine?.offsetHeight ?? 0
      const xs = [FREE_W / 2, 0, FREE_W]
      const ys: number[] = []
      w.querySelectorAll<HTMLElement>('[data-fk]').forEach((el) => {
        if (el === mine) return
        const k = el.dataset.fk as string
        const o = boxes[k]
        if (!o) return
        xs.push(o.x, o.x + el.offsetWidth / 2, o.x + el.offsetWidth)
        ys.push(o.y, o.y + el.offsetHeight / 2, o.y + el.offsetHeight)
      })
      const out = { ...box }
      let bestX = th + 1
      let bestY = th + 1
      for (const at of xs)
        for (const [mineAt, shift] of [[box.x, 0], [box.x + box.w / 2, box.w / 2], [box.x + box.w, box.w]] as const) {
          const d = Math.abs(at - mineAt)
          if (d < bestX && d <= th) {
            bestX = d
            out.x = at - shift
          }
        }
      for (const at of ys)
        for (const [mineAt, shift] of [[box.y, 0], [box.y + h / 2, h / 2], [box.y + h, h]] as const) {
          const d = Math.abs(at - mineAt)
          if (d < bestY && d <= th) {
            bestY = d
            out.y = at - shift
          }
        }
      return { box: out, guides: guideFor(out, h, xs, ys, th) }
    },
    [arrange?.snap, boxes],
  )

  const down = (e: PointerEvent, key: string, kind: Drag['kind']) => {
    if (!arrange || e.button !== 0) return
    e.stopPropagation()
    const el = (e.currentTarget as HTMLElement).closest<HTMLElement>('[data-fk]')
    const w = world.current
    const box = boxes[key]
    if (!el || !w || !box) return
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    const wr = w.getBoundingClientRect()
    const er = el.getBoundingClientRect()
    drag.current = { kind, key, sx: e.clientX, sy: e.clientY, box: { ...box }, unit: wr.width / FREE_W || 1, moved: false, cx: er.left + er.width / 2, cy: er.top + er.height / 2, h: el.offsetHeight }
    arrange.select(key)
  }

  const move = (e: PointerEvent) => {
    const d = drag.current
    if (!d || !arrange) return
    const dx = (e.clientX - d.sx) / d.unit
    const dy = (e.clientY - d.sy) / d.unit
    if (!d.moved && Math.hypot(dx, dy) * d.unit < 3) return
    d.moved = true
    const r = ((d.box.r ?? 0) * Math.PI) / 180
    if (d.kind === 'move') {
      const next = lines(d.key, { ...d.box, x: d.box.x + dx, y: d.box.y + dy })
      setLive({ key: d.key, box: round(next.box) })
      setGuides(e.altKey ? [] : next.guides)
    } else if (d.kind === 'e' || d.kind === 'w') {
      const along = dx * Math.cos(r) + dy * Math.sin(r)
      const w2 = Math.max(24, d.kind === 'e' ? d.box.w + along : d.box.w - along)
      const delta = w2 - d.box.w
      const next: FreeBox =
        d.kind === 'e'
          ? { ...d.box, w: w2, x: d.box.x + (delta / 2) * (Math.cos(r) - 1), y: d.box.y + (delta / 2) * Math.sin(r) }
          : { ...d.box, w: w2, x: d.box.x - (delta / 2) * (Math.cos(r) + 1), y: d.box.y - (delta / 2) * Math.sin(r) }
      setLive({ key: d.key, box: round(next) })
    } else {
      let deg = (Math.atan2(e.clientY - d.cy, e.clientX - d.cx) * 180) / Math.PI + 90
      if (deg > 180) deg -= 360
      const near = Math.round(deg / 15) * 15
      if (e.shiftKey || Math.abs(deg - near) < 3) deg = near
      setLive({ key: d.key, box: { ...d.box, r: Math.round(deg * 10) / 10 || undefined } })
    }
  }

  const up = () => {
    const d = drag.current
    drag.current = null
    setGuides([])
    if (d?.moved && live && live.key === d.key) arrange?.patch(d.key, cleanBox(live.box))
    setLive(null)
  }

  const key = (e: KeyboardEvent, k: string) => {
    if (!arrange) return
    const b = boxes[k]
    if (!b) return
    const step = e.shiftKey ? 10 : 1
    const by: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }
    if (by[e.key]) {
      e.preventDefault()
      arrange.patch(k, cleanBox({ ...b, x: b.x + by[e.key][0], y: b.y + by[e.key][1] }))
    } else if (e.key === 'Escape') arrange.select(null)
  }

  /* ---------------------------------------------------------------- the pieces */
  const body = (p: (typeof pieces)[number], box: FreeBox): ReactNode => {
    const f = box.f ?? 1
    const align = (box.a ?? (cfg.theme.align === 'left' ? 'l' : 'c')) as 'l' | 'c' | 'r'
    if (p.key === 'avatar') return <Avatar size={box.w / (cfg.avatar.size / 100)} />
    if (p.key === 'name')
      return (
        <>
          <Name className="w-full leading-[1.05] [overflow-wrap:anywhere]" style={{ fontSize: nameSize(data.name, box.w, f) }} />
          <Badges className="mt-2" center={align !== 'l'} />
        </>
      )
    if (p.key === 'bio') return <Bio className="!max-w-none text-[length:var(--fs)]" center={false} />
    if (p.social) {
      const s = p.social
      return (
        <div style={{ width: 44.8, height: 44.8, transform: `scale(${box.w / 44.8})`, transformOrigin: '0 0' }}>
          <a className="bs" href={mode === 'live' ? s.url : undefined} target="_blank" rel="noopener noreferrer nofollow" aria-label={s.platform} onClick={(e) => (mode === 'live' ? undefined : e.preventDefault())} tabIndex={mode === 'mini' ? -1 : undefined}>
            <BlockIcon block={s} className="size-[1.15rem]" />
          </a>
        </div>
      )
    }
    const b = p.block
    if (!b) return null
    if (b.t === 'heading')
      return (
        <div role="heading" aria-level={2} data-in className={cn('bio-mute font-medium tracking-[0.18em] uppercase', fontClass(cfg.theme.font))} style={{ fontSize: 12.5 * f }}>
          {b.text}
        </div>
      )
    if (b.t === 'text')
      return (
        <p data-in className={cn('bio-mute leading-relaxed whitespace-pre-line', fontClass(cfg.theme.font))} style={{ fontSize: 15 * f }}>
          {b.text}
        </p>
      )
    if (b.t === 'divider') return <Divider />
    return <BlockView block={b} index={0} />
  }

  const sel = arrange?.selected ?? null
  const ui = 1 / (zoom || 1) // one screen pixel, in the page's own units

  return (
    <main ref={outer} className="relative mx-auto w-full" style={{ maxWidth: 560 }}>
      <div className="relative" style={{ height: height * scale, opacity: ready ? 1 : 0, transition: 'opacity 0.5s' }}>
        <div
          ref={world}
          className="absolute top-0 left-0"
          style={{ width: FREE_W, height, transform: `scale(${scale})`, transformOrigin: '0 0' }}
          onPointerDown={(e) => {
            if (arrange && e.target === e.currentTarget) arrange.select(null)
          }}
        >
          {pieces.map((p, i) => {
            const box = boxes[p.key]
            const on = editing && sel === p.key
            const align = (box.a ?? (cfg.theme.align === 'left' ? 'l' : 'c')) as 'l' | 'c' | 'r'
            const socialBox = Boolean(p.social)
            return (
              <div
                key={p.key}
                data-fk={p.key}
                tabIndex={editing ? 0 : undefined}
                onKeyDown={(e) => key(e, p.key)}
                className={cn('absolute outline-none', editing && 'group/fk')}
                style={
                  {
                    left: box.x,
                    top: box.y,
                    width: box.w,
                    height: socialBox ? box.w : undefined,
                    zIndex: (box.z ?? 0) * 100 + (on ? 50 : 0) + Math.min(i, 49),
                    transform: box.r ? `rotate(${box.r}deg)` : undefined,
                    transformOrigin: '50% 50%',
                    textAlign: align === 'l' ? 'left' : align === 'r' ? 'right' : 'center',
                    '--fs': `${15 * (box.f ?? 1)}px`,
                    cursor: editing ? (drag.current ? 'grabbing' : 'grab') : undefined,
                    touchAction: editing ? 'none' : undefined,
                    outline: on ? `${1.5 * ui}px solid #fff` : undefined,
                    boxShadow: on ? `0 0 0 ${3 * ui}px rgb(0 0 0 / 0.5)` : undefined,
                  } as CSSProperties
                }
                onPointerDown={editing ? (e) => down(e, p.key, 'move') : undefined}
                onPointerMove={editing ? move : undefined}
                onPointerUp={editing ? up : undefined}
                onPointerCancel={editing ? up : undefined}
              >
                <div style={{ pointerEvents: editing ? 'none' : undefined }}>{body(p, box)}</div>
                {editing && !on && <span aria-hidden="true" className="pointer-events-none absolute -inset-px opacity-0 transition-opacity group-hover/fk:opacity-100" style={{ outline: `${ui}px dashed rgb(255 255 255 / 0.7)` }} />}
                {on && (
                  <>
                    {(['w', 'e'] as const).map((side) => (
                      <span
                        key={side}
                        role="slider"
                        aria-label={side === 'e' ? 'Resize from the right' : 'Resize from the left'}
                        onPointerDown={(e) => down(e, p.key, side)}
                        onPointerMove={move}
                        onPointerUp={up}
                        onPointerCancel={up}
                        className="absolute top-1/2 grid place-items-center"
                        style={{ [side === 'e' ? 'right' : 'left']: -9 * ui, width: 18 * ui, height: 34 * ui, translate: '0 -50%', cursor: 'ew-resize', touchAction: 'none' }}
                      >
                        <span className="block bg-white" style={{ width: 6 * ui, height: 22 * ui, borderRadius: 99, boxShadow: `0 0 0 ${ui}px rgb(0 0 0 / 0.6)` }} />
                      </span>
                    ))}
                    <span
                      role="slider"
                      aria-label="Turn"
                      onPointerDown={(e) => down(e, p.key, 'rot')}
                      onPointerMove={move}
                      onPointerUp={up}
                      onPointerCancel={up}
                      className="absolute left-1/2 grid place-items-center"
                      style={{ top: -30 * ui, width: 24 * ui, height: 24 * ui, translate: '-50% 0', cursor: 'grab', touchAction: 'none' }}
                    >
                      <span className="block rounded-full bg-white" style={{ width: 11 * ui, height: 11 * ui, boxShadow: `0 0 0 ${ui}px rgb(0 0 0 / 0.6)` }} />
                    </span>
                  </>
                )}
              </div>
            )
          })}
          {guides.map((g, i) => (
            <span key={`${g.axis}${g.at}${i}`} aria-hidden="true" className="pointer-events-none absolute bg-white/80" style={g.axis === 'x' ? { left: g.at, top: 0, width: ui, height } : { top: g.at, left: 0, height: ui, width: FREE_W }} />
          ))}
        </div>
      </div>
      <Footer />
    </main>
  )
}

const round = (b: FreeBox): FreeBox => ({ ...b, x: Math.round(b.x * 10) / 10, y: Math.round(b.y * 10) / 10, w: Math.round(b.w * 10) / 10 })
const cleanBox = (b: FreeBox): FreeBox => {
  const out: FreeBox = { x: Math.round(b.x * 10) / 10, y: Math.round(Math.max(-100, b.y) * 10) / 10, w: Math.round(b.w * 10) / 10 }
  if (b.r) out.r = b.r
  if (b.z) out.z = b.z
  if (b.a) out.a = b.a
  if (b.f && b.f !== 1) out.f = b.f
  return out
}

/** Which of the lines the piece now sits on, to draw. */
function guideFor(box: FreeBox, h: number, xs: number[], ys: number[], th: number): Guide[] {
  const out: Guide[] = []
  const near = (a: number, list: number[]) => list.find((v) => Math.abs(v - a) < 0.5 * th + 0.01)
  for (const a of [box.x, box.x + box.w / 2, box.x + box.w]) {
    const hit = near(a, xs)
    if (hit !== undefined) out.push({ axis: 'x', at: hit })
  }
  for (const a of [box.y, box.y + h / 2, box.y + h]) {
    const hit = near(a, ys)
    if (hit !== undefined) out.push({ axis: 'y', at: hit })
  }
  return out
}
