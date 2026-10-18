'use client'

import { motion } from 'framer-motion'
import { EASE_OUT } from '@/lib/layout'
import { cn } from '@/lib/utils'
import { useCopy } from '@/components/shell/copy-provider'
import { useDesign } from '@/components/shell/design-provider'
import { useReveal } from './use-reveal'

type Props = {
  text: string
  className?: string
  delay?: number
  stagger?: number
  /** Fade in on load instead of when scrolled into view (for heroes). */
  immediate?: boolean
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span'
  id?: string
  sweep?: boolean
  accent?: string[]
  align?: 'center' | 'left'
}

/** A headline. When scroll effects are on and it is below the fold, it fades in once as it arrives. On screen at load it is simply there. */
export function Words({ id, text, className, delay = 0, as = 'h2', align = 'center' }: Props) {
  const Tag = motion[as] as typeof motion.h2
  const { tx } = useCopy()
  const shown = tx(text)
  const { scrollEffects } = useDesign()
  const { ref, state } = useReveal<HTMLHeadingElement>(scrollEffects)
  return (
    <Tag
      ref={ref as never}
      id={id}
      initial={false}
      animate={{ opacity: state === 'hidden' ? 0 : 1 }}
      transition={state === 'hidden' ? { duration: 0 } : { duration: 0.55, delay: Math.min(delay, 0.1), ease: EASE_OUT }}
      className={cn(align === 'center' ? 'text-center' : 'text-left', className)}
    >
      {shown}
    </Tag>
  )
}
