'use client'

import { usePathname } from 'next/navigation'
import { useFeature } from '@/components/shell/features-provider'
import { GlassTabs } from '@/components/ui/glass-tabs'

type Item = { id: string; label: string; href: string; feature?: string }

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
  campaigns: { label: 'Campaigns', items: [{ id: 'campaigns', label: 'Campaigns', href: '/admin/campaigns' }, { id: 'launch', label: 'Launch', href: '/admin/launch' }, { id: 'invites', label: 'Artist links', href: '/admin/invites' }] },
  dev: {
    label: 'Developer',
    items: [
      { id: 'overview', label: 'Overview', href: '/dev' },
      { id: 'design', label: 'Design', href: '/dev/design' },
      { id: 'features', label: 'Features', href: '/dev/features' },
      { id: 'dashboards', label: 'Dashboards', href: '/dev/dashboards' },
      { id: 'events', label: 'Events', href: '/dev/events' },
      { id: 'previews', label: 'Previews', href: '/dev/previews' },
    ],
  },
  system: {
    label: 'System',
    items: [
      { id: 'logs', label: 'Logs', href: '/admin/logs' },
      { id: 'audit', label: 'Audit', href: '/admin/audit' },
      { id: 'keys', label: 'Keys', href: '/admin/keys' },
      { id: 'settings', label: 'Settings', href: '/admin/settings' },
      { id: 'api', label: 'API', href: '/admin/api' },
      { id: 'developers', label: 'Developer apps', href: '/admin/developers' },
      { id: 'security', label: 'Security', href: '/admin/security' },
    ],
  },
}

/** The small centred switcher at the top of a page that shares a sidebar item with its neighbours. */
export function SectionTabs({ group }: { group: keyof typeof GROUPS }) {
  const pathname = usePathname()
  const saved = useFeature('saved-campaigns')
  const recap = useFeature('recap')
  const g = GROUPS[group]
  const items = g.items.filter((i) => !i.feature || (i.feature === 'saved-campaigns' ? saved : recap))
  const active = [...items].sort((a, b) => b.href.length - a.href.length).find((i) => pathname === i.href || pathname.startsWith(`${i.href}/`))?.id ?? items[0].id
  return (
    <div className="mb-10 flex justify-center">
      <GlassTabs label={g.label} tabs={items} value={active} />
    </div>
  )
}
