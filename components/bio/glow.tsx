'use client'

import { type CSSProperties, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

/**
 * The glow that rises from the bottom: four soft hearts, outermost first, centred low in a box about twice the width of the page so only their tops show.
 * The shapes are lovable.dev's. Each of the two layers is painted once into a small canvas (the blur is baked in), so nothing is re-drawn while the glow
 * breathes and drifts (see .glow in bio.css). `enter` plays the rise from below on load; `still` holds it for the small previews.
 */
const GEOM = [
  { cy: 835, sx: 1.014, r: 329, dx: 229, dy: 227, s: 626, ty: 43.8, sy: 0.852, blur: 30, layer: 'halo' },
  { cy: 791, sx: 1.02, r: 245, dx: 195, dy: 166, s: 541, ty: 7.1, sy: 0.962, blur: 25, layer: 'halo' },
  { cy: 821, sx: 1.038, r: 229, dx: 151, dy: 148, s: 439, ty: 43.9, sy: 0.73, blur: 22, layer: 'core' },
  { cy: 800, sx: 1.085, r: 182, dx: 107, dy: 102, s: 364, ty: 24.9, sy: 0.746, blur: 18, layer: 'core' },
] as const

/** lovable.dev's own four colours: blue, pink, red, orange. */
export const LOVABLE_GLOW: [string, string, string, string] = ['#417fff', '#ff85e5', '#fe1766', '#ff6e1d']

const PX = 520
const PY = Math.round((PX * 1210) / 1200)

function uri(layer: 'halo' | 'core', colors: readonly string[]) {
  const hs = GEOM.map((g, i) => ({ ...g, c: colors[i] ?? '#ffffff', i })).filter((g) => g.layer === layer)
  const defs = hs.map((h) => `<filter id="b${h.i}" filterUnits="userSpaceOnUse" x="-1000" y="-1000" width="2000" height="2000"><feGaussianBlur stdDeviation="${h.blur}"/></filter>`).join('')
  const shapes = hs
    .map((h) => {
      const s = h.s * 0.9
      return `<g transform="translate(600 ${h.cy}) scale(${h.sx} 1)" fill="${h.c}" filter="url(#b${h.i})"><circle cx="${-h.dx}" cy="${-h.dy}" r="${h.r * 0.9}"/><circle cx="${h.dx}" cy="${-h.dy}" r="${h.r * 0.9}"/><rect x="${-s / 2}" y="${-s / 2}" width="${s}" height="${s}" transform="translate(0 ${h.ty}) scale(1 ${h.sy}) rotate(45)"/></g>`
    })
    .join('')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1210" width="${PX}" height="${PY}"><defs>${defs}</defs>${shapes}</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function Layer({ name, colors }: { name: 'halo' | 'core'; colors: readonly string[] }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const key = colors.join()
  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    let live = true
    const img = new Image()
    img.onload = () => {
      if (!live) return
      const g = cv.getContext('2d')
      g?.clearRect(0, 0, cv.width, cv.height)
      g?.drawImage(img, 0, 0, cv.width, cv.height)
    }
    img.src = uri(name, colors)
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, key])
  return <canvas ref={ref} width={PX} height={PY} aria-hidden="true" className={cn('glow-layer', name === 'halo' ? 'glow-halo' : 'glow-core')} />
}

/** `w` is the width of the artwork and `top` where the tops of the outer lobes sit, both any CSS length. */
export function Glow({ colors, w, top, enter = false, still = false, fade = false, grain = false, className }: { colors: readonly string[]; w: string; top: string; enter?: boolean; still?: boolean; fade?: boolean; grain?: boolean; className?: string }) {
  return (
    <div aria-hidden="true" className={cn('glow', enter && 'glow-enter', still && 'glow-still', className)}>
      <div className="glow-rise">
        <div className="glow-drift">
          <div className="glow-art" style={{ '--w': w, '--top': top } as CSSProperties}>
            <Layer name="halo" colors={colors} />
            <Layer name="core" colors={colors} />
          </div>
        </div>
      </div>
      {grain && <span className="mesh-grain" />}
      {fade && <span className="absolute inset-x-0 bottom-0 h-[16%] bg-gradient-to-t from-[#080808] to-transparent" />}
    </div>
  )
}
