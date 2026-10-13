
import { AppFrame } from '@/components/app/frame'
import { requireSession } from '@/lib/session'

export const metadata = { title: 'Admin | logoless', robots: { index: false, follow: false } }

export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireSession('admin')
  return (
    <AppFrame
      area="Admin"
      items={[
        { label: 'Overview', href: '/admin', icon: 'LayoutDashboard', exact: true },
        { label: 'Launch', href: '/admin/launch', icon: 'Rocket', match: ['/admin/push'] },
        { label: 'Campaigns', href: '/admin/campaigns', icon: 'Megaphone', match: ['/admin/invites'] },
        { label: 'Clips', href: '/admin/submissions', icon: 'Clapperboard' },
        { label: 'Payouts', href: '/admin/payouts', icon: 'Banknote' },
        { label: 'Users', href: '/admin/users', icon: 'Users' },
        { label: 'Content', href: '/admin/text', icon: 'FileCheck2', match: ['/admin/email'] },
        { label: 'System', href: '/admin/logs', icon: 'BarChart3', match: ['/admin/audit', '/admin/keys', '/admin/settings'] },
      ]}
    >
      {children}
    </AppFrame>
  )
}
