'use client'

import { animate, useInView } from 'framer-motion'
import { Check, Eye, Heart, MessageCircle, RotateCcw, Share2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Feature } from '@/components/shell/features-provider'
import { Reveal } from '@/components/motion/reveal'
import { useMotionPrefs } from '@/hooks/use-motion-prefs'
import { SITE } from '@/lib/site'
import { cn } from '@/lib/utils'

const RATES = [1, 2, 3, 5]
const TARGET_VIEWS = 48_000
const STEPS = [
  { at: 0, title: 'You post the clip', body: 'On your own TikTok, YouTube or Instagram account. Paste the link.' },
  { at: 0.12, title: 'We check it', body: 'Against the brief, and for bot traffic. A human looks at anything unclear.' },
  { at: 0.26, title: 'Views are verified', body: 'Only views that pass the checks count. Everything else is ignored.' },
  { at: 0.9, title: 'Money lands in your balance', body: `Held ${SITE.holdDays} days, then yours to withdraw through Stripe.` },
]
const money = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/** An animated walk through the loop: post a clip, watch it get checked, watch verified views turn into money. */
export function EarnDemo() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.35 })
  const { reduced } = useMotionPrefs()
  const [rate, setRate] = useState(2)
  const [t, setT] = useState(0)
  const run = useRef<ReturnType<typeof animate> | null>(null)

  const play = useCallback(() => {
    run.current?.stop()
    if (reduced) return setT(1)
    setT(0)
    run.current = animate(0, 1, { duration: 11, ease: 'linear', onUpdate: setT })
  }, [reduced])

  useEffect(() => {
    if (inView) play()
    return () => run.current?.stop()
  }, [inView, play])

  const climb = Math.max(0, Math.min(1, (t - 0.26) / 0.64))
  const views = Math.round(TARGET_VIEWS * (1 - Math.pow(1 - climb, 2.2)))
  const net = (views / 1000) * rate * (1 - SITE.platformFeePct / 100)
  const stage = t >= 0.26 ? 'ok' : t >= 0.12 ? 'check' : 'posted'
  const current = STEPS.reduce((n, s, i) => (t >= s.at ? i : n), 0)

  return (
    <Feature id="earn-demo">
      <section ref={ref} aria-label="Watch a clip earn" className="mx-auto mt-28 max-w-6xl px-5 md:mt-40">
        <Reveal y={24}>
          <p className="font-mono text-xs tracking-[0.25em] text-mute uppercase">See it happen</p>
          <h2 className="mt-4 max-w-2xl font-display text-4xl tracking-tight md:text-6xl">Watch a clip earn.</h2>
          <p className="mt-4 max-w-md text-mute">A made-up clip, real maths. Pick a rate and watch what the loop does with it.</p>
        </Reveal>

        <div className="mt-12 grid items-center gap-10 lg:grid-cols-[320px_1fr] lg:gap-20">
          {/* the phone */}
          <div className="mx-auto w-[min(72vw,290px)]">
            <div className="relative aspect-[9/17] overflow-hidden rounded-[2.6rem] border border-white/15 bg-black shadow-[0_50px_100px_-30px_rgba(0,0,0,0.9),0_0_0_6px_rgba(255,255,255,0.04)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/covers/04.jpg" alt="" className="absolute inset-0 size-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/80" />
              <span className="absolute top-3 left-1/2 h-5 w-20 -translate-x-1/2 rounded-full bg-black" />

              <div className="absolute inset-x-4 top-12 flex items-center justify-between text-[11px]">
                <span className="rounded-full bg-black/45 px-2.5 py-1 backdrop-blur">TikTok</span>
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-medium backdrop-blur transition-colors duration-500',
                    stage === 'ok' ? 'bg-emerald-400/90 text-black' : stage === 'check' ? 'bg-amber-300/90 text-black' : 'bg-white/20 text-paper',
                  )}
                >
                  {stage === 'ok' && <Check className="size-3" />}
                  {stage === 'ok' ? 'Approved' : stage === 'check' ? 'Checking…' : 'Posted'}
                </span>
              </div>

              <div className={cn('absolute inset-x-0 top-[42%] flex justify-center transition-opacity duration-500', stage === 'ok' ? 'opacity-100' : 'opacity-0')}>
                <div className="rounded-3xl bg-black/45 px-5 py-3 text-center backdrop-blur-md">
                  <p className="inline-flex items-center gap-2">
                    <Eye className="size-5" />
                    <span className="font-display text-4xl tabular-nums">{views.toLocaleString()}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-paper/70">verified views</p>
                </div>
              </div>

              <div className="absolute right-3 bottom-20 flex flex-col items-center gap-4 text-[10px] text-paper/90">
                <span className="grid justify-items-center gap-1"><Heart className="size-6" />{Math.round(views * 0.09 / 100) / 10}K</span>
                <span className="grid justify-items-center gap-1"><MessageCircle className="size-6" />{Math.round(views * 0.004)}</span>
                <span className="grid justify-items-center gap-1"><Share2 className="size-6" />{Math.round(views * 0.012)}</span>
              </div>
              <div className="absolute inset-x-4 bottom-5 text-xs">
                <p className="font-medium">@yourname</p>
                <p className="mt-0.5 text-paper/75">the part everyone replays #redroom</p>
              </div>
            </div>
          </div>

          {/* the money */}
          <div>
            <div className="rounded-[2rem] border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.02] p-6 md:p-8">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="font-mono text-[11px] tracking-[0.2em] text-mute uppercase">Your balance</p>
                  <p className="mt-3 font-display text-6xl leading-none tabular-nums md:text-7xl">{money(net)}</p>
                  <p className="mt-2 text-sm text-mute">{views.toLocaleString()} verified views · ${rate} per 1,000 · after our {SITE.platformFeePct}% fee</p>
                </div>
                <button type="button" onClick={play} className="inline-flex h-11 items-center gap-2 rounded-full border border-line-strong px-5 text-sm text-mute transition-colors hover:text-paper">
                  <RotateCcw className="size-4" /> Replay
                </button>
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                {RATES.map((r) => (
                  <button key={r} type="button" onClick={() => setRate(r)} aria-pressed={rate === r} className={cn('h-10 rounded-full border px-4 text-sm transition-colors', rate === r ? 'border-paper bg-paper text-ink' : 'border-line-strong text-mute hover:text-paper')}>
                    ${r} per 1,000
                  </button>
                ))}
              </div>
            </div>

            <ol className="mt-6 grid gap-2">
              {STEPS.map((s, i) => (
                <li key={s.title} className={cn('flex gap-4 rounded-2xl border px-5 py-4 transition-all duration-500', i <= current ? 'border-white/15 bg-white/[0.05]' : 'border-transparent opacity-40')}>
                  <span className={cn('grid size-8 shrink-0 place-items-center rounded-full text-sm transition-colors duration-500', i < current || (i === current && t >= 0.98) ? 'bg-paper text-ink' : i === current ? 'bg-white/15' : 'bg-white/[0.06] text-mute')}>
                    {i < current ? <Check className="size-4" /> : i + 1}
                  </span>
                  <span>
                    <span className="block font-medium">{s.title}</span>
                    <span className="block text-sm text-mute">{s.body}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>
    </Feature>
  )
}
