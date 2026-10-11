'use client'

import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { useMotionPrefs } from '@/hooks/use-motion-prefs'
import { cn } from '@/lib/utils'

const SPRING = { stiffness: 140, damping: 18, mass: 0.6 }

/**
 * 3D tilt with a travelling light glare and a diagonal light sweep on hover.
 * `global` makes it follow the pointer anywhere on the screen (for hero scenes).
 */
export function Tilt3D({
  children,
  className,
  max = 8,
  glare = true,
  global = false,
  perspective = 1200,
}: {
  children: React.ReactNode
  className?: string
  max?: number
  glare?: boolean
  global?: boolean
  perspective?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const { rich, canHover } = useMotionPrefs()
  const on = rich && canHover
  const px = useMotionValue(0.5)
  const py = useMotionValue(0.5)
  const sx = useSpring(px, SPRING)
  const sy = useSpring(py, SPRING)
  const rotateY = useTransform(sx, [0, 1], [-max, max])
  const rotateX = useTransform(sy, [0, 1], [max, -max])
  const gx = useTransform(sx, [0, 1], [0, 100])
  const gy = useTransform(sy, [0, 1], [0, 100])
  const glareBg = useMotionTemplate`radial-gradient(420px circle at ${gx}% ${gy}%, rgb(255 255 255 / 0.1), transparent 55%)`

  useEffect(() => {
    if (!global || !on) return
    const move = (e: PointerEvent) => {
      px.set(e.clientX / window.innerWidth)
      py.set(e.clientY / window.innerHeight)
    }
    window.addEventListener('pointermove', move, { passive: true })
    return () => window.removeEventListener('pointermove', move)
  }, [global, on, px, py])

  const local = (e: React.PointerEvent) => {
    if (global || !on || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    px.set((e.clientX - r.left) / r.width)
    py.set((e.clientY - r.top) / r.height)
  }
  const reset = () => {
    if (global) return
    px.set(0.5)
    py.set(0.5)
  }

  return (
    <div ref={ref} onPointerMove={local} onPointerLeave={reset} style={{ perspective }} className={cn('tilt relative', className)}>
      <motion.div style={on ? { rotateX, rotateY, transformStyle: 'preserve-3d' } : undefined} className="relative">
        {children}
      </motion.div>
      {/* The light lives on the outer box, so it covers the whole card, padding included, not just the inner content. */}
      {glare && on && (
        <>
          <motion.div aria-hidden="true" style={{ background: glareBg }} className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 [.tilt:hover_&]:opacity-100" />
          <div aria-hidden="true" className="sheen-sweep pointer-events-none absolute inset-0 overflow-hidden" />
        </>
      )}
    </div>
  )
}

/** Pushes a child toward the viewer inside a Tilt3D. */
export function Layer({ z = 40, children, className }: { z?: number; children: React.ReactNode; className?: string }) {
  const { rich } = useMotionPrefs()
  return (
    <div style={rich ? { transform: `translateZ(${z}px)` } : undefined} className={className}>
      {children}
    </div>
  )
}
