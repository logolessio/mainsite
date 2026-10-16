'use client'

import { useState } from 'react'
import { Feature } from '@/components/shell/features-provider'
import { Reveal } from '@/components/motion/reveal'
import { SITE } from '@/lib/site'
import { cn } from '@/lib/utils'

const RATES = [1, 2, 3, 5]

const VIEW_STOPS = [1_000, 5_000, 10_000, 25_000, 50_000, 100_000, 250_000, 500_000, 1_000_000, 2_500_000]
const dollars = (n: number) => `$${n.toLocaleString('en-US', n >= 100 ? { maximumFractionDigits: 0 } : { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/** For creators: slide to a number of views, pick a rate, and see what lands in your pocket. The same card as the brand one. */
export function ClipperCalculator() {
  const [vi, setVi] = useState(5)
  const [rate, setRate] = useState(2)
  const views = VIEW_STOPS[vi]
  const earn = (views / 1000) * rate
  return (
    <Feature id="calculators">
      <section aria-label="Earnings calculator" className="mx-auto mt-24 max-w-5xl px-5 md:mt-32">
        <Reveal y={24}>
          <p className="text-xs text-mute">Try it</p>
          <h2 className="mt-4 font-display text-4xl tracking-tight md:text-6xl">What could a clip earn?</h2>
        </Reveal>
        <Reveal y={24} delay={0.1} className="mt-8">
          <div className="grid gap-8 rounded-[2rem] border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.02] p-6 md:p-10 lg:grid-cols-2">
            <div>
              <p className="text-[11px] text-mute">Verified views</p>
              <p className="mt-3 font-display text-6xl tabular-nums">{views.toLocaleString()}</p>
              <input type="range" min={0} max={VIEW_STOPS.length - 1} value={vi} onChange={(e) => setVi(Number(e.target.value))} aria-label="Number of views" className="mt-6 h-2 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-white [&::-webkit-slider-thumb]:size-6 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-paper" />
              <p className="mt-6 text-[11px] text-mute">Paid per 1,000 views</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {RATES.map((r) => (
                  <button key={r} type="button" onClick={() => setRate(r)} aria-pressed={rate === r} className={cn('h-11 rounded-full border px-5 text-sm transition-colors', rate === r ? 'border-paper bg-paper text-ink' : 'border-line-strong text-mute hover:text-paper')}>
                    ${r}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col justify-center rounded-3xl bg-black/30 p-8">
              <p className="text-[11px] text-mute">You could earn</p>
              <p className="mt-3 font-display text-6xl tabular-nums md:text-7xl">{dollars(earn)}</p>
              <p className="mt-1 text-lg text-mute">for {views.toLocaleString()} verified views</p>
              <p className="mt-6 text-sm leading-relaxed text-mute">Rates differ from campaign to campaign. Only views we verify count, and every earning can be withdrawn as soon as it is confirmed, from ${SITE.minPayoutUsd}.</p>
            </div>
          </div>
        </Reveal>
      </section>
    </Feature>
  )
}

const BUDGETS = [100, 250, 500, 1000, 2500, 5000, 10000]

/** For brands: what a budget buys at a given rate. */
export function BrandCalculator() {
  const [bi, setBi] = useState(2)
  const [rate, setRate] = useState(2)
  const budget = BUDGETS[bi]
  const views = Math.floor((budget / rate) * 1000)
  const fee = (budget * SITE.platformFeePct) / 100
  const total = budget + fee
  return (
    <Feature id="calculators">
      <section aria-label="Budget calculator" className="mx-auto mt-24 max-w-5xl px-5 md:mt-32">
        <Reveal y={24}>
          <p className="text-xs text-mute">Try it</p>
          <h2 className="mt-4 font-display text-4xl tracking-tight md:text-6xl">What will my budget buy?</h2>
        </Reveal>
        <Reveal y={24} delay={0.1} className="mt-8">
          <div className="grid gap-8 rounded-[2rem] border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.02] p-6 md:p-10 lg:grid-cols-2">
            <div>
              <p className="text-[11px] text-mute">Your budget</p>
              <p className="mt-3 font-display text-6xl tabular-nums">${budget.toLocaleString()}</p>
              <input type="range" min={0} max={BUDGETS.length - 1} value={bi} onChange={(e) => setBi(Number(e.target.value))} aria-label="Budget" className="mt-6 h-2 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-white [&::-webkit-slider-thumb]:size-6 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-paper" />
              <p className="mt-6 text-[11px] text-mute">Paid per 1,000 views</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {RATES.map((r) => (
                  <button key={r} type="button" onClick={() => setRate(r)} aria-pressed={rate === r} className={cn('h-11 rounded-full border px-5 text-sm transition-colors', rate === r ? 'border-paper bg-paper text-ink' : 'border-line-strong text-mute hover:text-paper')}>
                    ${r}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col justify-center rounded-3xl bg-black/30 p-8">
              <p className="text-[11px] text-mute">It buys up to</p>
              <p className="mt-3 font-display text-6xl tabular-nums md:text-7xl">{views.toLocaleString()}</p>
              <p className="mt-1 text-lg text-mute">verified views</p>
              <p className="mt-6 text-sm leading-relaxed text-mute">Clippers earn the whole ${budget.toLocaleString()}. We add our {SITE.platformFeePct}% fee on top (${fee.toLocaleString()} here), so you pay ${total.toLocaleString()} in all, and anything you don't spend can be refunded.</p>
            </div>
          </div>
        </Reveal>
      </section>
    </Feature>
  )
}
