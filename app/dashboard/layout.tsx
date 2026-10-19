
import { AppFrame } from '@/components/app/frame'
import { requireSession } from '@/lib/session'

export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireSession()
  return (
    <AppFrame
      area="Creator"
      items={[
        { key: 'o', label: 'Overview', href: '/dashboard', icon: 'LayoutDashboard', exact: true, match: ['/dashboard/setup'] },
        { key: 's', label: 'Submissions', href: '/dashboard/submissions', icon: 'Clapperboard' },
        { key: 'e', label: 'Earnings', href: '/dashboard/earnings', icon: 'CircleDollarSign', match: ['/dashboard/payouts'] },
        { key: 'p', label: 'Profile', href: '/dashboard/profile', icon: 'UserCheck', match: ['/dashboard/achievements', '/dashboard/saved', '/dashboard/recap'] },
        { key: 'a', label: 'Accounts', href: '/dashboard/accounts', icon: 'Link2' },
        { key: 't', label: 'Settings', href: '/dashboard/settings', icon: 'Settings', match: ['/dashboard/notifications'] },
      ]}
    >
      {children}
    </AppFrame>
  )
}
