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
  campaigns: { label: 'Campaigns', items: [{ id: 'campaigns', label: 'Campaigns', href: '/admin/campaigns' }, { id: 'invites', label: 'Artist links', href: '/admin/invites' }] },
  content: { label: 'Content', items: [{ id: 'text', label: 'Site text', href: '/admin/text' }, { id: 'broadcast', label: 'Broadcast', href: '/admin/broadcast' }, { id: 'discord', label: 'Discord', href: '/admin/discord' }, { id: 'developers', label: 'Developer apps', href: '/admin/developers' }, { id: 'email', label: 'Email', href: '/admin/email' }] },
  system: {
    label: 'System',
    items: [
      { id: 'logs', label: 'Logs', href: '/admin/logs' },
      { id: 'audit', label: 'Audit', href: '/admin/audit' },
      { id: 'keys', label: 'Keys', href: '/admin/keys' },
      { id: 'settings', label: 'Settings', href: '/admin/settings' },
      { id: 'api', label: 'API', href: '/admin/api' },
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
