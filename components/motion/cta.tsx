'use client'

import { ArrowUpRight } from 'lucide-react'
import { TransitionLink } from '@/components/shell/transition-link'
import { cn } from '@/lib/utils'

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
    <TransitionLink
      href={href}
      className={cn(
        'group inline-flex h-12 items-center gap-2 px-6 text-sm font-medium transition-colors',
        variant === 'solid' ? 'bg-paper text-ink hover:bg-paper/85' : 'border border-line-strong hover:bg-paper/10',
        className,
      )}
    >
      {children}
      <ArrowUpRight
        aria-hidden="true"
        className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
      />
    </TransitionLink>
  )
}
