'use client'

import { motion, useMotionTemplate, useTransform } from 'framer-motion'
import type { CSSProperties, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { useBio } from './context'

/** How far a piece stands off the card (in pixels), scaled by the page's 3D setting. Everything in a Stage is laid out flat, then lifted. */
export function Layer({ z = 0, className, style, children }: { z?: number; className?: string; style?: CSSProperties; children?: ReactNode }) {
  const { cfg, mode, reduced } = useBio()
  const lift = reduced || mode === 'mini' ? 0 : Math.round(z * (cfg.fx.depth / 100))
  return (
    <div className={className} style={{ transform: lift ? `translateZ(${lift}px)` : undefined, transformStyle: 'preserve-3d', ...style }}>
      {children}
    </div>
  )
}

/**
 * The card the profile sits on, in 3D: it leans towards the pointer (anywhere on the page), the light on its face and its shadow follow, and the pieces
 * inside (`Layer`) stand off it by different amounts, so the picture, the name and the icons slide a little against each other as it turns.
 * The frosted face is its own layer under the content (a blur cannot sit on something that keeps its children in 3D).
 */
export function Stage({ children, className, radius = 'calc(var(--bio-r) + 8px)' }: { children: ReactNode; className?: string; radius?: string }) {
  const { cfg, px, py, reduced, mode } = useBio()
  const c = cfg.card
  const on = cfg.fx.tilt && !reduced && mode !== 'mini'
  const max = 2 + cfg.fx.depth * 0.13
  const rx = useTransform(py, (v) => (on ? -v * max * 0.85 : 0))
  const ry = useTransform(px, (v) => (on ? v * max : 0))
  const gx = useTransform(px, (v) => 50 + v * 55)
  const gy = useTransform(py, (v) => 30 + v * 55)
  const sx = useTransform(px, (v) => (on ? -v * 22 : 0))
  const sy = useTransform(py, (v) => (on ? 34 - v * 14 : 34))
  const glare = useMotionTemplate`radial-gradient(520px circle at ${gx}% ${gy}%, rgb(var(--bio-fg-rgb) / 0.13), transparent 58%)`
  const shadow = useMotionTemplate`${sx}px ${sy}px 90px -18px rgb(0 0 0 / 0.65)`
  const face: CSSProperties =
    c.style === 'none'
      ? {}
      : c.style === 'outline'
        ? { border: '1px solid var(--bio-line)' }
        : c.style === 'solid'
          ? { background: `color-mix(in srgb, var(--bio-bg) ${60 + c.opacity * 0.4}%, rgb(var(--bio-fg-rgb) / 1) 0%)`, border: '1px solid var(--bio-line)' }
          : {
              background: `color-mix(in srgb, var(--bio-bg) ${Math.round(18 + c.opacity * 0.7)}%, transparent)`,
              border: '1px solid var(--bio-line)',
              backdropFilter: `blur(${c.blur}px) saturate(1.5)`,
              WebkitBackdropFilter: `blur(${c.blur}px) saturate(1.5)`,
            }
  const bare = c.style === 'none'
  return (
    <div className={cn('stage-wrap', cfg.fx.float && !reduced && mode !== 'mini' && 'stage-float')} style={{ perspective: 1200 }}>
      <motion.div className={cn('relative', className)} style={{ rotateX: rx, rotateY: ry, transformStyle: 'preserve-3d', width: `min(${c.width}px, calc(100cqw - 2rem))` }}>
        {!bare && (
          <motion.div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden" style={{ ...face, borderRadius: radius, boxShadow: c.style === 'outline' ? undefined : shadow }}>
            {c.glare && on && <motion.span className="absolute inset-0" style={{ background: glare }} />}
          </motion.div>
        )}
        <div className="relative" style={{ transformStyle: 'preserve-3d' }}>
          {children}
        </div>
      </motion.div>
    </div>
  )
}
