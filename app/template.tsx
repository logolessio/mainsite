'use client'

import { motion } from 'framer-motion'
import { usePathname } from 'next/navigation'
import { isInvitePath } from '@/lib/invite-shared'

const APP_AREAS = ['/dashboard', '/brand', '/admin']

/** Every page rises in from slightly below. Working areas get a shorter, softer version so moving around feels instant. (No blur or filter here: it would make fixed menus scroll with the page.) */
export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const app = APP_AREAS.some((p) => pathname.startsWith(p))
  // An artist's private page fills the screen itself, so it must not sit inside an animated (transformed) wrapper.
  if (isInvitePath(pathname)) return <>{children}</>
  // During a cover-art transition the browser does the cross-fade itself, so the page must already be visible.
  const handoff = typeof document !== 'undefined' && document.documentElement.dataset.vt === '1'
  return (
    <motion.div
      initial={handoff ? false : app ? { opacity: 0, y: 12 } : { opacity: 0, y: 22 }}
      animate={app ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
      transition={{ duration: app ? 0.45 : 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}
