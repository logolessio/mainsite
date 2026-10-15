import type { Metadata } from 'next'
import { ApiKeys } from '@/components/admin/api-keys'
import { SectionTabs } from '@/components/app/section-tabs'
import { PageHeader } from '@/components/app/ui'
import { API_BASE, BASE44_PROMPT } from '@/lib/base44-prompt'
import { pageAdmin } from '@/lib/user'

export const metadata: Metadata = { title: 'API | logoless', robots: { index: false } }

export default async function Page() {
  await pageAdmin()
  return (
    <>
      <SectionTabs group="system" />
      <PageHeader title="API" sub="Run the admin work from another tool. Keys, what they may do, and the prompt for building a copy of this dashboard in Base44." />
      <ApiKeys base={API_BASE} prompt={BASE44_PROMPT} />
    </>
  )
}
