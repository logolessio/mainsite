
import { AppFrame } from '@/components/app/frame'
import { requireSession } from '@/lib/session'

export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireSession()
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
        { label: 'Notifications', href: '/dashboard/notifications', icon: 'Bell' },
        { label: 'Linked accounts', href: '/dashboard/accounts', icon: 'Link2' },
        { label: 'Settings', href: '/dashboard/settings', icon: 'Settings' },
      ]}
    >
      {children}
    </AppFrame>
  )
}
