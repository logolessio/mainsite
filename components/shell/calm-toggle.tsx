'use client'

import { X } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getCalm, hasCalmChoice, setCalm } from '@/lib/calm'

/** Applies the saved choice to the page. Renders nothing. */
export function CalmApply() {
  useEffect(() => {
    document.documentElement.classList.toggle('calm', getCalm())
  }, [])
  return null
}

/**
 * If nobody has chosen, watch how smoothly the page runs for a few seconds. When it is clearly struggling, switch calm mode
 * on and say so in the bottom right corner, with the reason and where to change it. A hidden tab is never judged.
 */
export function AutoCalm() {
  const [told, setTold] = useState(false)
  useEffect(() => {
    if (hasCalmChoice()) return
    let frames = 0
    let slow = 0
    let last = 0
    let raf = 0
    let started = 0
    let cancelled = false
    const begin = window.setTimeout(() => {
      const tick = (t: number) => {
        if (cancelled) return
        if (document.visibilityState !== 'visible') return void (cancelled = true)
        if (last) {
          const d = t - last
          if (d < 400) {
            frames++
            if (d > 50) slow++
          }
        }
        last = t
        if (!started) started = t
        if (t - started < 4000) raf = requestAnimationFrame(tick)
        else if (frames > 40 && slow / frames > 0.35) {
          setCalm(true, true)
          setTold(true)
        }
      }
      raf = requestAnimationFrame(tick)
    }, 2500)
    return () => {
      cancelled = true
      window.clearTimeout(begin)
      cancelAnimationFrame(raf)
    }
  }, [])
  if (!told) return null
  return (
    <div role="status" className="fixed right-4 bottom-4 z-[160] w-[min(24rem,calc(100vw-2rem))] rounded-3xl border border-line-strong bg-ink p-5 shadow-[0_24px_60px_-20px_rgb(0_0_0/0.6)]">
      <button type="button" aria-label="Dismiss" onClick={() => setTold(false)} className="absolute top-3 right-3 grid size-8 place-items-center rounded-full text-mute hover:bg-white/10">
        <X className="size-4" />
      </button>
      <p className="pr-8 text-[15px] font-medium">Calm mode is on</p>
      <p className="mt-2 text-sm leading-relaxed text-mute">
        Your device looked like it was struggling, so we turned off the heavy animations to keep the site smooth. You can switch it back in{' '}
        <Link href="/dashboard/settings" className="text-paper underline underline-offset-4">
          Settings
        </Link>
        .
      </p>
    </div>
  )
}
