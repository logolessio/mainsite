'use client'

import { useState } from 'react'
import { EarnCalculator } from '@/components/campaign/earn-calculator'
import { Feature } from '@/components/shell/features-provider'
import { Reveal } from '@/components/motion/reveal'
import { SITE } from '@/lib/site'
import { cn } from '@/lib/utils'

const RATES = [1, 2, 3, 5]

/** For clippers: slide to a number of views and see what lands in your pocket. */
export function ClipperCalculator() {
  const [rate, setRate] = useState(2)
  return (
    <Feature id="calculators">
      <section aria-label="Earnings calculator" className="mx-auto mt-24 grid max-w-5xl gap-8 px-5 md:mt-32 lg:grid-cols-[1fr_430px] lg:items-center lg:gap-16">
        <Reveal y={24}>
          <p className="text-xs text-mute">Try it</p>
          <h2 className="mt-4 font-display text-4xl tracking-tight md:text-6xl">What could a clip earn?</h2>
          <p className="mt-4 max-w-md text-mute">Campaign rates vary. Pick a rate you see on a campaign and slide to a number of views. This is after our {SITE.platformFeePct}% fee.</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {RATES.map((r) => (
              <button key={r} type="button" onClick={() => setRate(r)} aria-pressed={rate === r} className={cn('h-11 rounded-full border px-5 text-sm transition-colors', rate === r ? 'border-paper bg-paper text-ink' : 'border-line-strong text-mute hover:text-paper')}>
                ${r} per 1,000
              </button>
            ))}
          </div>
        </Reveal>
        <Reveal y={24} delay={0.1}>
          <EarnCalculator rate={rate} />
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
              <p className="mt-6 text-sm leading-relaxed text-mute">You pay the budget and nothing on top. Of what clippers earn, {SITE.platformFeePct}% (about ${fee.toLocaleString()} here) is the logoless fee. Anything you do not spend can be refunded.</p>
            </div>
          </div>
        </Reveal>
      </section>
    </Feature>
  )
}
