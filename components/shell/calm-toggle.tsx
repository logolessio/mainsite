'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { getCalm, getContrast, getLargeText, getUnderline, hasCalmChoice, setCalm } from '@/lib/calm'

/** Applies the saved choice to the page. Renders nothing. */
export function CalmApply() {
  useEffect(() => {
    document.documentElement.classList.toggle('calm', getCalm())
    document.documentElement.classList.toggle('text-large', getLargeText())
    document.documentElement.classList.toggle('contrast', getContrast())
    document.documentElement.classList.toggle('underline-links', getUnderline())
  }, [])
  return null
}

/**
 * If nobody has chosen, watch how smoothly the page runs for a few seconds. When it is clearly struggling, switch calm mode
 * on and say so in the bottom right corner, with the reason and where to change it. A hidden tab is never judged.
 */
/** How long the calm mode notice stays before it fades away by itself. Pointing at it (or focusing it) holds it. */
const NOTICE_MS = 20_000

export function AutoCalm() {
  const [told, setTold] = useState(false)
  const [held, setHeld] = useState(false)
  const left = useRef(NOTICE_MS)
  useEffect(() => {
    if (!told) return void (left.current = NOTICE_MS)
    if (held) return
    const started = Date.now()
    const t = window.setTimeout(() => setTold(false), left.current)
    return () => {
      window.clearTimeout(t)
      left.current = Math.max(1500, left.current - (Date.now() - started))
    }
  }, [told, held])
  // an admin's preview: show the pop-up without changing anything
  useEffect(() => {
    const show = () => setTold(true)
    window.addEventListener('logoless:preview-calm', show)
    return () => window.removeEventListener('logoless:preview-calm', show)
  }, [])
  useEffect(() => {
    // Calm mode used to switch itself on when a computer looked slow, which killed every animation and the glass in the middle of a visit and
    // showed as a flicker. It is only ever a choice the person makes in Settings now.
    if (hasCalmChoice() || true) return
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
  return (
    <AnimatePresence>
      {told && (
        <motion.div
          key="calm-notice"
          role="status"
          initial={{ opacity: 0, y: 14, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, transition: { duration: 0.6 } }}
          transition={{ duration: 0.35 }}
          onPointerEnter={() => setHeld(true)}
          onPointerLeave={() => setHeld(false)}
          onFocus={() => setHeld(true)}
          onBlur={() => setHeld(false)}
          className="fixed right-4 bottom-4 z-[160] w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-card border border-line-strong bg-ink p-5 shadow-[0_24px_60px_-20px_rgb(0_0_0/0.6)]"
        >
          <button type="button" aria-label="Dismiss" onClick={() => setTold(false)} className="absolute top-3 right-3 grid size-8 place-items-center rounded-pill text-mute hover:bg-white/10">
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
          {/* how long is left before it goes, as a hairline that empties (it pauses while the notice is pointed at) */}
          <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[2px] bg-white/[0.06]">
            <span className="calm-timer block h-full origin-left bg-paper/40" style={{ animationDuration: `${NOTICE_MS}ms`, animationPlayState: held ? 'paused' : 'running' }} />
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
