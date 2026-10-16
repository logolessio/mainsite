import type { AppNavItem } from '@/components/app/nav-types'

/** The address of the owner dashboard (where the admin and developer pages both live), and of the public site. */
export const OWNER_URL = process.env.NODE_ENV === 'production' ? 'https://owner.logoless.io' : ''
export const SITE_URL_FOR_STAFF = process.env.NODE_ENV === 'production' ? 'https://logoless.io' : '/'

const ADMIN: AppNavItem[] = [
  { label: 'Overview', href: '/admin', icon: 'LayoutDashboard', exact: true },
  { label: 'Campaigns', href: '/admin/campaigns', icon: 'Megaphone', match: ['/admin/launch', '/admin/invites'] },
  { label: 'Submissions', href: '/admin/submissions', icon: 'Clapperboard' },
  { label: 'Payouts', href: '/admin/payouts', icon: 'Banknote' },
  { label: 'People', href: '/admin/people', icon: 'Users', match: ['/admin/users'] },
  { label: 'Inbox', href: '/admin/inbox', icon: 'Mail' },
  { label: 'Site', href: '/admin/text', icon: 'FileCheck2', match: ['/admin/email', '/admin/broadcast', '/admin/discord', '/admin/developers'] },
  { label: 'System', href: '/admin/logs', icon: 'BarChart3', match: ['/admin/audit', '/admin/keys', '/admin/settings', '/admin/security', '/admin/api'] },
]

const DEV: AppNavItem[] = [{ label: 'Developer', href: '/dev', icon: 'Code2', match: ['/dev/design', '/dev/dashboards', '/dev/features', '/dev/events', '/dev/previews'] }]

/** One sidebar for the whole owner dashboard: the admin sections, then the developer section, as the person's roles allow. */
export function staffItems(roles: readonly string[]): AppNavItem[] {
  const admin = roles.includes('admin')
  const dev = roles.includes('dev')
  return [...(admin ? ADMIN : []), ...(dev ? DEV : [])]
}
