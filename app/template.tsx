'use client'

import { motion } from 'framer-motion'

/** Every page simply fades in. */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}>
      {children}
    </motion.div>
  )
}
