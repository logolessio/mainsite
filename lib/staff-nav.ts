import type { AppNavItem } from '@/components/app/nav-types'

/** The address of the owner dashboard (where the admin and developer pages both live), and of the public site. */
export const OWNER_URL = process.env.NODE_ENV === 'production' ? 'https://owner.logoless.io' : ''
export const SITE_URL_FOR_STAFF = process.env.NODE_ENV === 'production' ? 'https://logoless.io' : '/'

// Nine places in all. The six under "Run" are the daily work, in the order the work arrives. The three under "Manage" are each a
// small hub: the pages that belong together sit behind the tabs at the top of the page (see components/app/section-tabs.tsx).
//   Site         Design, Text, Links, then Features, Previews and Dashboards for developers
//   Communicate  Broadcast, Email, Discord (what comes IN is the Inbox)
//   System       Health, Logs, Events, Audit, Settings, Keys, Security, API, Apps
const ADMIN: AppNavItem[] = [
  { key: 'o', label: 'Overview', href: '/admin', icon: 'LayoutDashboard', exact: true, section: 'Run' },
  { key: 'c', label: 'Campaigns', href: '/admin/campaigns', icon: 'Megaphone', match: ['/admin/launch', '/admin/invites'], section: 'Run' },
  { key: 's', label: 'Submissions', href: '/admin/submissions', icon: 'Clapperboard', section: 'Run' },
  { key: 'p', label: 'Payouts', href: '/admin/payouts', icon: 'Banknote', section: 'Run' },
  { key: 'u', label: 'People', href: '/admin/people', icon: 'Users', match: ['/admin/users'], section: 'Run' },
  { key: 'i', label: 'Inbox', href: '/admin/inbox', icon: 'Mail', section: 'Run' },
  { key: 'w', label: 'Site', href: '/admin/design', icon: 'Palette', match: ['/admin/text', '/admin/socials', '/admin/previews', '/admin/push', '/dev/design', '/dev/features', '/dev/previews', '/dev/dashboards'], section: 'Manage' },
  { key: 'm', label: 'Communicate', href: '/admin/broadcast', icon: 'Send', match: ['/admin/email', '/admin/discord', '/admin/countdown'], section: 'Manage' },
  { key: 'y', label: 'System', href: '/admin/system', icon: 'Activity', match: ['/admin/logs', '/admin/audit', '/admin/keys', '/admin/settings', '/admin/security', '/admin/api', '/admin/developers', '/dev/events'], section: 'Manage' },
]

// Someone who is a developer but not an admin only has the developer tools.
const DEV_ONLY: AppNavItem[] = [
  { key: 'f', label: 'Features', href: '/dev/features', icon: 'Rocket', section: 'Developer' },
  { key: 'v', label: 'Previews', href: '/dev/previews', icon: 'Eye', section: 'Developer' },
  { key: 'd', label: 'Dashboards', href: '/dev/dashboards', icon: 'LayoutGrid', section: 'Developer' },
  { key: 'e', label: 'Events', href: '/dev/events', icon: 'Activity', section: 'Developer' },
]

/** One sidebar for the whole owner dashboard, as the person's roles allow. */
export function staffItems(roles: readonly string[]): AppNavItem[] {
  if (roles.includes('admin')) return ADMIN
  if (roles.includes('dev')) return DEV_ONLY
  return []
}

/** Where the owner dashboard opens for someone with these roles. */
export const staffHome = (roles: readonly string[]) => (roles.includes('admin') || roles.length === 0 ? '/admin' : '/dev/features')
