import type { Metadata } from 'next'
import { LogsView, type LogsSP } from '@/components/admin/logs-view'
import { pageDev } from '@/lib/user'

export const metadata: Metadata = { title: 'Events | logoless', robots: { index: false } }

export default async function Page({ searchParams }: { searchParams: Promise<LogsSP> }) {
  await pageDev()
  return <LogsView sp={await searchParams} base="/dev/events" canExport={false} />
}
