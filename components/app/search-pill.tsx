'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

/** The first line is what the bar has always said; the others show, one at a time, what it can do. */
const HINTS = ['Search, or do something', 'Try "request a payout"', 'Try "find a campaign"', 'Try "open settings"', 'Try "my earnings"']

/**
 * The search bar in the top bar of the dashboards. It opens the command palette (the same one the / and Command K keys open).
 *
 * Pointing at it wakes it up: a soft light follows the pointer across the inside, a bright arc runs round the edge, the search chip leans
 * towards the pointer, a caret blinks after the words as if it were waiting to be typed in, and the keys light up. The line of hints changes by itself
 * while nobody is looking and stays on the first one while somebody is. The moving parts are plain CSS (see .sp-* in globals.css): the pointer's place is
 * written to two variables and nothing is drawn again for it.
 */
export function SearchPill({ onOpen, className }: { onOpen: () => void; className?: string }) {
  const reduced = useReducedMotion()
  const [i, setI] = useState(0)
  const [hover, setHover] = useState(false)
  const [mac, setMac] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)
  const chip = useRef<HTMLSpanElement>(null)
  const frame = useRef(0)

  useEffect(() => setMac(/mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent)), [])
  useEffect(() => {
    if (reduced || hover) return
    const t = window.setInterval(() => setI((n) => (n + 1) % HINTS.length), 3600)
    return () => window.clearInterval(t)
  }, [reduced, hover])
  useEffect(() => {
    if (hover) setI(0)
  }, [hover])
  useEffect(() => () => cancelAnimationFrame(frame.current), [])

  const move = (e: React.PointerEvent) => {
    if (reduced) return
    const { clientX, clientY } = e
    cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => {
      const w = wrap.current
      if (!w) return
      const r = w.getBoundingClientRect()
      w.style.setProperty('--mx', `${clientX - r.left}px`)
      w.style.setProperty('--my', `${clientY - r.top}px`)
      // the chip leans towards the pointer, a few pixels at most
      const c = chip.current?.getBoundingClientRect()
      if (c) {
        const dx = Math.max(-4, Math.min(4, (clientX - (c.left + c.width / 2)) / 26))
        const dy = Math.max(-3, Math.min(3, (clientY - (c.top + c.height / 2)) / 18))
        w.style.setProperty('--ix', `${dx.toFixed(2)}px`)
        w.style.setProperty('--iy', `${dy.toFixed(2)}px`)
      }
    })
  }
  const leave = () => {
    setHover(false)
    const w = wrap.current
    w?.style.setProperty('--ix', '0px')
    w?.style.setProperty('--iy', '0px')
  }

  return (
    <div ref={wrap} className={cn('sp group/pill relative', className)} onPointerEnter={() => setHover(true)} onPointerMove={move} onPointerLeave={leave}>
      {/* the soft glow under the bar, which only shows on hover and focus */}
      <span aria-hidden="true" className="sp-under pointer-events-none absolute inset-x-8 -bottom-4 h-8 rounded-full blur-xl" />
      {/* the edge: a one pixel line that lights up, with a bright arc that runs round it while the bar is pointed at */}
      <div className="sp-edge relative rounded-pill p-px">
        <span aria-hidden="true" className="sp-ring" />
        <button
          type="button"
          onClick={onOpen}
          data-search-pill
          aria-label="Search, or do something"
          aria-keyshortcuts="/ Control+K Meta+K"
          className="sp-body relative flex h-12 w-full min-w-0 items-center gap-3 overflow-hidden rounded-pill py-0 pr-3 pl-1.5 text-left text-[14px] text-paper/65 outline-none"
        >
          {/* the light that follows the pointer, and a sheen that sweeps across once */}
          <span aria-hidden="true" className="sp-spot pointer-events-none absolute inset-0" />
          <span aria-hidden="true" data-sheen className="sp-sheen pointer-events-none absolute inset-y-0 -left-1/3 w-1/3" />
          <span ref={chip} className="sp-chip relative grid size-9 shrink-0 place-items-center rounded-full">
            <Search aria-hidden="true" className="sp-lens size-[15px]" />
          </span>
          <span className="relative flex h-5 min-w-0 flex-1 items-center overflow-hidden" aria-hidden="true">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={i}
                className="block truncate leading-5"
                initial={reduced ? false : { y: 12, opacity: 0, filter: 'blur(4px)' }}
                animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
                exit={reduced ? undefined : { y: -12, opacity: 0, filter: 'blur(4px)' }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              >
                {HINTS[i]}
              </motion.span>
            </AnimatePresence>
            <span className="sp-caret ml-0.5 inline-block h-4 w-px shrink-0 bg-current" />
          </span>
          <span aria-hidden="true" className="sp-keys relative flex shrink-0 items-center gap-1">
            <Key>{mac ? '⌘' : 'Ctrl'}</Key>
            <Key>K</Key>
          </span>
        </button>
      </div>
    </div>
  )
}

/** A key as it looks on a keyboard: a little raised cap with a thicker lower edge. */
function Key({ children }: { children: React.ReactNode }) {
  return <kbd className="sp-key grid h-6 min-w-6 place-items-center rounded-md border border-b-2 px-1.5 font-mono text-[11px] leading-none">{children}</kbd>
}
