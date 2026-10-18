import type { Metadata } from 'next'
import { DiscordPanel } from '@/components/admin/discord-panel'
import { PageHeader } from '@/components/app/ui'
import { pageAdmin } from '@/lib/user'

export const metadata: Metadata = { title: 'Discord | logoless', robots: { index: false } }

export default async function Page() {
  await pageAdmin()
  return (
    <>
      <PageHeader title="Discord" sub="The logoless bot: slash commands, notifications, roles and announcements in your server." />
      <DiscordPanel />
    </>
  )
}
