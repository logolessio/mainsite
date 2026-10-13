
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
        { label: 'Campaigns', href: '/admin/campaigns', icon: 'Megaphone' },
        { label: 'Artist links', href: '/admin/invites', icon: 'Link2' },
        { label: 'Clips', href: '/admin/submissions', icon: 'Clapperboard' },
        { label: 'Payouts', href: '/admin/payouts', icon: 'Banknote' },
        { label: 'Users', href: '/admin/users', icon: 'Users' },
        { group: 'Launch', label: 'Readiness', href: '/admin/launch', icon: 'Rocket' },
        { label: 'Push features', href: '/admin/push', icon: 'Unlock' },
        { label: 'Previews', href: '/admin/previews', icon: 'Eye' },
        { group: 'Content', label: 'Site text', href: '/admin/text', icon: 'FileCheck2' },
        { label: 'Email', href: '/admin/email', icon: 'Mail' },
        { group: 'System', label: 'Logs', href: '/admin/logs', icon: 'BarChart3' },
        { label: 'Audit', href: '/admin/audit', icon: 'ScrollText' },
        { label: 'Keys', href: '/admin/keys', icon: 'Lock' },
        { label: 'Design', href: '/admin/design', icon: 'Sparkles' },
        { label: 'Settings', href: '/admin/settings', icon: 'Settings' },
      ]}
    >
      {children}
    </AppFrame>
  )
}
