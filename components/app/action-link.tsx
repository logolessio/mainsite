'use client'

import { TransitionLink } from '@/components/shell/transition-link'
import { cn } from '@/lib/utils'

export function ActionLink({
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
        'inline-flex h-10 items-center justify-center gap-2 rounded-full px-5 text-sm transition-colors',
        variant === 'solid' ? 'bg-paper font-medium text-ink hover:bg-paper/85' : 'border border-line-strong hover:bg-paper/10',
        className,
      )}
    >
      {children}
    </TransitionLink>
  )
}
