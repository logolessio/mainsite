'use client'

import type { GlassConfig, LiquidGlass as Engine } from '@ybouane/liquidglass'

/**
 * Real liquid glass (refraction, bevel light, chromatic edge, shadow) on a few surfaces, drawn by the @ybouane/liquidglass WebGL
 * library. Every surface is its own small scene: a root holding a stand-in for what the glass sits on, and the glass itself (see
 * components/ui/liquid-glass.tsx). The CSS look of the glass is always there underneath and is what shows while the library loads, on
 * a device without WebGL, in calm mode and with reduced motion, so nothing ever pops in or goes missing.
 *
 * Each surface is only drawn while it is on screen, and at most MAX at once (a browser allows about sixteen WebGL contexts), one
 * at a time so a page never stalls starting them.
 */
export type Look = Partial<GlassConfig>

const MAX = 8
const LEAVE_MS = 2500

let library: Promise<typeof import('@ybouane/liquidglass')> | null = null
let supported: boolean | null = null
const live = new Map<HTMLElement, { engine: Engine; glass: HTMLElement }>()
let queue: Promise<void> = Promise.resolve()

export function glassSupported(): boolean {
  if (supported !== null) return supported && !document.documentElement.classList.contains('calm') && !matchMedia('(prefers-reduced-motion: reduce)').matches
  try {
    const c = document.createElement('canvas')
    supported = Boolean(c.getContext('webgl'))
  } catch {
    supported = false
  }
  return glassSupported()
}

/** The corner radius the shader must use is whatever CSS currently draws (it follows the roundness setting), capped at a pill. */
function radiusOf(glass: HTMLElement): number {
  const r = parseFloat(getComputedStyle(glass).borderTopLeftRadius) || 0
  return Math.max(0, Math.min(r, glass.offsetHeight / 2, glass.offsetWidth / 2))
}

function configure(glass: HTMLElement, look: Look) {
  const radius = radiusOf(glass)
  const config: Look = {
    // dark glass like the CSS glass: a soft bend at the edges, a thin light edge, a quiet shadow
    refraction: 0.4,
    chromAberration: 0.03,
    edgeHighlight: 0.32,
    specular: 0,
    fresnel: 0.5,
    opacity: 0.9,
    brightness: 0,
    shadowOpacity: 0.5,
    shadowSpread: 14,
    shadowOffsetY: 12,
    ...look,
    cornerRadius: radius,
    zRadius: Math.max(6, Math.min(look.zRadius ?? 14, Math.min(glass.offsetHeight, glass.offsetWidth) / 2)),
  }
  const next = JSON.stringify(config)
  if (glass.dataset.config !== next) glass.dataset.config = next
}

async function start(root: HTMLElement, glass: HTMLElement, look: Look, alive: () => boolean) {
  if (live.has(root) || live.size >= MAX || !glassSupported() || !alive()) return
  library ??= import('@ybouane/liquidglass')
  const { LiquidGlass } = await library
  if (!alive() || live.has(root) || live.size >= MAX) return
  configure(glass, look)
  const engine = await LiquidGlass.init({ root, glassElements: [glass] })
  if (!alive() || live.has(root)) return engine.destroy()
  live.set(root, { engine, glass })
  glass.classList.add('lg-on')
}

function stop(root: HTMLElement) {
  const one = live.get(root)
  if (!one) return
  live.delete(root)
  one.glass.classList.remove('lg-on')
  one.engine.destroy()
  one.glass.removeAttribute('data-config')
}

/** Starts drawing real glass on this surface while it is near the screen. Returns what to call when the surface goes away. */
export function attachGlass(root: HTMLElement, glass: HTMLElement, look: Look): () => void {
  let gone = false
  let leave: ReturnType<typeof setTimeout> | null = null
  const alive = () => !gone
  const io = new IntersectionObserver(
    (entries) => {
      const seen = entries.some((e) => e.isIntersecting)
      if (seen) {
        if (leave) clearTimeout(leave)
        leave = null
        queue = queue.then(() => start(root, glass, look, alive)).catch(() => {})
      } else if (!leave) {
        leave = setTimeout(() => stop(root), LEAVE_MS)
      }
    },
    { rootMargin: '240px' },
  )
  io.observe(root)

  // the shader's corners follow the CSS ones, which change with the roundness setting and with the size of the surface
  const sync = () => live.has(root) && configure(glass, look)
  const ro = new ResizeObserver(sync)
  ro.observe(glass)
  const mo = new MutationObserver(() => {
    if (!glassSupported()) stop(root)
    else sync()
  })
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['style', 'class'] })

  return () => {
    gone = true
    io.disconnect()
    ro.disconnect()
    mo.disconnect()
    if (leave) clearTimeout(leave)
    stop(root)
  }
}
