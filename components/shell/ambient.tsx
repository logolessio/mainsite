'use client'

import { motion, useScroll, useSpring } from 'framer-motion'
import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { useMotionPrefs } from '@/hooks/use-motion-prefs'

const QUIET = ['/dashboard', '/brand', '/admin', '/onboarding', '/@', '/u/']

/**
 * Three small, cheap touches that run for the whole site:
 *  1. a soft light that follows the cursor,
 *  2. a spotlight that lights the edge of any card marked data-spot under the cursor,
 *  3. a thin progress line along the top while you read.
 * Everything is transform / opacity / CSS variables, and it all switches off for reduced motion and touch screens.
 */
export function Ambient() {
  const { reduced, canHover } = useMotionPrefs()
  const pathname = usePathname()
  const glow = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll()
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 28, mass: 0.4 })
  const showProgress = !QUIET.some((p) => pathname.startsWith(p))

  useEffect(() => {
    if (reduced || !canHover) return
    let raf = 0
    let x = 0
    let y = 0
    let target: Element | null = null
    const frame = () => {
      raf = 0
      if (glow.current) glow.current.style.transform = `translate3d(${x - 260}px, ${y - 260}px, 0)`
      const el = target
      if (el) {
        const r = el.getBoundingClientRect()
        ;(el as HTMLElement).style.setProperty('--mx', `${x - r.left}px`)
        ;(el as HTMLElement).style.setProperty('--my', `${y - r.top}px`)
      }
    }
    const onMove = (e: PointerEvent) => {
      x = e.clientX
      y = e.clientY
      target = (e.target as Element | null)?.closest?.('[data-spot]') ?? null
      if (!raf) raf = requestAnimationFrame(frame)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [reduced, canHover])

  return (
    <>
      {!reduced && canHover && (
        <div
          ref={glow}
          aria-hidden="true"
          className="pointer-events-none fixed top-0 left-0 z-[1] size-[520px] rounded-full bg-[radial-gradient(closest-side,rgb(255_255_255/0.055),transparent)] will-change-transform"
          style={{ transform: 'translate3d(-999px,-999px,0)' }}
        />
      )}
      {showProgress && <motion.div aria-hidden="true" style={{ scaleX: progress }} className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[2px] origin-left bg-signal" />}
    </>
  )
}
