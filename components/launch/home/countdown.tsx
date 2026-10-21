'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useMotionPrefs } from '@/hooks/use-motion-prefs'
import { cn } from '@/lib/utils'

const EASE = [0.22, 1, 0.36, 1] as const

function parts(ms: number) {
  const t = Math.max(0, Math.floor(ms / 1000))
  return { d: Math.floor(t / 86400), h: Math.floor((t % 86400) / 3600), m: Math.floor((t % 3600) / 60), s: t % 60 }
}

/** One digit that rolls up out of a blur into the next, like a view counter going up. */
function Digit({ v, roll }: { v: string; roll: boolean }) {
  return (
    <span className="relative inline-block h-[1.18em] w-[0.62em] overflow-hidden text-center align-top">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={v}
          initial={roll ? { y: '70%', opacity: 0, filter: 'blur(6px)' } : false}
          animate={{ y: '0%', opacity: 1, filter: 'blur(0px)' }}
          exit={roll ? { y: '-70%', opacity: 0, filter: 'blur(6px)' } : { opacity: 0, transition: { duration: 0 } }}
          transition={{ duration: 0.55, ease: EASE }}
          className="absolute inset-0 grid place-items-center"
        >
          {v}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

function Tile({ value, label, roll, compact }: { value: number; label: string; roll: boolean; compact: boolean }) {
  const t = String(Math.min(value, 999)).padStart(2, '0')
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center">
      <div aria-hidden="true" className={cn('font-display text-paper tabular-nums', compact ? 'text-[clamp(1.9rem,7vw,2.6rem)] leading-[1.18]' : 'text-[clamp(2.3rem,8vw,4.4rem)] leading-[1.18]')}>
        {[...t].map((c, i) => (
          <Digit key={t.length - i} v={c} roll={roll} />
        ))}
      </div>
      <span className={cn('mt-1 text-[12px] text-paper/45 md:text-[13px]', !compact && 'md:mt-2')}>{label}</span>
    </div>
  )
}

/** The countdown to the launch. When it reaches zero it says so and offers to come in. */
export function Countdown({ end, compact = false, auto = true, onOver }: { end: number; compact?: boolean; auto?: boolean; onOver?: () => void }) {
  const { reduced } = useMotionPrefs()
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    setNow(Date.now())
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [])
  const left = end * 1000 - (now ?? end * 1000 - 1)
  const over = now !== null && left <= 0
  useEffect(() => {
    if (over) onOver?.()
  }, [over, onOver])

  // before the browser has the time, the tiles hold their place with dashes so nothing jumps
  const p = now === null ? null : parts(left)
  const opens = new Date(end * 1000)
  const when = now === null ? '' : opens.toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })

  if (over && !auto) return <p className="font-display text-[clamp(1.6rem,3.6vw,2.6rem)] text-paper">The doors open any moment.</p>
  if (over)
    return (
      <div className="flex flex-col items-center gap-4">
        <p className="font-display text-[clamp(1.8rem,4vw,3rem)] text-paper">The doors are open.</p>
        <button type="button" onClick={() => window.location.reload()} className="inline-flex h-12 items-center rounded-pill bg-paper px-7 text-[15px] font-medium text-ink transition-transform active:scale-[0.97]">
          Come in
        </button>
      </div>
    )

  return (
    <div className="w-full">
      <div role="timer" aria-label={p ? `${p.d} days, ${p.h} hours, ${p.m} minutes and ${p.s} seconds left` : 'Countdown'} className={cn('mx-auto flex w-full divide-x divide-white/10', compact ? 'max-w-[400px]' : 'max-w-[620px]')}>
        {p ? (
          <>
            <Tile value={p.d} label="Days" roll={!reduced} compact={compact} />
            <Tile value={p.h} label="Hours" roll={!reduced} compact={compact} />
            <Tile value={p.m} label="Minutes" roll={!reduced} compact={compact} />
            <Tile value={p.s} label="Seconds" roll={!reduced} compact={compact} />
          </>
        ) : (
          ['Days', 'Hours', 'Minutes', 'Seconds'].map((l) => (
            <div key={l} className="flex flex-1 flex-col items-center">
              <span aria-hidden="true" className={cn('font-display text-paper/25', compact ? 'text-[clamp(1.9rem,7vw,2.6rem)] leading-[1.18]' : 'text-[clamp(2.3rem,8vw,4.4rem)] leading-[1.18]')}>--</span>
              <span className="mt-1 text-[12px] text-paper/45 md:text-[13px]">{l}</span>
            </div>
          ))
        )}
      </div>
      {!compact && <p className="mt-4 min-h-5 text-center text-[13px] text-paper/40">{when && `Opens ${when}, your time`}</p>}
    </div>
  )
}
