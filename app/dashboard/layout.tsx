import { AppFrame, type AppNavItem } from '@/components/app/frame'
import { sidebarExtras } from '@/lib/dashboard-state'
import { pageUser } from '@/lib/user'
import { getSession, requireSession } from '@/lib/session'

export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireSession()
  // Recap (gold, at the bottom) and the Discord page are extras: see lib/dashboard-state.ts
  const signedIn = Boolean((await getSession())?.user?.email)
  const extras = signedIn ? await sidebarExtras(await pageUser()) : { recap: null, discord: false }
  const items: AppNavItem[] = [
    { key: 'o', label: 'Overview', href: '/dashboard', icon: 'LayoutDashboard', exact: true, match: ['/dashboard/setup'] },
    { key: 's', label: 'Submissions', href: '/dashboard/submissions', icon: 'Clapperboard' },
    { key: 'e', label: 'Earnings', href: '/dashboard/earnings', icon: 'CircleDollarSign', match: ['/dashboard/payouts'] },
    { key: 'p', label: 'Profile', href: '/dashboard/profile', icon: 'UserCheck', match: ['/dashboard/achievements', '/dashboard/saved', ...(extras.recap ? [] : ['/dashboard/recap'])] },
    { key: 'a', label: 'Accounts', href: '/dashboard/accounts', icon: 'Link2' },
    ...(extras.discord ? [{ key: 'd', label: 'Discord', href: '/dashboard/discord', icon: 'Discord' } satisfies AppNavItem] : []),
    { key: 't', label: 'Settings', href: '/dashboard/settings', icon: 'Settings', match: ['/dashboard/notifications'] },
  ]
  const footer: AppNavItem[] = extras.recap ? [{ key: 'r', label: 'Recap', href: '/dashboard/recap', icon: 'Sparkles', glow: extras.recap.gold ? 'gold' : undefined }] : []
  return (
    <AppFrame area="Creator" items={items} footer={footer}>
      {children}
    </AppFrame>
  )
}
