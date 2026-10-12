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
  /** Animate on mount instead of when scrolled into view (for heroes). */
  immediate?: boolean
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span'
  id?: string
  /** Adds the travelling light sweep. Use on hero headlines only. */
  sweep?: boolean
  /** Words to render in the signal colour. */
  accent?: string[]
  align?: 'center' | 'left'
}

/** Masked word-by-word rise. Each word slides up from behind its own baseline. */
export function Words({ id, sweep = false, text, className, delay = 0, stagger = 0.06, immediate, as = 'h2', accent = [], align = 'center' }: Props) {
  const Tag = motion[as] as typeof motion.h2
  const { tx } = useCopy()
  const shown = tx(text)
  const words = shown.split(' ')
  const trigger = immediate
    ? { animate: 'show' }
    : { whileInView: 'show', viewport: { once: true, margin: '0px 0px -12% 0px' } }
  return (
    <Tag
      id={id}
      aria-label={shown}
      initial="hidden"
      {...trigger}
      transition={{ staggerChildren: stagger, delayChildren: delay }}
      className={cn('flex flex-wrap gap-x-[0.25em]', align === 'center' ? 'justify-center text-center' : 'justify-start text-left', className)}
    >
      {words.map((w, i) => (
        <span key={i} aria-hidden="true" className="inline-block overflow-hidden px-[0.08em] pt-[0.12em] pb-[0.32em] -mx-[0.08em] -mt-[0.12em] -mb-[0.32em] align-bottom">
          <motion.span
            variants={{ hidden: { y: '110%' }, show: { y: '0%' } }}
            transition={{ duration: 1, ease: EASE_OUT }}
            className={cn('inline-block origin-bottom-left px-[0.08em] pt-[0.12em] pb-[0.32em] -mx-[0.08em] -mt-[0.12em] -mb-[0.32em]', sweep && 'sweep')}
          >
            {w}
          </motion.span>
        </span>
      ))}
    </Tag>
  )
}
