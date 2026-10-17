
import { AppFrame } from '@/components/app/frame'
import { requireSession } from '@/lib/session'

export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireSession()
  return (
    <AppFrame
      area="Brand"
      items={[
        { key: 'o', label: 'Overview', href: '/brand', icon: 'LayoutDashboard', exact: true, match: ['/brand/setup'] },
        { key: 'c', label: 'Campaigns', href: '/brand/campaigns', icon: 'Megaphone' },
        { key: 's', label: 'Submissions', href: '/brand/submissions', icon: 'Clapperboard' },
        { key: 'b', label: 'Balance', href: '/brand/balance', icon: 'Wallet', match: ['/brand/billing'] },
        { key: 't', label: 'Settings', href: '/brand/settings', icon: 'Settings' },
      ]}
    >
      {children}
    </AppFrame>
  )
}
