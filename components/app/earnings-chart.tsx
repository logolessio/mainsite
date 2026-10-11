'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { EASE_OUT } from '@/lib/layout'
import { cn } from '@/lib/utils'

type Range = '7d' | '30d' | '12w'
const RANGES: { id: Range; label: string }[] = [
  { id: '7d', label: '7 days' },
  { id: '30d', label: '30 days' },
  { id: '12w', label: '12 weeks' },
]
const DAY = 86400
const usd = (c: number) => `$${(c / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/** Earnings as bars that grow in. Pick a range, point at a bar for the exact figure. `events` are [unix seconds, cents]. */
export function EarningsChart({ events, now }: { events: [number, number][]; now: number }) {
  const [range, setRange] = useState<Range>('30d')
  const [hover, setHover] = useState<number | null>(null)

  const bars = useMemo(() => {
    const weekly = range === '12w'
    const n = range === '7d' ? 7 : range === '30d' ? 30 : 12
    const step = weekly ? 7 * DAY : DAY
    const end = Math.ceil((now + 1) / DAY) * DAY
    const out = Array.from({ length: n }, (_, i) => {
      const to = end - (n - 1 - i) * step
      return { from: to - step, to, cents: 0 }
    })
    for (const [t, c] of events) {
      const b = out.find((x) => t >= x.from && t < x.to)
      if (b) b.cents += c
    }
    return out
  }, [events, now, range])

  const max = Math.max(1, ...bars.map((b) => b.cents))
  const total = bars.reduce((s, b) => s + b.cents, 0)
  const label = (b: { from: number; to: number }) => {
    const f = new Date(b.from * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    return range === '12w' ? `Week of ${f}` : f
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-mute">Earned in this range</p>
          <p className="mt-1 font-display text-4xl leading-none font-medium tracking-tight tabular-nums">{usd(total)}</p>
        </div>
        <div role="tablist" aria-label="Chart range" className="relative inline-flex rounded-full bg-white/[0.06] p-1">
          {RANGES.map((r) => (
            <button key={r.id} role="tab" type="button" aria-selected={range === r.id} onClick={() => setRange(r.id)} className="relative h-9 rounded-full px-4 text-sm">
              {range === r.id && <motion.span layoutId="earn-range" transition={{ duration: 0.3, ease: EASE_OUT }} className="absolute inset-0 rounded-full bg-paper" />}
              <span className={cn('relative transition-colors', range === r.id ? 'text-ink' : 'text-mute hover:text-paper')}>{r.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="relative mt-8 h-56">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} aria-hidden="true" className="absolute inset-x-0 h-px bg-line" style={{ bottom: `${(i / 3) * 100}%` }} />
        ))}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={range} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="absolute inset-0 flex items-end gap-1.5 md:gap-2" onMouseLeave={() => setHover(null)}>
            {bars.map((b, i) => (
              <button key={b.from} type="button" aria-label={`${label(b)}: ${usd(b.cents)}`} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} className="group relative flex h-full flex-1 items-end outline-none">
                <motion.span
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ duration: 0.7, delay: i * 0.018, ease: EASE_OUT }}
                  style={{ height: `${Math.max(b.cents ? 4 : 1.5, (b.cents / max) * 100)}%`, transformOrigin: 'bottom' }}
                  className={cn('w-full rounded-t-md transition-colors', b.cents ? (hover === i ? 'bg-paper' : 'bg-paper/70') : 'bg-white/10')}
                />
                {hover === i && (
                  <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 rounded-xl border border-line-strong bg-[#0b0b0c] px-3 py-2 text-xs whitespace-nowrap shadow-xl">
                    <span className="block text-mute">{label(b)}</span>
                    <span className="block font-medium tabular-nums">{usd(b.cents)}</span>
                  </span>
                )}
              </button>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="mt-3 flex justify-between font-mono text-[11px] text-mute">
        <span>{label(bars[0])}</span>
        <span>Today</span>
      </div>
    </div>
  )
}
