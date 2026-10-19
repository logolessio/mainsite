'use client'

import { AnimatePresence, motion, useMotionValue, useSpring, useTransform, useVelocity } from 'framer-motion'
import { Bookmark, Heart, Share2, Tv } from 'lucide-react'
import { useRef, useState } from 'react'
import { GlassSurface } from '@/components/glass/glass'
import { cn } from '@/lib/utils'

type Act = { id: 'like' | 'save' | 'share' | 'watch'; label: string; on?: boolean; onClick: () => void }

const ICON = { like: Heart, save: Bookmark, share: Share2, watch: Tv }

const SIZE = 58
const GAP = 6

/**
 * The four buttons beside a trailer, on one tall capsule of glass. A lens of glass follows the pointer from button to button, stretching as
 * it goes and swelling when pressed. Liking fills the heart and sends a ring of light out from it.
 */
export function ActionRail({ actions }: { actions: Act[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const [down, setDown] = useState(false)
  const [burst, setBurst] = useState<{ id: string; n: number } | null>(null)
  const y = useMotionValue(0)
  const sy = useSpring(y, { stiffness: 420, damping: 32, mass: 0.8 })
  const v = useVelocity(sy)
  const sv = useSpring(v, { stiffness: 300, damping: 40 })
  const scaleY = useTransform(sv, [-1800, 0, 1800], [1.28, 1, 1.28])
  const scaleX = useTransform(sv, [-1800, 0, 1800], [0.9, 1, 0.9])
  const wrap = useRef<HTMLDivElement>(null)

  const target = (i: number) => 8 + i * (SIZE + GAP)
  const enter = (i: number) => {
    setHover(i)
    y.set(target(i))
  }

  return (
    <div ref={wrap} className="fixed top-1/2 right-8 z-40"
      style={{ marginTop: -((actions.length * SIZE + (actions.length - 1) * GAP + 16) / 2) }} onPointerLeave={() => { setHover(null); setDown(false) }}>
      <GlassSurface radius={37} style={{ width: SIZE + 16, height: actions.length * SIZE + (actions.length - 1) * GAP + 16 }}>
        <motion.div aria-hidden="true" className="pointer-events-none absolute left-2 z-0" style={{ y: sy, width: SIZE, height: SIZE, scaleX, scaleY, opacity: hover === null ? 0 : 1, transition: 'opacity .25s' }}>
          <motion.div className="size-full" animate={{ scale: down ? 1.14 : 1 }} transition={{ type: 'spring', stiffness: 520, damping: 26 }}>
            <GlassSurface lens lifted={down} className="size-full" />
          </motion.div>
        </motion.div>
        <div className="relative z-10 flex flex-col p-2" style={{ gap: GAP }}>
          {actions.map((a, i) => {
            const Icon = ICON[a.id]
            return (
              <div key={a.id} className="relative">
                <button
                  type="button"
                  aria-label={a.label}
                  aria-pressed={a.id === 'like' || a.id === 'save' ? Boolean(a.on) : undefined}
                  onPointerEnter={() => enter(i)}
                  onPointerDown={() => setDown(true)}
                  onPointerUp={() => setDown(false)}
                  onClick={() => {
                    if (a.id === 'like' && !a.on) setBurst({ id: a.id, n: Date.now() })
                    a.onClick()
                  }}
                  className="relative grid place-items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-paper/70"
                  style={{ width: SIZE, height: SIZE }}
                >
                  <motion.span animate={{ scale: a.on ? [1, 1.35, 1] : 1 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className="relative grid place-items-center">
                    <Icon className={cn('size-[25px] transition-[fill,color] duration-300', a.on ? 'fill-paper text-paper' : 'text-paper')} strokeWidth={1.7} aria-hidden="true" style={{ filter: 'drop-shadow(0 1px 6px rgb(0 0 0 / 0.55))' }} />
                  </motion.span>
                  <AnimatePresence>
                    {burst?.id === a.id && (
                      <motion.span key={burst.n} aria-hidden="true" initial={{ scale: 0.4, opacity: 0.9 }} animate={{ scale: 2.4, opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.7, ease: 'easeOut' }} className="pointer-events-none absolute inset-2 rounded-full border border-paper/70" />
                    )}
                  </AnimatePresence>
                </button>
              </div>
            )
          })}
        </div>
      </GlassSurface>
      {/* the label of the button the pointer is on, outside the glass so nothing clips it */}
      <AnimatePresence>
        {hover !== null && (
          <motion.span
            key={hover}
            initial={{ opacity: 0, x: 10, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 6, scale: 0.95, transition: { duration: 0.12 } }}
            transition={{ type: 'spring', stiffness: 520, damping: 30 }}
            className="pointer-events-none absolute right-[calc(100%+16px)]"
            style={{ top: target(hover) + SIZE / 2, y: '-50%' }}
          >
            <GlassSurface flat className="w-fit" inner="px-4 py-2 text-[14px] whitespace-nowrap text-paper">
              <span className="relative z-10">{actions[hover].label}</span>
            </GlassSurface>
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  )
}
