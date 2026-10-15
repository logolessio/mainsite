import { AppFrame } from '@/components/app/frame'
import { requireSession } from '@/lib/session'

export const metadata = { title: 'Dev | logoless', robots: { index: false, follow: false } }

export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireSession('dev')
  return (
    <AppFrame
      area="Dev"
      items={[
        { label: 'Overview', href: '/dev', icon: 'LayoutDashboard', exact: true },
        { label: 'Design', href: '/dev/design', icon: 'Palette' },
        { label: 'Dashboards', href: '/dev/dashboards', icon: 'Layers' },
        { label: 'Features', href: '/dev/features', icon: 'Rocket' },
        { label: 'Events', href: '/dev/events', icon: 'BarChart3' },
        { label: 'Previews', href: '/dev/previews', icon: 'Eye' },
      ]}
    >
      {children}
    </AppFrame>
  )
}
