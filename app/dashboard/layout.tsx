
import { AppFrame } from '@/components/app/frame'
import { featureOn } from '@/lib/features'
import { requireSession } from '@/lib/session'

export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireSession()
  return (
    <AppFrame
      area="Clipper"
      items={[
        { label: 'Home', href: '/dashboard', icon: 'LayoutGrid', exact: true },
        { label: 'Overview', href: '/dashboard/overview', icon: 'LayoutDashboard' },
        { label: 'Getting set up', href: '/dashboard/setup', icon: 'Compass' },
        { label: 'Clips', href: '/dashboard/submissions', icon: 'Clapperboard' },
        { label: 'Earnings', href: '/dashboard/earnings', icon: 'CircleDollarSign', match: ['/dashboard/payouts'] },
        { label: 'Profile', href: '/dashboard/profile', icon: 'UserCheck', match: ['/dashboard/achievements', '/dashboard/accounts', '/dashboard/saved', '/dashboard/recap'] },
        { label: 'Settings', href: '/dashboard/settings', icon: 'Settings', match: ['/dashboard/notifications'] },
      ]}
    >
      {children}
    </AppFrame>
  )
}
