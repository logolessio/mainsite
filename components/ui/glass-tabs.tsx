'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { LiquidGlass } from '@/components/ui/liquid-glass'
import { TransitionLink } from '@/components/shell/transition-link'
import { EASE_OUT } from '@/lib/layout'
import { cn } from '@/lib/utils'

export type GlassTab = { id: string; label: string; href?: string }

type Spot = { left: number; width: number }
/** Where each menu's highlight was last, so a menu that is drawn again (because the page changed) starts from there and glides on. */
const lastSpot = new Map<string, Spot>()

/**
 * A row of choices on a pane of liquid glass. The highlight is one piece that glides and stretches from one choice to the next, even
 * when the choice is another page (the menu is then drawn again, and starts from where the highlight was). It moves the moment a
 * choice is pressed, not when the next page has arrived.
 * Centre it with its wrapper. Give each tab an `href` to use it as navigation, or an `onChange` to use it as a switch.
 */
export function GlassTabs({ tabs, value, onChange, label, className }: { tabs: GlassTab[]; value: string; onChange?: (id: string) => void; label: string; className?: string }) {
  const pathname = usePathname()
  const row = useRef<HTMLDivElement>(null)
  const nodes = useRef(new Map<string, HTMLElement>())
  const [chosen, setChosen] = useState<string | null>(null)
  const [spot, setSpot] = useState<Spot | null>(null)
  const [from, setFrom] = useState<Spot | null>(null)
  const [still, setStill] = useState(false) // true while the row is being resized: the highlight must follow at once, not glide
  const current = chosen ?? value

  // a page (or a parent) that has caught up with the press makes the press official
  useEffect(() => setChosen(null), [value])
  // a press that never led anywhere (a page that asked "leave without saving?" and was told no) must not leave the highlight on the wrong tab
  useEffect(() => {
    if (!chosen) return
    const t = window.setTimeout(() => setChosen(null), 2500)
    return () => window.clearTimeout(t)
  }, [chosen])

  const measure = useCallback(() => {
    const el = nodes.current.get(current)
    if (!el) return null
    return { left: el.offsetLeft, width: el.offsetWidth }
  }, [current])

  const first = useRef(true)
  useLayoutEffect(() => {
    const m = measure()
    if (!m) return
    if (first.current) {
      first.current = false
      setFrom(lastSpot.get(label) ?? m)
    }
    setSpot((prev) => (prev && prev.left === m.left && prev.width === m.width ? prev : m))
    lastSpot.set(label, m)
  }, [measure, label, tabs])

  useEffect(() => {
    const el = row.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => {
      const m = measure()
      if (!m) return
      setStill(true)
      setSpot(m)
      lastSpot.set(label, m)
      window.setTimeout(() => setStill(false), 60)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [measure, label])

  // The glass light is a tall, moving pseudo-element. If the scroller were the glass itself, that light would count as
  // scrollable overflow and a scrollbar would flash in and out. So the glass clips, and a plain inner row scrolls.
  return (
    <LiquidGlass rootClassName={cn('mx-auto w-fit max-w-full', className)} look={{ zRadius: 12 }}>
      <div ref={row} role={onChange ? 'tablist' : 'navigation'} {...(onChange ? {} : { 'data-kb-tabs': '' })} aria-label={label} className="no-scrollbar relative flex items-center gap-1 overflow-x-auto overflow-y-hidden p-1.5">
        {spot && from && (
          <motion.span
            aria-hidden="true"
            initial={{ x: from.left, width: from.width }}
            animate={{ x: spot.left, width: spot.width }}
            transition={still ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 38, mass: 0.9 }}
            className="absolute top-1.5 bottom-1.5 left-0 rounded-pill bg-paper"
          />
        )}
        {tabs.map((t) => {
          const on = t.id === current
          const cls = 'relative inline-flex h-10 shrink-0 items-center rounded-pill px-5 text-[15px] outline-none focus-visible:ring-2 focus-visible:ring-paper/60'
          const inner = (
            <>
              {/* before the highlight has been measured (the server's page), the chosen tab carries its own */}
              {on && !spot && <span aria-hidden="true" className="absolute inset-0 rounded-pill bg-paper" />}
              <span className={cn('relative transition-colors duration-300', on ? 'text-ink' : 'text-paper/60 hover:text-paper')} style={{ transitionTimingFunction: `cubic-bezier(${EASE_OUT.join(',')})` }}>
                {t.label}
              </span>
            </>
          )
          const ref = (el: HTMLElement | null) => {
            if (el) nodes.current.set(t.id, el)
            else nodes.current.delete(t.id)
          }
          if (!t.href) {
            return (
              <button key={t.id} ref={ref} type="button" role="tab" aria-selected={on} tabIndex={on ? 0 : -1} onClick={() => onChange?.(t.id)} className={cls}>
                {inner}
              </button>
            )
          }
          // a change of page goes through the page transition; a change that only alters the address's query stays on this page
          const Anchor = t.href.split(/[?#]/)[0] === pathname ? Link : TransitionLink
          return (
            <Anchor key={t.id} ref={ref} href={t.href} aria-current={on ? 'page' : undefined} onClick={() => setChosen(t.id)} className={cls}>
              {inner}
            </Anchor>
          )
        })}
      </div>
    </LiquidGlass>
  )
}

export { EASE_OUT }
