import type { Metadata } from 'next'
import { DeveloperApps } from '@/components/admin/developer-apps'
import { SectionTabs } from '@/components/app/section-tabs'
import { PageHeader } from '@/components/app/ui'
import { allApps, appPublic } from '@/lib/oauth'
import { pageAdmin } from '@/lib/user'

export const metadata: Metadata = { title: 'Developer apps | logoless', robots: { index: false } }

export default async function Page() {
  await pageAdmin()
  const apps = (await allApps()).map((a) => ({ ...appPublic(a), ownerEmail: a.ownerEmail }))
  return (
    <>
      <SectionTabs group="content" />
      <PageHeader title="Developer apps" sub="Apps that use Sign in with logoless. Check one to remove the “independent developer” note, or switch one off." />
      <DeveloperApps apps={apps} />
    </>
  )
}
