'use client'

import { motion, useTransform } from 'framer-motion'
import type { CSSProperties, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { useBio } from './context'

/** How far a piece stands off the card (in pixels), scaled by the page's 3D setting. Everything in a Stage is laid out flat, then lifted. */
export function Layer({ z = 0, className, style, children }: { z?: number; className?: string; style?: CSSProperties; children?: ReactNode }) {
  const { cfg, mode, reduced } = useBio()
  const lift = reduced || mode === 'mini' ? 0 : Math.round(z * (cfg.fx.depth / 100))
  return (
    <div className={className} style={{ transform: lift ? `translateZ(${lift}px)` : undefined, ...style }}>
      {children}
    </div>
  )
}

/**
 * The card the profile sits on, in 3D: it leans towards the pointer (anywhere on the page), and the pieces inside (`Layer`) stand off it by different
 * amounts, so the picture, the name and the icons slide a little against each other as it turns.
 *
 * What it does to stay light: the turn is the only thing that changes while the pointer moves, and it changes as a transform. The shine and the shadow
 * are soft pieces that are drawn once and then only moved, never re-painted. The frosted blur is dropped for a plain tinted face when something behind it
 * is moving (an effect, a video, a GIF), because a blur over moving pixels is re-done every frame.
 */
/** The face of the card: its colour, its edge and (when nothing behind it moves) its frost. Shared by the stage and by the card piece on the canvas. */
export function useFace(): CSSProperties {
  const { cfg, mode } = useBio()
  const c = cfg.card
  const moving = cfg.overlay.effect !== 'none' || cfg.bg.kind === 'video' || cfg.bg.kind === 'gif' || cfg.bg.kind === 'youtube'
  return c.style === 'none'
    ? {}
    : c.style === 'outline'
      ? { border: '1px solid var(--bio-line)' }
      : c.style === 'solid'
        ? { background: `color-mix(in srgb, var(--bio-bg) ${60 + c.opacity * 0.4}%, rgb(var(--bio-fg-rgb) / 1) 0%)`, border: '1px solid var(--bio-line)' }
        : moving || mode === 'mini'
          ? { background: `color-mix(in srgb, var(--bio-bg) ${Math.round(48 + c.opacity * 0.45)}%, transparent)`, border: '1px solid var(--bio-line)' }
          : {
              background: `color-mix(in srgb, var(--bio-bg) ${Math.round(18 + c.opacity * 0.7)}%, transparent)`,
              border: '1px solid var(--bio-line)',
              backdropFilter: `blur(${c.blur}px)`,
              WebkitBackdropFilter: `blur(${c.blur}px)`,
            }
}

export function Stage({ children, className, radius = 'calc(var(--bio-r) + 8px)' }: { children: ReactNode; className?: string; radius?: string }) {
  const { cfg, px, py, reduced, mode } = useBio()
  const c = cfg.card
  const on = cfg.fx.tilt && !reduced && mode !== 'mini'
  const max = 2 + cfg.fx.depth * 0.13
  const rx = useTransform(py, (v) => (on ? -v * max * 0.85 : 0))
  const ry = useTransform(px, (v) => (on ? v * max : 0))
  const gx = useTransform(px, (v) => v * 150)
  const gy = useTransform(py, (v) => v * 170)
  const sx = useTransform(px, (v) => (on ? -v * 22 : 0))
  const sy = useTransform(py, (v) => (on ? 30 - v * 12 : 30))
  const face = useFace()
  const shadow = c.style === 'glass' || c.style === 'solid'
  return (
    <div className={cn('stage-wrap', cfg.fx.float && !reduced && mode !== 'mini' && 'stage-float')} style={{ perspective: 1200 }}>
      <motion.div className={cn('relative', className)} style={{ rotateX: rx, rotateY: ry, transformStyle: 'preserve-3d', width: `min(${c.width}px, calc(100cqw - 2rem))`, willChange: on ? 'transform' : undefined }}>
        {shadow && mode !== 'mini' && <motion.div aria-hidden="true" className="pointer-events-none absolute inset-[5%]" style={{ x: sx, y: sy, borderRadius: radius, background: 'rgb(0 0 0 / 0.5)', filter: 'blur(34px)' }} />}
        {c.style !== 'none' && (
          <div aria-hidden="true" data-bk="card" className="pointer-events-none absolute inset-0 overflow-hidden" style={{ ...face, borderRadius: radius }}>
            {c.glare && on && <motion.span className="absolute top-1/2 left-1/2 -mt-[260px] -ml-[260px] size-[520px]" style={{ x: gx, y: gy, background: 'radial-gradient(closest-side, rgb(var(--bio-fg-rgb) / 0.12), transparent)' }} />}
          </div>
        )}
        <div className="relative" style={{ transformStyle: 'preserve-3d' }}>
          {children}
        </div>
      </motion.div>
    </div>
  )
}
