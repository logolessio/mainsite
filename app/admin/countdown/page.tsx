import type { Metadata } from 'next'
import { LaunchCountdown } from '@/components/admin/launch-countdown'
import { PageHeader } from '@/components/app/ui'
import { pageAdmin } from '@/lib/user'

export const metadata: Metadata = { title: 'Launch page | logoless', robots: { index: false } }

export default async function Page() {
  await pageAdmin()
  return (
    <>
      <PageHeader title="Launch page" sub="A countdown and a sign-up in front of the whole site. Set when it ends, see who joined and reserved a username, and email them updates." />
      <LaunchCountdown />
    </>
  )
}
