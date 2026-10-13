import { AppFrame } from '@/components/app/frame'
import type { AppNavItem } from '@/components/app/nav-types'
import { featureOn } from '@/lib/features'
import { requireSession } from '@/lib/session'

export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireSession()
  const [saved, recap] = await Promise.all([featureOn('saved-campaigns'), featureOn('recap')])
  const items: AppNavItem[] = [
    { label: 'Overview', href: '/dashboard', icon: 'LayoutDashboard', exact: true },
    { label: 'Campaigns', href: '/', icon: 'Search' },
    { label: 'Clips', href: '/dashboard/submissions', icon: 'Clapperboard' },
    { group: 'Money', label: 'Earnings', href: '/dashboard/earnings', icon: 'CircleDollarSign' },
    { label: 'Payouts', href: '/dashboard/payouts', icon: 'Banknote' },
    { group: 'You', label: 'Profile', href: '/dashboard/profile', icon: 'UserCheck' },
    { label: 'Achievements', href: '/dashboard/achievements', icon: 'Trophy' },
    { label: 'Linked accounts', href: '/dashboard/accounts', icon: 'Link2' },
    ...(saved ? [{ label: 'Saved', href: '/dashboard/saved', icon: 'Heart' } as AppNavItem] : []),
    ...(recap ? [{ label: 'Recap', href: '/dashboard/recap', icon: 'Sparkles' } as AppNavItem] : []),
    { group: 'Account', label: 'Notifications', href: '/dashboard/notifications', icon: 'Bell' },
    { label: 'Settings', href: '/dashboard/settings', icon: 'Settings' },
  ]
  return <AppFrame area="Clipper" items={items}>{children}</AppFrame>
}
