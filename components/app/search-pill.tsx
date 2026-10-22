'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

/** The first line is what the bar has always said; the others show, one at a time, what it can do. */
const HINTS = ['Search, or do something', 'Try "request a payout"', 'Try "find a campaign"', 'Try "open settings"', 'Try "my earnings"']

/**
 * The search bar in the top bar of the dashboards. It opens the command palette (the same one the / and Command K keys open).
 * A fine gradient edge that lights up violet on hover, a round search chip, a line of hints that changes every few seconds so the
 * bar says what it can do, and the shortcut drawn as real keys. Hovering also sweeps a soft sheen across it.
 */
export function SearchPill({ onOpen, className }: { onOpen: () => void; className?: string }) {
  const reduced = useReducedMotion()
  const [i, setI] = useState(0)
  const [hover, setHover] = useState(false)
  const [mac, setMac] = useState(false)

  useEffect(() => setMac(/mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent)), [])
  // the hints change on their own, and stay on the first line while the bar is being looked at
  useEffect(() => {
    if (reduced || hover) return
    const t = window.setInterval(() => setI((n) => (n + 1) % HINTS.length), 3600)
    return () => window.clearInterval(t)
  }, [reduced, hover])
  useEffect(() => {
    if (hover) setI(0)
  }, [hover])

  return (
    <div className={cn('group/pill relative', className)}>
      {/* the soft glow under the bar, which only shows on hover and focus */}
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-6 -bottom-3 h-6 rounded-full bg-[rgb(255_31_56/0.32)] opacity-0 blur-xl transition-opacity duration-500 group-hover/pill:opacity-100 group-focus-within/pill:opacity-100" />
      {/* the edge: a one pixel gradient that the bar sits inside */}
      <div className="relative rounded-pill bg-gradient-to-b from-white/[0.22] via-white/[0.08] to-white/[0.05] p-px transition-[background] duration-500 group-hover/pill:from-[rgb(255_70_90/0.75)] group-hover/pill:via-[rgb(255_31_56/0.22)] group-hover/pill:to-[rgb(255_31_56/0.14)] group-focus-within/pill:from-[rgb(255_70_90/0.75)]">
        <button
          type="button"
          onClick={onOpen}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          data-search-pill
          aria-label="Search, or do something"
          aria-keyshortcuts="/ Control+K Meta+K"
          className="relative flex h-12 w-full min-w-0 items-center gap-3 overflow-hidden rounded-pill bg-[linear-gradient(180deg,rgb(17_17_17)_0%,rgb(6_6_6)_100%)] py-0 pr-3 pl-1.5 text-left text-[14px] text-paper/65 transition-[color,transform] duration-300 outline-none group-hover/pill:text-paper focus-visible:text-paper active:scale-[0.99]"
        >
          {/* a sheen that sweeps across once on hover */}
          <span aria-hidden="true" data-sheen className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-[18deg] bg-gradient-to-r from-transparent via-white/[0.07] to-transparent transition-transform duration-[900ms] ease-out group-hover/pill:translate-x-[420%]" />
          <span className="relative grid size-9 shrink-0 place-items-center rounded-full bg-white/[0.06] text-paper/70 shadow-[inset_0_1px_0_rgb(255_255_255/0.08)] transition-colors duration-300 group-hover/pill:bg-[rgb(255_31_56/0.2)] group-hover/pill:text-white">
            <Search aria-hidden="true" className="size-[15px]" />
          </span>
          <span className="relative h-5 min-w-0 flex-1 overflow-hidden" aria-hidden="true">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={i}
                className="absolute inset-0 block truncate leading-5"
                initial={reduced ? false : { y: 12, opacity: 0, filter: 'blur(4px)' }}
                animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
                exit={reduced ? undefined : { y: -12, opacity: 0, filter: 'blur(4px)' }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              >
                {HINTS[i]}
              </motion.span>
            </AnimatePresence>
          </span>
          <span aria-hidden="true" className="relative flex shrink-0 items-center gap-1">
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
  return (
    <kbd className="grid h-6 min-w-6 place-items-center rounded-md border border-b-2 border-white/[0.14] bg-white/[0.05] px-1.5 font-mono text-[11px] leading-none text-paper/65 transition-colors duration-300 group-hover/pill:border-[rgb(255_70_90/0.55)] group-hover/pill:text-paper">
      {children}
    </kbd>
  )
}
