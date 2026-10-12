
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
        { label: 'Launch readiness', href: '/admin/launch', icon: 'Rocket' },
        { label: 'Push features', href: '/admin/push', icon: 'Sparkles' },
        { label: 'Artist links', href: '/admin/invites', icon: 'Link2' },
        { label: 'Campaigns', href: '/admin/campaigns', icon: 'Megaphone' },
        { label: 'Review queue', href: '/admin/submissions', icon: 'Clapperboard' },
        { label: 'Payouts', href: '/admin/payouts', icon: 'Banknote' },
        { label: 'Users', href: '/admin/users', icon: 'Users' },
        { label: 'Site text', href: '/admin/text', icon: 'FileCheck2' },
        { label: 'Logs and stats', href: '/admin/logs', icon: 'BarChart3' },
        { label: 'Audit log', href: '/admin/audit', icon: 'ScrollText' },
        { label: 'Email', href: '/admin/email', icon: 'Mail' },
        { label: 'Keys and tests', href: '/admin/keys', icon: 'ShieldCheck' },
        { label: 'Settings', href: '/admin/settings', icon: 'Settings' },
      ]}
    >
      {children}
    </AppFrame>
  )
}
