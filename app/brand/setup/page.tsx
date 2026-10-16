import type { Metadata } from 'next'
import { ActionLink } from '@/components/app/action-link'
import { PageHeader } from '@/components/app/ui'
import { SetupSteps } from '@/components/app/setup-steps'
import { brandSetup } from '@/lib/setup-steps'
import { pageUser } from '@/lib/user'

export const metadata: Metadata = { title: 'Getting set up | logoless', robots: { index: false } }

/** Everything a brand needs to run a first campaign, one step at a time. */
export default async function Page() {
  const user = await pageUser()
  const steps = await brandSetup(user)
  return (
    <>
      <PageHeader title="Getting set up" sub="One step at a time, from signing up to your first campaign." actions={<ActionLink href="/brand/campaigns/new" variant="ghost">New campaign</ActionLink>} />
      <SetupSteps steps={steps} email={user.email} kind="brand" />
    </>
  )
}
