'use client'

import { ArrowUpRight } from 'lucide-react'
import { TransitionLink } from '@/components/shell/transition-link'
import { cn } from '@/lib/utils'
import { Magnetic } from './magnetic'

export function PillLink({
  href,
  children,
  variant = 'solid',
  className,
}: {
  href: string
  children: React.ReactNode
  variant?: 'solid' | 'ghost'
  className?: string
}) {
  return (
    <Magnetic>
    <TransitionLink
      href={href}
      className={cn(
        'group inline-flex h-12 items-center gap-2 rounded-full px-6 text-sm font-medium transition-colors',
        variant === 'solid' ? 'bg-paper text-ink hover:bg-paper/85' : 'glass-liquid hover:brightness-125',
        className,
      )}
    >
      {children}
      <ArrowUpRight
        aria-hidden="true"
        className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
      />
    </TransitionLink>
    </Magnetic>
  )
}
