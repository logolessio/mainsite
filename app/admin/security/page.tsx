import type { Metadata } from 'next'
import { SecurityForm } from '@/components/admin/security-form'
import { SectionTabs } from '@/components/app/section-tabs'
import { Card, PageHeader } from '@/components/app/ui'
import { adminSecretSet } from '@/lib/admin-secret'
import { pageAdmin } from '@/lib/user'

export const metadata: Metadata = { title: 'Security | logoless', robots: { index: false } }

export default async function Page() {
  const admin = await pageAdmin()
  const isSet = await adminSecretSet(admin.id)
  return (
    <>
      <SectionTabs group="system" />
      <PageHeader title="Security" sub="Your admin password. It is asked for before anything that could hurt the company." />
      <div className="grid max-w-3xl gap-6">
        <Card title={isSet ? 'Change your admin password' : 'Set your admin password'}>
          <SecurityForm isSet={isSet} />
        </Card>
        <Card title="What it protects">
          <ul className="grid gap-2 text-sm leading-relaxed text-mute">
            <li>Pausing all withdrawals, new accounts or clip submissions.</li>
            <li>Changing the daily payout limit or the large-withdrawal check.</li>
            <li>Deleting an account.</li>
            <li>Giving or taking away a role (admin or developer).</li>
          </ul>
          <p className="mt-4 text-xs text-mute">Each admin has their own. Five wrong tries in a row make it wait before it lets you try again.</p>
        </Card>
      </div>
    </>
  )
}
