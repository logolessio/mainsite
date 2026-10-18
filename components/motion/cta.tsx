'use client'

import { ArrowUpRight } from 'lucide-react'
import { TransitionLink } from '@/components/shell/transition-link'
import { cn } from '@/lib/utils'

/** The site's button. Solid is the main action, ghost is a hairline outline for everything else. */
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
        'group inline-flex h-12 items-center gap-2 rounded-pill px-7 text-[15px] font-medium transition-colors duration-300',
        variant === 'solid' ? 'bg-paper text-ink hover:bg-white' : 'border border-white/20 text-paper hover:border-white/50 hover:bg-white/[0.06]',
        className,
      )}
    >
      {children}
      <ArrowUpRight aria-hidden="true" className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
    </TransitionLink>
  )
}
