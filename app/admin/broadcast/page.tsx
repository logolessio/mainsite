import type { Metadata } from 'next'
import { BroadcastForm } from '@/components/admin/broadcast-form'
import { PageHeader } from '@/components/app/ui'
import { pageAdmin } from '@/lib/user'

export const metadata: Metadata = { title: 'Broadcast | logoless', robots: { index: false } }

export default async function Page() {
  await pageAdmin()
  return (
    <>
      <PageHeader title="Broadcast" sub="Tell a group of people something. It shows up in their notifications straight away." />
      <BroadcastForm />
    </>
  )
}
