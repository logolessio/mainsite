'use client'

import { ArrowUpRight } from 'lucide-react'
import { useFeature } from '@/components/shell/features-provider'
import { useSignedIn } from '@/components/shell/nav-user'
import { TransitionLink } from '@/components/shell/transition-link'
import { cn } from '@/lib/utils'

/**
 * Someone who is already signed in has no use for a "Get started" button: any button that goes to sign-up becomes "Dashboard" and goes to
 * the dashboard for that part of the site (a brand's sign-up to the brand dashboard, everything else to the creator dashboard).
 */
export function useSignupSwap(href: string): { href: string; swapped: boolean } {
  const signedIn = useSignedIn()
  const on = useFeature('smart-cta')
  if (!on || !signedIn || !href.startsWith('/onboarding')) return { href, swapped: false }
  return { href: /role=brand/.test(href) ? '/brand' : '/dashboard', swapped: true }
}

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
  const swap = useSignupSwap(href)
  return (
    <TransitionLink
      href={swap.href}
      className={cn(
        'group inline-flex h-12 items-center gap-2 rounded-pill px-7 text-[15px] font-medium transition-colors duration-300',
        variant === 'solid' ? 'bg-paper text-ink hover:bg-white' : 'border border-white/20 text-paper hover:border-white/50 hover:bg-white/[0.06]',
        className,
      )}
    >
      {swap.swapped ? 'Dashboard' : children}
      <ArrowUpRight aria-hidden="true" className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
    </TransitionLink>
  )
}
