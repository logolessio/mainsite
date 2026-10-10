'use client'

import { useEffect, useRef } from 'react'
import { useMotionPrefs } from '@/hooks/use-motion-prefs'

/**
 * Soft spotlight that trails the pointer. It is a pre-painted gradient moved with `transform`, so the GPU
 * does the work and nothing is repainted. The loop stops by itself once the light has caught up.
 */
export function LightField() {
  const spot = useRef<HTMLDivElement>(null)
  const { rich } = useMotionPrefs()

  useEffect(() => {
    const el = spot.current
    if (!el || !rich) return
    let tx = window.innerWidth / 2
    let ty = window.innerHeight * 0.3
    let x = tx
    let y = ty
    let raf = 0

    const tick = () => {
      x += (tx - x) * 0.08
      y += (ty - y) * 0.08
      el.style.transform = `translate3d(${(x - 450).toFixed(1)}px, ${(y - 450).toFixed(1)}px, 0)`
      raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.5 ? requestAnimationFrame(tick) : 0
    }
    const onMove = (e: PointerEvent) => {
      tx = e.clientX
      ty = e.clientY
      if (!raf) raf = requestAnimationFrame(tick)
    }
    tick()
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
    }
  }, [rich])

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div
        ref={spot}
        className="absolute top-0 left-0 size-[900px] will-change-transform"
        style={{
          background: 'radial-gradient(closest-side, rgb(255 255 255 / 0.07), transparent)',
          transform: 'translate3d(30vw, 0, 0)',
        }}
      />
      {/* huge, soft vignette: a smooth multi-stop falloff plus a blurred inner shadow so there is no visible edge */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 72% 68% at 50% 54%, transparent 0%, transparent 26%, rgb(0 0 0 / 0.22) 42%, rgb(0 0 0 / 0.58) 58%, rgb(0 0 0 / 0.88) 74%, rgb(0 0 0 / 0.98) 88%, #000 100%)',
        }}
      />
      <div className="absolute inset-0" style={{ boxShadow: 'inset 0 0 32vmin 16vmin #000' }} />
      {/* fine film grain, painted once */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .9 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        }}
      />
    </div>
  )
}
