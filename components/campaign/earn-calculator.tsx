'use client'

import { animate } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { SITE } from '@/lib/site'

const STOPS = [1_000, 5_000, 10_000, 25_000, 50_000, 100_000, 250_000, 500_000, 1_000_000, 2_500_000, 5_000_000]
const label = (n: number) => (n >= 1_000_000 ? `${n / 1_000_000}M` : `${n / 1_000}K`)
const money = (n: number) => `$${n.toLocaleString('en-US', n >= 100 ? { maximumFractionDigits: 0 } : { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/** Slide to a number of views and see what lands in your pocket after the platform fee. */
export function EarnCalculator({ rate }: { rate: number }) {
  const [i, setI] = useState(5)
  const views = STOPS[i]
  const net = (views / 1000) * rate * (1 - SITE.platformFeePct / 100)
  const shown = useRef(net)
  const [display, setDisplay] = useState(net)

  useEffect(() => {
    const c = animate(shown.current, net, { duration: 0.6, ease: [0.22, 1, 0.36, 1], onUpdate: (v) => { shown.current = v; setDisplay(v) } })
    return () => c.stop()
  }, [net])

  return (
    <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.025] p-6 md:p-8">
      <p className="text-[11px] text-mute">What you could earn</p>
      <p className="mt-4 font-display text-6xl leading-none tabular-nums md:text-7xl">{money(display)}</p>
      <p className="mt-2 text-sm text-mute">
        for <span className="text-paper">{label(views)} verified views</span> at {money(rate)} per 1,000
      </p>
      <input
        type="range"
        min={0}
        max={STOPS.length - 1}
        step={1}
        value={i}
        onChange={(e) => setI(Number(e.target.value))}
        aria-label="Number of views"
        className="mt-7 h-2 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-white [&::-webkit-slider-thumb]:size-6 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-paper [&::-webkit-slider-thumb]:shadow-[0_0_0_6px_rgb(255_255_255/0.14)]"
      />
      <div className="mt-2 flex justify-between font-mono text-[10px] text-mute">
        <span>{label(STOPS[0])}</span>
        <span>{label(STOPS[STOPS.length - 1])}</span>
      </div>
      <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-2xl bg-white/[0.04] px-4 py-3">
          <dt className="text-xs text-mute">Before the fee</dt>
          <dd className="mt-0.5 tabular-nums">{money((views / 1000) * rate)}</dd>
        </div>
        <div className="rounded-2xl bg-white/[0.04] px-4 py-3">
          <dt className="text-xs text-mute">logoless fee ({SITE.platformFeePct}%)</dt>
          <dd className="mt-0.5 tabular-nums">−{money((views / 1000) * rate * (SITE.platformFeePct / 100))}</dd>
        </div>
      </dl>
      <p className="mt-4 text-xs leading-relaxed text-mute">
        Only views we verify count. Earnings are held {SITE.holdDays} days, then you can withdraw from ${SITE.minPayoutUsd}.
      </p>
    </div>
  )
}
