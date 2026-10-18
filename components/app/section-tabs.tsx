'use client'

import { usePathname } from 'next/navigation'
import { useFeature } from '@/components/shell/features-provider'
import { useStaffRoles } from './staff-roles'
import { GlassTabs } from '@/components/ui/glass-tabs'

type Item = { id: string; label: string; href: string; feature?: string; /** on the owner dashboard: which team role the page is for, so nobody is offered a tab that would be a 404 */ staff?: 'admin' | 'dev' }

const GROUPS: Record<string, { label: string; items: Item[] }> = {
  profile: {
    label: 'Profile',
    items: [
      { id: 'profile', label: 'Profile', href: '/dashboard/profile' },
      { id: 'achievements', label: 'Achievements', href: '/dashboard/achievements' },
      { id: 'accounts', label: 'Linked accounts', href: '/dashboard/accounts' },
      { id: 'saved', label: 'Saved', href: '/dashboard/saved', feature: 'saved-campaigns' },
      { id: 'recap', label: 'Recap', href: '/dashboard/recap', feature: 'recap' },
    ],
  },
  settings: { label: 'Settings', items: [{ id: 'settings', label: 'Settings', href: '/dashboard/settings' }, { id: 'notifications', label: 'Notifications', href: '/dashboard/notifications' }] },
  campaigns: { label: 'Campaigns', items: [{ id: 'campaigns', label: 'Campaigns', href: '/admin/campaigns', staff: 'admin' }, { id: 'launch', label: 'Launch', href: '/admin/launch', staff: 'admin' }, { id: 'invites', label: 'Artist links', href: '/admin/invites', staff: 'admin' }] },
  // Site: how the site looks and what it says, then what is switched on and how to walk through it.
  site: {
    label: 'Site',
    items: [
      { id: 'design', label: 'Design', href: '/admin/design', staff: 'admin' },
      { id: 'text', label: 'Text', href: '/admin/text', staff: 'admin' },
      { id: 'links', label: 'Links', href: '/admin/socials', staff: 'admin' },
      { id: 'features', label: 'Features', href: '/dev/features', staff: 'dev' },
      { id: 'previews', label: 'Previews', href: '/dev/previews', staff: 'dev' },
      { id: 'dashboards', label: 'Dashboards', href: '/dev/dashboards', staff: 'dev' },
    ],
  },
  // Communicate: everything the team sends out. (Messages that come in are the Inbox.)
  talk: {
    label: 'Communicate',
    items: [
      { id: 'broadcast', label: 'Broadcast', href: '/admin/broadcast', staff: 'admin' },
      { id: 'email', label: 'Email', href: '/admin/email', staff: 'admin' },
      { id: 'discord', label: 'Discord', href: '/admin/discord', staff: 'admin' },
    ],
  },
  // System: is it healthy, what happened, and the settings and keys behind it.
  system: {
    label: 'System',
    items: [
      { id: 'health', label: 'Health', href: '/admin/system', staff: 'admin' },
      { id: 'logs', label: 'Logs', href: '/admin/logs', staff: 'admin' },
      { id: 'events', label: 'Events', href: '/dev/events', staff: 'dev' },
      { id: 'audit', label: 'Audit', href: '/admin/audit', staff: 'admin' },
      { id: 'settings', label: 'Settings', href: '/admin/settings', staff: 'admin' },
      { id: 'keys', label: 'Keys', href: '/admin/keys', staff: 'admin' },
      { id: 'security', label: 'Security', href: '/admin/security', staff: 'admin' },
      { id: 'api', label: 'API', href: '/admin/api', staff: 'admin' },
      { id: 'developers', label: 'Apps', href: '/admin/developers', staff: 'admin' },
    ],
  },
}

/** The small centred switcher at the top of a page that shares a sidebar item with its neighbours. */
export function SectionTabs({ group }: { group: keyof typeof GROUPS }) {
  const pathname = usePathname()
  const saved = useFeature('saved-campaigns')
  const recap = useFeature('recap')
  const roles = useStaffRoles()
  const g = GROUPS[group]
  const items = g.items.filter((i) => (!i.feature || (i.feature === 'saved-campaigns' ? saved : recap)) && (!i.staff || roles.includes(i.staff)))
  if (items.length === 0) return null
  const active = [...items].sort((a, b) => b.href.length - a.href.length).find((i) => pathname === i.href || pathname.startsWith(`${i.href}/`))?.id ?? items[0].id
  return (
    <div className="mb-10 flex justify-center">
      <GlassTabs label={g.label} tabs={items} value={active} />
    </div>
  )
}
