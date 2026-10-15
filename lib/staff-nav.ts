import type { AppNavItem } from '@/components/app/nav-types'

/** The address of the owner dashboard (where the admin and developer pages both live), and of the public site. */
export const OWNER_URL = process.env.NODE_ENV === 'production' ? 'https://owner.logoless.io' : ''
export const SITE_URL_FOR_STAFF = process.env.NODE_ENV === 'production' ? 'https://logoless.io' : '/'

const ADMIN: AppNavItem[] = [
  { label: 'Overview', href: '/admin', icon: 'LayoutDashboard', exact: true },
  { label: 'Launch', href: '/admin/launch', icon: 'Rocket' },
  { label: 'Campaigns', href: '/admin/campaigns', icon: 'Megaphone', match: ['/admin/invites'] },
  { label: 'Clips', href: '/admin/submissions', icon: 'Clapperboard' },
  { label: 'Payouts', href: '/admin/payouts', icon: 'Banknote' },
  { label: 'People', href: '/admin/people', icon: 'UserCog' },
  { label: 'Users', href: '/admin/users', icon: 'Users' },
  { label: 'Inbox', href: '/admin/inbox', icon: 'Mail' },
  { label: 'Content', href: '/admin/text', icon: 'FileCheck2', match: ['/admin/email', '/admin/broadcast', '/admin/discord', '/admin/developers'] },
  { label: 'System', href: '/admin/logs', icon: 'BarChart3', match: ['/admin/audit', '/admin/keys', '/admin/settings', '/admin/security', '/admin/api'] },
]

const DEV: AppNavItem[] = [
  { label: 'Overview', href: '/dev', icon: 'LayoutDashboard', exact: true },
  { label: 'Design', href: '/dev/design', icon: 'Palette' },
  { label: 'Dashboards', href: '/dev/dashboards', icon: 'Layers' },
  { label: 'Features', href: '/dev/features', icon: 'Rocket' },
  { label: 'Events', href: '/dev/events', icon: 'BarChart3' },
  { label: 'Previews', href: '/dev/previews', icon: 'Eye' },
]

/** One sidebar for the whole owner dashboard: Home, then the admin pages and the developer pages the person's roles allow. */
export function staffItems(roles: readonly string[]): AppNavItem[] {
  const admin = roles.includes('admin')
  const dev = roles.includes('dev')
  return [
    { label: 'Home', href: '/owner', icon: 'LayoutGrid', exact: true },
    ...(admin ? ADMIN.map((i) => ({ ...i, section: 'Admin' })) : []),
    ...(dev ? DEV.map((i) => ({ ...i, section: 'Developer' })) : []),
  ]
}
