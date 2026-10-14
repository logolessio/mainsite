import type { Metadata } from 'next'
import { LogsView, type LogsSP } from '@/components/admin/logs-view'
import { SectionTabs } from '@/components/app/section-tabs'
import { pageAdmin } from '@/lib/user'

export const metadata: Metadata = { title: 'Logs | logoless', robots: { index: false } }

export default async function Page({ searchParams }: { searchParams: Promise<LogsSP> }) {
  await pageAdmin()
  return (
    <>
      <SectionTabs group="system" />
      <LogsView sp={await searchParams} base="/admin/logs" canExport />
    </>
  )
}
