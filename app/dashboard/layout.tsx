
import { AppFrame } from '@/components/app/frame'
import { requireSession } from '@/lib/session'

export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireSession()
  return (
    <AppFrame
      area="Creator"
      items={[
        { label: 'Overview', href: '/dashboard', icon: 'LayoutDashboard', exact: true, match: ['/dashboard/setup'] },
        { label: 'Submissions', href: '/dashboard/submissions', icon: 'Clapperboard' },
        { label: 'Earnings', href: '/dashboard/earnings', icon: 'CircleDollarSign', match: ['/dashboard/payouts'] },
        { label: 'Profile', href: '/dashboard/profile', icon: 'UserCheck', match: ['/dashboard/achievements', '/dashboard/accounts', '/dashboard/saved', '/dashboard/recap'] },
        { label: 'Settings', href: '/dashboard/settings', icon: 'Settings', match: ['/dashboard/notifications'] },
      ]}
    >
      {children}
    </AppFrame>
  )
}
