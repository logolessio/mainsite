import type { Metadata } from 'next'
import { ActionLink } from '@/components/app/action-link'
import { PageHeader } from '@/components/app/ui'
import { SetupSteps } from '@/components/app/setup-steps'
import { creatorSetup } from '@/lib/setup-steps'
import { pageUser } from '@/lib/user'

export const metadata: Metadata = { title: 'Getting set up | logoless', robots: { index: false } }

/** Everything you need to start earning, one step at a time. Whatever was skipped when signing up is here, with how to do it. */
export default async function Page() {
  const user = await pageUser()
  const steps = await creatorSetup(user)
  return (
    <>
      <PageHeader title="Getting set up" sub="One step at a time, from signing up to your first payout." actions={<ActionLink href="/" variant="ghost">Find a campaign</ActionLink>} />
      <SetupSteps steps={steps} email={user.email} />
    </>
  )
}
