'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import { useDesign } from '@/components/shell/design-provider'
import { useMotionPrefs } from '@/hooks/use-motion-prefs'

/** Moves its children vertically at a different speed than the page. */
export function Parallax({
  children,
  distance = 80,
  className,
}: {
  children: React.ReactNode
  distance?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const { reduced } = useMotionPrefs()
  const { scrollEffects } = useDesign()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], reduced || !scrollEffects ? [0, 0] : [distance, -distance])
  return (
    <div ref={ref} className={className}>
      <motion.div style={{ y }} className="will-change-transform">{children}</motion.div>
    </div>
  )
}

/** Oversized outlined word that drifts sideways while you scroll past it. */
export function DriftWord({ text, from = '10%', to = '-30%' }: { text: string; from?: string; to?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const { scrollEffects } = useDesign()
  const x = useTransform(scrollYProgress, [0, 1], scrollEffects ? [from, to] : [from, from])
  return (
    <div ref={ref} aria-hidden="true" className="pointer-events-none overflow-hidden py-6 select-none">
      <motion.p
        style={{ x, WebkitTextStroke: '1px rgb(243 242 238 / 0.16)' }}
        className="font-display font-display-thin will-change-transform whitespace-nowrap text-[26vw] leading-[0.8] text-transparent"
      >
        {text}
      </motion.p>
    </div>
  )
}
