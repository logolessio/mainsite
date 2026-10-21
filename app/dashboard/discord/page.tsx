import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { DiscordPage } from '@/components/app/discord-page'
import { PageHeader } from '@/components/app/ui'
import { featureOn } from '@/lib/features'

export const metadata: Metadata = { title: 'Discord | logoless', robots: { index: false } }

export default async function Page() {
  if (!(await featureOn('discord-page'))) notFound()
  return (
    <>
      <PageHeader title="Discord" sub="Your logoless account on Discord: your roles, the server and the messages the bot sends you." />
      <DiscordPage />
    </>
  )
}
