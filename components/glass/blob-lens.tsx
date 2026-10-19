'use client'

import { motion, useMotionValue, useSpring, useTransform, useVelocity } from 'framer-motion'
import { useEffect } from 'react'
import { cn } from '@/lib/utils'
import { GlassSurface } from './glass'

export type Rect = { left: number; top: number; width: number; height: number }

const SPRING = { stiffness: 430, damping: 33, mass: 0.85 }

/**
 * The selection of a menu, as Apple draws it: a lens of liquid glass that glides from one choice to the next, stretching along the way it
 * travels (more the faster it goes) and settling with a small squash. Put it inside a `relative` row and give it the rectangle of the
 * chosen item; `instant` makes it jump (the row was just resized) and `from` is where it starts when it first appears.
 */
export function BlobLens({ rect, from, instant = false, lifted = false, soft = false, className }: { rect: Rect; from?: Rect | null; instant?: boolean; lifted?: boolean; soft?: boolean; className?: string }) {
  const start = from ?? rect
  const l = useMotionValue(start.left)
  const t = useMotionValue(start.top)
  const w = useMotionValue(start.width)
  const h = useMotionValue(start.height)
  const sl = useSpring(l, SPRING)
  const st = useSpring(t, SPRING)
  const sw = useSpring(w, SPRING)
  const sh = useSpring(h, SPRING)
  const vx = useSpring(useVelocity(sl), { stiffness: 300, damping: 40 })
  const vy = useSpring(useVelocity(st), { stiffness: 300, damping: 40 })
  const scaleX = useTransform([vx, vy], ([x, y]: number[]) => 1 + Math.min(Math.abs(x) / 2400, 0.24) - Math.min(Math.abs(y) / 3200, 0.1))
  const scaleY = useTransform([vx, vy], ([x, y]: number[]) => 1 + Math.min(Math.abs(y) / 2400, 0.24) - Math.min(Math.abs(x) / 3200, 0.1))

  useEffect(() => {
    l.set(rect.left)
    t.set(rect.top)
    w.set(rect.width)
    h.set(rect.height)
    if (instant) {
      sl.jump(rect.left)
      st.jump(rect.top)
      sw.jump(rect.width)
      sh.jump(rect.height)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rect.left, rect.top, rect.width, rect.height, instant])

  return (
    <motion.span aria-hidden="true" className={cn('pointer-events-none absolute top-0 left-0 z-0', className)} style={{ x: sl, y: st, width: sw, height: sh, scaleX, scaleY }}>
      <motion.span className="block size-full" animate={{ scale: lifted ? 1.12 : 1 }} transition={{ type: 'spring', stiffness: 520, damping: 26 }}>
        <GlassSurface lens lifted={lifted} className="size-full" tint={soft ? 'linear-gradient(180deg, rgb(255 255 255 / 0.17), rgb(255 255 255 / 0.07))' : undefined} />
      </motion.span>
    </motion.span>
  )
}
