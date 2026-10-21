'use client'

import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion'
import { X } from 'lucide-react'
import { useRef } from 'react'
import { cn } from '@/lib/utils'

/**
 * Something you can drag sideways with the cursor (or a finger) to get rid of it: let go past about a third of the way, or flick it, and it
 * slides off and `onAway` runs; let go earlier and it springs back. A cross shows behind it as it moves. Works in both directions, never
 * fires the click that ends a drag, and leaves up and down scrolling alone on a touch screen.
 */
export function SwipeAway({ onAway, children, className }: { onAway: () => void; children: React.ReactNode; className?: string }) {
  const x = useMotionValue(0)
  const reduced = useReducedMotion()
  const dragged = useRef(false)
  const wrap = useRef<HTMLDivElement>(null)
  const showLeft = useTransform(x, [0, 50, 130], [0, 0.35, 1])
  const showRight = useTransform(x, [0, -50, -130], [0, 0.35, 1])
  const fade = useTransform(x, [-320, -140, 0, 140, 320], [0, 0.6, 1, 0.6, 0])
  if (reduced) return <div className={className}>{children}</div>

  const settle = (dx: number, vx: number) => {
    const w = wrap.current?.offsetWidth ?? 320
    const gone = Math.abs(dx) > Math.min(130, w * 0.34) || (Math.abs(vx) > 700 && Math.sign(vx) === Math.sign(dx) && Math.abs(dx) > 30)
    if (!gone) return void animate(x, 0, { type: 'spring', stiffness: 520, damping: 38 })
    animate(x, Math.sign(dx || vx) * (w + 40), { duration: 0.2, ease: 'easeOut' }).then(onAway)
  }

  return (
    <div ref={wrap} className={cn('relative', className)}>
      <motion.span aria-hidden="true" style={{ opacity: showLeft }} className="pointer-events-none absolute inset-y-0 left-4 grid place-items-center text-paper/60">
        <X className="size-4" />
      </motion.span>
      <motion.span aria-hidden="true" style={{ opacity: showRight }} className="pointer-events-none absolute inset-y-0 right-4 grid place-items-center text-paper/60">
        <X className="size-4" />
      </motion.span>
      <motion.div
        style={{ x, opacity: fade, touchAction: 'pan-y' }}
        drag="x"
        dragDirectionLock
        dragMomentum={false}
        dragElastic={0.85}
        dragConstraints={{ left: 0, right: 0 }}
        onDragStart={() => (dragged.current = true)}
        onDragEnd={(_, info) => {
          settle(info.offset.x, info.velocity.x)
          window.setTimeout(() => (dragged.current = false), 0)
        }}
        onDragStartCapture={(e) => e.preventDefault()}
        onClickCapture={(e) => {
          if (dragged.current) {
            e.preventDefault()
            e.stopPropagation()
          }
        }}
        className="cursor-grab active:cursor-grabbing"
      >
        {children}
      </motion.div>
    </div>
  )
}
