'use client'

import { motion, type HTMLMotionProps } from 'framer-motion'
import { EASE_OUT } from '@/lib/layout'

type Props = HTMLMotionProps<'div'> & { delay?: number; x?: number; y?: number; blur?: boolean }

/** Fades and slides content in once it scrolls into view. */
export function Reveal({ delay = 0, x = 0, y = 18, blur = false, children, ...rest }: Props) {
  return (
    <motion.div
      initial={blur ? { opacity: 0, x, y, scale: 0.985, filter: 'blur(8px)' } : { opacity: 0, x, y }}
      whileInView={blur ? { opacity: 1, x: 0, y: 0, scale: 1, filter: 'blur(0px)' } : { opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -12% 0px' }}
      transition={{ duration: 0.8, delay, ease: EASE_OUT }}
      {...rest}
    >
      {children}
    </motion.div>
  )
}

/** A hairline that draws itself left to right. */
export function Rule({ className = '', delay = 0 }: { className?: string; delay?: number }) {
  return (
    <motion.div
      aria-hidden="true"
      initial={{ scaleX: 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={{ once: true, margin: '0px 0px -10% 0px' }}
      transition={{ duration: 1.2, delay, ease: EASE_OUT }}
      className={`h-px origin-left bg-line-strong ${className}`}
    />
  )
}
