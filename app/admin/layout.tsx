
import { AppFrame } from '@/components/app/frame'
import { requireSession } from '@/lib/session'

export const metadata = { title: 'Admin — logoless', robots: { index: false, follow: false } }

export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireSession('admin')
  return (
    <AppFrame
      area="Admin"
      items={[
        { label: 'Overview', href: '/admin', icon: 'LayoutDashboard', exact: true },
        { label: 'Review queue', href: '/admin/submissions', icon: 'Clapperboard' },
        { label: 'Fraud flags', href: '/admin/fraud', icon: 'ShieldAlert' },
        { label: 'Campaigns', href: '/admin/campaigns', icon: 'Megaphone' },
        { label: 'Users', href: '/admin/users', icon: 'Users' },
        { label: 'Earnings', href: '/admin/earnings', icon: 'CircleDollarSign' },
        { label: 'Payouts', href: '/admin/payouts', icon: 'Banknote' },
        { label: 'Audit log', href: '/admin/audit', icon: 'ScrollText' },
        { label: 'Settings', href: '/admin/settings', icon: 'Settings' },
      ]}
    >
      {children}
    </AppFrame>
  )
}
