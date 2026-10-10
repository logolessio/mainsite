'use client'

import { motion } from 'framer-motion'

/** Every page simply fades in. */
export default function Template({ children }: { children: React.ReactNode }) {
  // During a cover-art transition the browser does the cross-fade itself, so the page must already be visible.
  const handoff = typeof document !== 'undefined' && document.documentElement.dataset.vt === '1'
  return (
    <motion.div initial={handoff ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}>
      {children}
    </motion.div>
  )
}
