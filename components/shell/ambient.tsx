'use client'

import { motion, useScroll, useSpring } from 'framer-motion'
import { usePathname } from 'next/navigation'
import { useDesign } from './design-provider'

const QUIET = ['/dashboard', '/brand', '/admin', '/onboarding', '/@', '/u/']

/** A thin progress line along the top of the page while you read. (The cursor glow and card spotlights were removed.) */
export function Ambient() {
  const pathname = usePathname()
  const { scrollYProgress } = useScroll()
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 28, mass: 0.4 })
  const { scrollEffects } = useDesign()
  const showProgress = scrollEffects && !QUIET.some((p) => pathname.startsWith(p))
  if (!showProgress) return null
  return <motion.div aria-hidden="true" style={{ scaleX: progress }} className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[2px] origin-left bg-paper" />
}
