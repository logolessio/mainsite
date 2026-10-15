import type { Metadata } from 'next'
import { PageHeader } from '@/components/app/ui'
import { DashboardPreview, type PreviewItem } from '@/components/dev/dashboard-preview'
import { SITE_URL_FOR_STAFF } from '@/lib/staff-nav'
import { pageDev } from '@/lib/user'

export const metadata: Metadata = { title: 'Dashboards | logoless', robots: { index: false } }

/** Every dashboard in one place. They show your own account's data, because that is what each one looks like for a real person. */
export default async function Page() {
  await pageDev()
  const items: PreviewItem[] = [
    { id: 'clipper', title: 'Clipper', note: 'What a creator sees: balance, clips, earnings, profile and the Getting set up guide.', href: '/dashboard' },
    { id: 'brand', title: 'Brand', note: 'What a brand sees: views chart, campaigns, the one balance, and starting or pausing a campaign.', href: '/brand' },
    { id: 'owner', title: 'Owner', note: 'The front door of the owner dashboard: every admin and developer section as an icon.', href: '/owner' },
    { id: 'admin', title: 'Admin', note: 'Money, people, campaigns, clips, payouts and the tools to act on all of them.', href: '/admin' },
    { id: 'dev', title: 'Developer', note: 'Vitals, design switches, feature pushes and events.', href: '/dev' },
    { id: 'site', title: 'The site', note: 'The public front page, as a visitor sees it.', href: SITE_URL_FOR_STAFF },
    { id: 'onboarding', title: 'Onboarding', note: 'The sign-up flow as a stranger sees it. A dry run: nothing is saved.', href: '/onboarding?preview=1' },
  ]
  return (
    <>
      <PageHeader title="Dashboards" sub="Preview every dashboard and screen size without signing in as anyone else." />
      <DashboardPreview items={items} />
    </>
  )
}
