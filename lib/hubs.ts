import type { IconName } from '@/components/icons'

/** A tile on a dashboard's front page. `feature` hides it until that feature is switched on. */
export type HubItem = { label: string; href: string; icon: IconName; feature?: string }
export type HubGroup = { title?: string; items: HubItem[] }

export const CLIPPER_HUB: HubGroup[] = [
  {
    items: [
      { label: 'Overview', href: '/dashboard/overview', icon: 'LayoutDashboard' },
      { label: 'Getting set up', href: '/dashboard/setup', icon: 'Compass' },
      { label: 'Find campaigns', href: '/', icon: 'Search' },
      { label: 'Clips', href: '/dashboard/submissions', icon: 'Clapperboard' },
      { label: 'Earnings', href: '/dashboard/earnings', icon: 'CircleDollarSign' },
      { label: 'Profile', href: '/dashboard/profile', icon: 'UserCheck' },
      { label: 'Achievements', href: '/dashboard/achievements', icon: 'Trophy' },
      { label: 'Linked accounts', href: '/dashboard/accounts', icon: 'Link2' },
      { label: 'Saved', href: '/dashboard/saved', icon: 'Heart', feature: 'saved-campaigns' },
      { label: 'Recap', href: '/dashboard/recap', icon: 'Sparkles', feature: 'recap' },
      { label: 'Notifications', href: '/dashboard/notifications', icon: 'Bell' },
      { label: 'Settings', href: '/dashboard/settings', icon: 'Settings' },
    ],
  },
]

export const BRAND_HUB: HubGroup[] = [
  {
    items: [
      { label: 'Overview', href: '/brand/overview', icon: 'LayoutDashboard' },
      { label: 'Campaigns', href: '/brand/campaigns', icon: 'Megaphone' },
      { label: 'New campaign', href: '/brand/campaigns/new', icon: 'Plus' },
      { label: 'Clips', href: '/brand/submissions', icon: 'Clapperboard' },
      { label: 'Balance', href: '/brand/balance', icon: 'Wallet' },
      { label: 'Settings', href: '/brand/settings', icon: 'Settings' },
    ],
  },
]

export const ADMIN_HUB: HubGroup = {
  title: 'Admin',
  items: [
    { label: 'Overview', href: '/admin', icon: 'LayoutDashboard' },
    { label: 'Launch', href: '/admin/launch', icon: 'Rocket' },
    { label: 'Campaigns', href: '/admin/campaigns', icon: 'Megaphone' },
    { label: 'Artist links', href: '/admin/invites', icon: 'Link2' },
    { label: 'Clips', href: '/admin/submissions', icon: 'Clapperboard' },
    { label: 'Payouts', href: '/admin/payouts', icon: 'Banknote' },
    { label: 'People', href: '/admin/people', icon: 'UserCog' },
    { label: 'Users', href: '/admin/users', icon: 'Users' },
    { label: 'Inbox', href: '/admin/inbox', icon: 'Mail' },
    { label: 'Site text', href: '/admin/text', icon: 'FileCheck2' },
    { label: 'Broadcast', href: '/admin/broadcast', icon: 'Send' },
    { label: 'Discord', href: '/admin/discord', icon: 'Bot' },
    { label: 'Email', href: '/admin/email', icon: 'Mail' },
    { label: 'Developer apps', href: '/admin/developers', icon: 'Code2' },
    { label: 'API keys', href: '/admin/api', icon: 'KeyRound' },
    { label: 'Logs', href: '/admin/logs', icon: 'BarChart3' },
    { label: 'Audit', href: '/admin/audit', icon: 'ScrollText' },
    { label: 'Keys and tests', href: '/admin/keys', icon: 'Lock' },
    { label: 'Settings', href: '/admin/settings', icon: 'Settings' },
    { label: 'Security', href: '/admin/security', icon: 'ShieldCheck' },
  ],
}

export const DEV_HUB: HubGroup = {
  title: 'Developer',
  items: [
    { label: 'Overview', href: '/dev', icon: 'LayoutDashboard' },
    { label: 'Design', href: '/dev/design', icon: 'Palette' },
    { label: 'Dashboards', href: '/dev/dashboards', icon: 'Layers' },
    { label: 'Features', href: '/dev/features', icon: 'Rocket' },
    { label: 'Events', href: '/dev/events', icon: 'Activity' },
    { label: 'Previews', href: '/dev/previews', icon: 'Eye' },
  ],
}
