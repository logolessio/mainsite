
import { AppFrame } from '@/components/app/frame'
import { requireSession } from '@/lib/session'

export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireSession()
  return (
    <AppFrame
      area="Brand"
      items={[
        { label: 'Home', href: '/brand', icon: 'LayoutGrid', exact: true },
        { label: 'Overview', href: '/brand/overview', icon: 'LayoutDashboard' },
        { label: 'Campaigns', href: '/brand/campaigns', icon: 'Megaphone' },
        { label: 'Clips', href: '/brand/submissions', icon: 'Clapperboard' },
        { label: 'Balance', href: '/brand/balance', icon: 'Wallet', match: ['/brand/billing'] },
        { label: 'Settings', href: '/brand/settings', icon: 'Settings' },
      ]}
    >
      {children}
    </AppFrame>
  )
}
