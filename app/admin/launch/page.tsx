import type { Metadata } from 'next'
import { LaunchBoard } from '@/components/admin/launch-board'
import { readiness } from '@/lib/launch-readiness'
import { pageAdmin } from '@/lib/user'
import { SectionTabs } from '@/components/app/section-tabs'

export const metadata: Metadata = { title: 'Launch readiness | logoless', robots: { index: false } }

export default async function Page() {
  await pageAdmin()
  const r = await readiness()
  return (
    <>
      <SectionTabs group="campaigns" />
      <LaunchBoard r={r} />
    </>
  )
}
