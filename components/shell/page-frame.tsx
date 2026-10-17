'use client'

import { motion } from 'framer-motion'
import { usePathname } from 'next/navigation'
import { appArea } from '@/lib/app-areas'
import { useTransitions } from './transition-provider'

export function PageFrame({ children }: { children: React.ReactNode }) {
  const { phase } = useTransitions()
  const pathname = usePathname()
  // the dashboards fade only their own page (see DashShell), so the sidebar never blinks
  const exiting = phase === 'exiting' && !appArea(pathname)

  return (
    <motion.div
      animate={exiting ? { opacity: 0, y: -10 } : { opacity: 1, y: 0 }}
      transition={exiting ? { duration: 0.2, ease: [0.4, 0, 0.2, 1] } : { duration: 0 }}
      data-vt-frame=""
      className="relative z-10 min-h-dvh"
    >
      {children}
    </motion.div>
  )
}
