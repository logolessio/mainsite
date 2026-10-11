
import { AppFrame } from '@/components/app/frame'
import { featureOn } from '@/lib/features'
import { requireSession } from '@/lib/session'

export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireSession()
  const saved = await featureOn('saved-campaigns')
  const recap = await featureOn('recap')
  return (
    <AppFrame
      area="Clipper"
      items={[
        { label: 'Overview', href: '/dashboard', icon: 'LayoutDashboard', exact: true },
        { label: 'Find campaigns', href: '/', icon: 'Search' },
        { label: 'My clips', href: '/dashboard/submissions', icon: 'Clapperboard' },
        { label: 'Earnings', href: '/dashboard/earnings', icon: 'CircleDollarSign' },
        { label: 'Payouts', href: '/dashboard/payouts', icon: 'Landmark' },
        { label: 'Profile', href: '/dashboard/profile', icon: 'UserCheck' },
        { label: 'Achievements', href: '/dashboard/achievements', icon: 'Trophy' },
        ...(recap ? [{ label: 'Your recap', href: '/dashboard/recap', icon: 'Sparkles' as const }] : []),
        { label: 'Notifications', href: '/dashboard/notifications', icon: 'Bell' },
        ...(saved ? [{ label: 'Saved', href: '/dashboard/saved', icon: 'Heart' as const }] : []),
        { label: 'Linked accounts', href: '/dashboard/accounts', icon: 'Link2' },
        { label: 'Settings', href: '/dashboard/settings', icon: 'Settings' },
      ]}
    >
      {children}
    </AppFrame>
  )
}
