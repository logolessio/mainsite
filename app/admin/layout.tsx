
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
        { label: 'Campaigns', href: '/admin/campaigns', icon: 'Megaphone' },
        { label: 'Review queue', href: '/admin/submissions', icon: 'Clapperboard' },
        { label: 'Payouts', href: '/admin/payouts', icon: 'Banknote' },
        { label: 'Users', href: '/admin/users', icon: 'Users' },
        { label: 'Site text', href: '/admin/text', icon: 'FileCheck2' },
        { label: 'Audit log', href: '/admin/audit', icon: 'ScrollText' },
        { label: 'Keys and tests', href: '/admin/keys', icon: 'ShieldCheck' },
        { label: 'Settings', href: '/admin/settings', icon: 'Settings' },
      ]}
    >
      {children}
    </AppFrame>
  )
}
