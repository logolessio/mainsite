'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { useTransitions } from './transition-provider'

/**
 * A hairline along the top that starts moving once a page has been asked for and is taking a moment, and finishes when the new
 * page is there. A page that arrives at once never shows it, and the old page stays exactly as it was until the new one is ready,
 * so a slow moment never looks like nothing happened and a fast one never flashes.
 */
export function NavProgress() {
  const { pending } = useTransitions()
  const [on, setOn] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const shown = useRef(false)

  useEffect(() => {
    if (pending) {
      // only if it is still waiting after a moment
      const t = window.setTimeout(() => {
        shown.current = true
        setFinishing(false)
        setOn(true)
      }, 160)
      return () => window.clearTimeout(t)
    }
    if (!shown.current) return
    // the page arrived: run to the end, then fade away
    shown.current = false
    setFinishing(true)
    const t = window.setTimeout(() => (setOn(false), setFinishing(false)), 380)
    return () => window.clearTimeout(t)
  }, [pending])

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
