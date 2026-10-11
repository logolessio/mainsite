'use client'

import { motion } from 'framer-motion'

/** Every page rises in from slightly below. */
export default function Template({ children }: { children: React.ReactNode }) {
  // During a cover-art transition the browser does the cross-fade itself, so the page must already be visible.
  const handoff = typeof document !== 'undefined' && document.documentElement.dataset.vt === '1'
  return (
    <motion.div
      initial={handoff ? false : { opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}
