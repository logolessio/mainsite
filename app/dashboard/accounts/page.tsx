import type { Metadata } from 'next'
import { SectionTabs } from '@/components/app/section-tabs'
import { AccountsPanel } from '@/components/app/accounts-panel'
import { PageHeader } from '@/components/app/ui'

export const metadata: Metadata = { title: 'Linked accounts | logoless', robots: { index: false } }

export default function Page() {
  return (
    <>
      <SectionTabs group="profile" />
      <PageHeader title="Linked accounts" sub="We read public view counts on content you submit. We never post for you." />
      <AccountsPanel />
    </>
  )
}
