'use client'

import { usePathname } from 'next/navigation'
import { useNavUser } from './nav-user'
import { TransitionLink } from './transition-link'

const PAGES = ['/for-creators', '/for-brands', '/about', '/pricing', '/faq', '/case-studies']

/** On phones, the main action stays at the bottom of the information pages. Hidden once someone has an account. */
export function StickyCta() {
  const pathname = usePathname()
  const { user } = useNavUser()
  if (!PAGES.includes(pathname) || user?.signedIn) return null
  const brand = pathname === '/for-brands'
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[55] flex justify-center px-4 md:hidden">
      <TransitionLink href={brand ? '/onboarding?role=brand' : '/onboarding'} className="pointer-events-auto inline-flex h-12 w-full max-w-sm items-center justify-center rounded-pill bg-paper text-[15px] font-medium text-ink shadow-[0_12px_30px_-10px_rgb(0_0_0/0.5)]">
        {brand ? 'Launch a campaign' : 'Get started'}
      </TransitionLink>
    </div>
  )
}
