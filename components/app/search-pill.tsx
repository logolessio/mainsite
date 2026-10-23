'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { warmSearch } from '@/lib/search-warm'
import { cn } from '@/lib/utils'
import { usePillPointer } from './pill-pointer'

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
  const { reduced, hover, wrap, chip, bind } = usePillPointer()
  const [i, setI] = useState(0)
  const [mac, setMac] = useState(false)

  useEffect(() => setMac(/mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent)), [])
  useEffect(() => {
    if (reduced || hover) return
    const t = window.setInterval(() => setI((n) => (n + 1) % HINTS.length), 3600)
    return () => window.clearInterval(t)
  }, [reduced, hover])
  useEffect(() => {
    if (hover) setI(0)
  }, [hover])

  return (
    <div ref={wrap} className={cn('sp group/pill relative', className)} {...bind} onPointerEnter={() => (bind.onPointerEnter(), warmSearch())} onFocus={warmSearch}>
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
export function Key({ children }: { children: React.ReactNode }) {
  return <kbd className="sp-key grid h-6 min-w-6 place-items-center rounded-md border border-b-2 px-1.5 font-mono text-[11px] leading-none">{children}</kbd>
}
