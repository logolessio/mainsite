'use client'

import { motion } from 'framer-motion'
import { usePathname } from 'next/navigation'
import { appArea } from '@/lib/app-areas'
import { isInvitePath } from '@/lib/invite-shared'

/** Every page rises in from slightly below. Working areas only fade (their own shell eases the page in), so the sidebar never slides. (No blur or filter here: it would make fixed menus scroll with the page.) */
export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const app = appArea(pathname) !== null
  // An artist's private page fills the screen itself, so it must not sit inside an animated (transformed) wrapper.
  if (isInvitePath(pathname)) return <>{children}</>
  // During a cover-art transition the browser does the cross-fade itself, so the page must already be visible.
  const handoff = typeof document !== 'undefined' && (document.documentElement.dataset.vt === '1' || document.documentElement.dataset.vtPage === '1')
  return (
    <motion.div
      initial={handoff ? false : app ? { opacity: 0 } : { opacity: 0, y: 14 }}
      animate={app ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
      transition={{ duration: app ? 0.3 : 0.55, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  )
}
