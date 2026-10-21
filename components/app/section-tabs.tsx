'use client'

import { usePathname } from 'next/navigation'
import { useFeature } from '@/components/shell/features-provider'
import { GROUPS, menuOf } from '@/lib/section-groups'
import { useStaffRoles } from './staff-roles'
import { GlassTabs } from '@/components/ui/glass-tabs'

/** The small centred switcher for the page being shown. It is drawn once by the dashboard shell, outside the page, so it stays put and its highlight glides from tab to tab. */
export function SectionTabs({ group }: { group: keyof typeof GROUPS }) {
  const pathname = usePathname()
  const saved = useFeature('saved-campaigns')
  // with "Recap in the sidebar" on, Recap has its own place at the bottom of the sidebar instead of a tab here
  const recapOn = useFeature('recap')
  const recapInSidebar = useFeature('recap-sidebar')
  const recap = recapOn && !recapInSidebar
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

/** The menu for whatever page is open, if it has one. Keyed by menu, so moving between pages of one menu keeps the same bar. */
export function RouteTabs() {
  const group = menuOf(usePathname())
  return group ? (
    <div className="mx-auto max-w-[1160px]">
      <SectionTabs key={group} group={group} />
    </div>
  ) : null
}
