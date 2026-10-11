'use client'

import { motion, type Variants } from 'framer-motion'
import { EASE_OUT } from '@/lib/layout'
import { cn } from '@/lib/utils'

const container: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } } }
const item: Variants = {
  hidden: { opacity: 0, y: 18, scale: 0.985 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: EASE_OUT } },
}

/** A grid whose tiles glide in one after another. */
export function Bento({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div variants={container} initial="hidden" animate="show" className={cn('grid gap-4 md:grid-cols-6 xl:grid-cols-12', className)}>
      {children}
    </motion.div>
  )
}

/** One tile. It lifts a little when the pointer is over it. */
export function Tile({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div variants={item} whileHover={{ y: -3 }} transition={{ duration: 0.25 }} className={cn('relative overflow-hidden rounded-3xl border border-line bg-[#0a0a0b] transition-colors hover:border-line-strong', className)}>
      {children}
    </motion.div>
  )
}
