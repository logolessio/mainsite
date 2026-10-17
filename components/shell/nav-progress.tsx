'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useTransitions } from './transition-provider'

/**
 * A hairline along the top that starts moving the moment you press a link and finishes when the new page is there, so a slow
 * moment never looks like nothing happened.
 */
export function NavProgress() {
  const { phase } = useTransitions()
  const pathname = usePathname()
  const [on, setOn] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const was = useRef(false)

  useEffect(() => {
    if (phase === 'exiting') {
      was.current = true
      setFinishing(false)
      setOn(true)
    }
  }, [phase])
  useEffect(() => {
    if (!was.current) return
    // the page arrived (the path changed): run to the end, then fade away
    was.current = false
    setFinishing(true)
    const t = window.setTimeout(() => (setOn(false), setFinishing(false)), 380)
    return () => window.clearTimeout(t)
  }, [pathname])

  return (
    <AnimatePresence>
      {on && (
        <motion.div key="np" aria-hidden="true" initial={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.25 } }} className="pointer-events-none fixed inset-x-0 top-0 z-[300] h-[2px] bg-transparent">
          <motion.div
            className="h-full origin-left bg-paper shadow-[0_0_10px_rgb(243_242_238/0.6)]"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: finishing ? 1 : 0.86 }}
            transition={finishing ? { duration: 0.25, ease: 'easeOut' } : { duration: 7, ease: [0.1, 0.7, 0.2, 1] }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
