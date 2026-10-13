
import { AppFrame } from '@/components/app/frame'
import { requireSession } from '@/lib/session'

export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireSession()
  return (
    <AppFrame
      area="Brand"
      items={[
        { label: 'Overview', href: '/brand', icon: 'LayoutDashboard', exact: true },
        { label: 'Campaigns', href: '/brand/campaigns', icon: 'Megaphone' },
        { label: 'Clips', href: '/brand/submissions', icon: 'Clapperboard' },
        { label: 'Account', href: '/brand/billing', icon: 'CreditCard', match: ['/brand/settings'] },
      ]}
    >
      {children}
    </AppFrame>
  )
}
