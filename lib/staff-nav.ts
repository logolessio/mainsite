import type { AppNavItem } from '@/components/app/nav-types'

/** The address of the owner dashboard (where the admin and developer pages both live), and of the public site. */
export const OWNER_URL = process.env.NODE_ENV === 'production' ? 'https://owner.logoless.io' : ''
export const SITE_URL_FOR_STAFF = process.env.NODE_ENV === 'production' ? 'https://logoless.io' : '/'

// Everything the owner uses day to day has its own place in the sidebar, grouped under a small heading.
const ADMIN: AppNavItem[] = [
  { label: 'Overview', href: '/admin', icon: 'LayoutDashboard', exact: true, section: 'Run' },
  { label: 'Campaigns', href: '/admin/campaigns', icon: 'Megaphone', match: ['/admin/launch', '/admin/invites'], section: 'Run' },
  { label: 'Submissions', href: '/admin/submissions', icon: 'Clapperboard', section: 'Run' },
  { label: 'Payouts', href: '/admin/payouts', icon: 'Banknote', section: 'Run' },
  { label: 'People', href: '/admin/people', icon: 'Users', match: ['/admin/users'], section: 'Run' },
  { label: 'Inbox', href: '/admin/inbox', icon: 'Mail', section: 'Run' },
  { label: 'Discord', href: '/admin/discord', icon: 'Bot', section: 'Communicate' },
  { label: 'Email', href: '/admin/email', icon: 'Send', section: 'Communicate' },
  { label: 'Broadcast', href: '/admin/broadcast', icon: 'Megaphone', section: 'Communicate' },
  { label: 'Site text', href: '/admin/text', icon: 'FileCheck2', section: 'Site' },
  { label: 'System', href: '/admin/logs', icon: 'BarChart3', match: ['/admin/audit', '/admin/keys', '/admin/settings', '/admin/security', '/admin/api', '/admin/developers'], section: 'System' },
]

const DEV: AppNavItem[] = [{ label: 'Developer', href: '/dev', icon: 'Code2', match: ['/dev/design', '/dev/dashboards', '/dev/features', '/dev/events', '/dev/previews'], section: 'System' }]

/** One sidebar for the whole owner dashboard: the admin sections, then the developer section, as the person's roles allow. */
export function staffItems(roles: readonly string[]): AppNavItem[] {
  const admin = roles.includes('admin')
  const dev = roles.includes('dev')
  return [...(admin ? ADMIN : []), ...(dev ? DEV : [])]
}
