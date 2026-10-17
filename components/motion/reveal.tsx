'use client'

import { motion, type HTMLMotionProps } from 'framer-motion'
import { useDesign } from '@/components/shell/design-provider'
import { EASE_OUT } from '@/lib/layout'

type Props = HTMLMotionProps<'div'> & { delay?: number; x?: number; y?: number; blur?: boolean; as?: 'div' | 'li' }

/** Fades and slides content in once it scrolls into view. */
export function Reveal({ delay = 0, x: _x = 0, y: _y = 0, blur: _blur = false, as = 'div', children, ...rest }: Props) {
  const { scrollEffects } = useDesign()
  const Tag = (as === 'li' ? motion.li : motion.div) as typeof motion.div
  if (!scrollEffects) return <Tag initial={false} {...rest}>{children}</Tag>
  return (
    <Tag
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: '0px 0px -8% 0px' }}
      transition={{ duration: 0.5, delay: Math.min(delay, 0.15), ease: EASE_OUT }}
      {...rest}
    >
      {children}
    </Tag>
  )
}

/** A hairline that draws itself left to right. */
export function Rule({ className = '', delay = 0 }: { className?: string; delay?: number }) {
  const { scrollEffects } = useDesign()
  if (!scrollEffects) return <div aria-hidden="true" className={`h-px bg-line-strong ${className}`} />
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
