import type { Metadata } from 'next'
import { PageHeader } from '@/components/app/ui'
import { DashboardPreview, type PreviewItem } from '@/components/dev/dashboard-preview'
import { SITE_URL_FOR_STAFF } from '@/lib/staff-nav'
import { pageDev } from '@/lib/user'
import { SectionTabs } from '@/components/app/section-tabs'

export const metadata: Metadata = { title: 'Dashboards | logoless', robots: { index: false } }

/** Every dashboard in one place. They show your own account's data, because that is what each one looks like for a real person. */
export default async function Page() {
  await pageDev()
  const items: PreviewItem[] = [
    { id: 'creator', title: 'Creator', note: 'What a creator sees: balance, submissions, earnings, profile and the set-up guide.', href: '/dashboard' },
    { id: 'brand', title: 'Brand', note: 'What a brand sees: views chart, campaigns, the one balance, and starting or pausing a campaign.', href: '/brand' },
        { id: 'admin', title: 'Admin', note: 'Money, people, campaigns, submissions, payouts and the tools to act on all of them. The owner dashboard opens here.', href: '/admin' },
    { id: 'dev', title: 'System', note: 'Health, logs, settings and keys.', href: '/admin/system' },
    { id: 'site', title: 'The site', note: 'The public front page, as a visitor sees it.', href: SITE_URL_FOR_STAFF },
    { id: 'onboarding', title: 'Onboarding', note: 'The sign-up flow as a stranger sees it. A dry run: nothing is saved.', href: '/onboarding?preview=1' },
  ]
  return (
    <>
      <SectionTabs group="site" />
      <PageHeader title="Dashboards" sub="Preview every dashboard and screen size without signing in as anyone else." />
      <DashboardPreview items={items} />
    </>
  )
}
