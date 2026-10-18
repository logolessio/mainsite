'use client'

import { motion, type HTMLMotionProps } from 'framer-motion'
import { useDesign } from '@/components/shell/design-provider'
import { EASE_OUT } from '@/lib/layout'
import { useReveal } from './use-reveal'

type Props = HTMLMotionProps<'div'> & { delay?: number; x?: number; y?: number; blur?: boolean; as?: 'div' | 'li' }

/** Fades content in as it scrolls into view (when scroll effects are on). Content already on screen is never hidden: see use-reveal. */
export function Reveal({ delay = 0, x: _x = 0, y: _y = 0, blur: _blur = false, as = 'div', children, ...rest }: Props) {
  const { scrollEffects } = useDesign()
  const { ref, state } = useReveal<HTMLDivElement>(scrollEffects)
  const Tag = (as === 'li' ? motion.li : motion.div) as typeof motion.div
  return (
    <Tag
      ref={ref}
      initial={false}
      animate={{ opacity: state === 'hidden' ? 0 : 1 }}
      transition={state === 'hidden' ? { duration: 0 } : { duration: 0.5, delay: Math.min(delay, 0.15), ease: EASE_OUT }}
      {...rest}
    >
      {children}
    </Tag>
  )
}

/** A hairline that draws itself left to right as it scrolls into view. */
export function Rule({ className = '', delay = 0 }: { className?: string; delay?: number }) {
  const { scrollEffects } = useDesign()
  const { ref, state } = useReveal<HTMLDivElement>(scrollEffects, '0px 0px -10% 0px')
  return (
    <motion.div
      ref={ref}
      aria-hidden="true"
      initial={false}
      animate={{ scaleX: state === 'hidden' ? 0 : 1 }}
      transition={state === 'hidden' ? { duration: 0 } : { duration: 1.2, delay, ease: EASE_OUT }}
      className={`h-px origin-left bg-line-strong ${className}`}
    />
  )
}
