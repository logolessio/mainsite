'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Moon, Sun } from 'lucide-react'
import { useEffect, useState, type MouseEvent } from 'react'
import { flushSync } from 'react-dom'
import { LiquidGlass } from '@/components/ui/liquid-glass'
import { useMotionPrefs } from '@/hooks/use-motion-prefs'
import { useFeature } from './features-provider'

const KEY = 'logoless:theme'
const SIZE = 'size-11'
const EASE = 'cubic-bezier(0.2, 0.8, 0.2, 1)'
const REVEAL_MS = 720

/**
 * The sun and moon button beside Search (shown only while the owner has Light mode switched on under Design). It sets data-theme="light" on the page, which globals.css turns into the light
 * look, and remembers the choice on this device; the small script in the page head puts it back before anything is drawn, so there is no flash.
 * It shows where it will take you: a sun while the site is dark, a moon while it is light.
 *
 * The switch is a reveal: the new look spreads out from the button in a widening circle over the old one (a view transition, so the page is
 * drawn once in each look and the browser only moves a mask). Calm mode, reduced motion and browsers without view transitions get the plain
 * colour fade from globals.css instead.
 */
export function ThemeToggle() {
  const on = useFeature('light-theme')
  const { reduced } = useMotionPrefs()
  const [light, setLight] = useState(false)
  useEffect(() => setLight(document.documentElement.dataset.theme === 'light'), [])
  if (!on) return null

  const flip = (e: MouseEvent<HTMLElement>) => {
    const next = !light
    const html = document.documentElement
    const apply = () => {
      flushSync(() => setLight(next))
      if (next) html.dataset.theme = 'light'
      else delete html.dataset.theme
    }
    try {
      localStorage.setItem(KEY, next ? 'light' : 'dark')
    } catch {
      /* the choice just is not remembered */
    }

    if (reduced || typeof document.startViewTransition !== 'function') return apply()

    // the circle starts at the middle of the button and grows until it covers the farthest corner of the screen. It is given in percentages of
    // the snapshot, not pixels: some browsers draw the snapshot at device pixels, and pixel positions then land in the wrong place
    const r = e.currentTarget.getBoundingClientRect()
    const w = innerWidth
    const h = innerHeight
    const x = r.left + r.width / 2
    const y = r.top + r.height / 2
    const at = `at ${((x / w) * 100).toFixed(3)}% ${((y / h) * 100).toFixed(3)}%`
    const end = (Math.hypot(Math.max(x, w - x), Math.max(y, h - y)) / (Math.hypot(w, h) / Math.SQRT2)) * 100 // circle() % is of the box's diagonal over √2
    html.dataset.themeSwitch = ''
    const t = document.startViewTransition(apply)
    t.ready
      .then(() => {
        html.animate(
          { clipPath: [`circle(0% ${at})`, `circle(${end.toFixed(3)}% ${at})`] },
          { duration: REVEAL_MS, easing: EASE, pseudoElement: '::view-transition-new(root)' },
        )
      })
      .catch(() => {
        /* the switch already happened; only the reveal is skipped */
      })
    void t.finished.finally(() => delete html.dataset.themeSwitch)
  }

  return (
    <LiquidGlass
      as="button"
      type="button"
      onClick={flip}
      aria-label={light ? 'Switch to dark mode' : 'Switch to light mode'}
      aria-pressed={light}
      title={light ? 'Dark mode' : 'Light mode'}
      rootClassName="pointer-events-auto"
      className={`${SIZE} grid place-items-center overflow-hidden text-mute transition-colors hover:text-paper`}
      look={{ zRadius: 12 }}
    >
      {/* the icon turns as it swaps: the old one rolls away, the new one rolls in */}
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={light ? 'moon' : 'sun'}
          className="col-start-1 row-start-1 grid place-items-center"
          initial={reduced ? { opacity: 0 } : { opacity: 0, rotate: -90, scale: 0.5 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, rotate: 90, scale: 0.5 }}
          transition={{ duration: reduced ? 0.15 : 0.45, ease: [0.2, 0.8, 0.2, 1] }}
        >
          {light ? <Moon aria-hidden="true" className="size-[18px]" /> : <Sun aria-hidden="true" className="size-[18px]" />}
        </motion.span>
      </AnimatePresence>
    </LiquidGlass>
  )
}
