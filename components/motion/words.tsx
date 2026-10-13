'use client'

import { motion } from 'framer-motion'
import { EASE_OUT } from '@/lib/layout'
import { cn } from '@/lib/utils'
import { useCopy } from '@/components/shell/copy-provider'

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

/** A headline. It fades in once, quietly. (It used to rise word by word; that was too much.) */
export function Words({ id, text, className, delay = 0, immediate, as = 'h2', align = 'center' }: Props) {
  const Tag = motion[as] as typeof motion.h2
  const { tx } = useCopy()
  const shown = tx(text)
  const trigger = immediate ? { animate: { opacity: 1 } } : { whileInView: { opacity: 1 }, viewport: { once: true, margin: '0px 0px -8% 0px' } }
  return (
    <Tag id={id} initial={{ opacity: 0 }} {...trigger} transition={{ duration: 0.55, delay: Math.min(delay, 0.1), ease: EASE_OUT }} className={cn(align === 'center' ? 'text-center' : 'text-left', className)}>
      {shown}
    </Tag>
  )
}
