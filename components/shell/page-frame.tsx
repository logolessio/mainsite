'use client'

import { motion } from 'framer-motion'
import { useTransitions } from './transition-provider'

export function PageFrame({ children }: { children: React.ReactNode }) {
  const { phase } = useTransitions()
  const exiting = phase === 'exiting'

  return (
    <motion.div
      animate={exiting ? { opacity: 0 } : { opacity: 1 }}
      transition={exiting ? { duration: 0.17, ease: [0.4, 0, 0.2, 1] } : { duration: 0 }}
      className="relative z-10 min-h-dvh"
    >
      {children}
    </motion.div>
  )
}
