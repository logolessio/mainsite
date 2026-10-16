import type { Metadata } from 'next'
import { SectionTabs } from '@/components/app/section-tabs'
import { NumberSetting, Switch } from '@/components/admin/switches'
import { Card, PageHeader } from '@/components/app/ui'
import { allSettings } from '@/lib/settings'
import { SITE } from '@/lib/site'
import { pageAdmin } from '@/lib/user'

export const metadata: Metadata = { title: 'Platform settings | logoless', robots: { index: false } }

export default async function Page() {
  await pageAdmin()
  const s = await allSettings()
  return (
    <>
      <SectionTabs group="system" />
      <PageHeader title="Platform settings" sub="Emergency switches and spending limits. Every change is written to the audit log." />
      <div className="grid max-w-3xl gap-6">
        <Card title="Switches">
          <ul className="divide-y divide-line">
            <Switch k="payouts_paused" label="Pause all withdrawals" hint="Use this first if you see anything strange with money. Balances stay safe." on={s.payouts_paused === '1'} danger />
            <Switch k="signups_paused" label="Pause new accounts" hint="Nobody new can create an account while this is on. People already signed up are not affected." on={s.signups_paused === '1'} danger />
            <Switch k="submissions_paused" label="Pause new clip submissions" hint="Clippers cannot submit new links while this is on." on={s.submissions_paused === '1'} danger />
          </ul>
        </Card>
        <Card title="Spending limits">
          <ul className="divide-y divide-line">
            <NumberSetting k="daily_payout_cap_cents" label="Daily payout limit" hint="If more than this has gone out in 24 hours, new withdrawals wait for you." cents={Number(s.daily_payout_cap_cents)} />
            <NumberSetting k="review_over_cents" label="Check single withdrawals over" hint="A withdrawal above this always waits for you. Set 0 to turn off." cents={Number(s.review_over_cents)} />
          </ul>
        </Card>
        <Card title="Set in the code">
          <p className="text-sm text-mute">
            Platform fee {SITE.platformFeePct}% (charged to brands on top of payouts), minimum withdrawal ${SITE.minPayoutUsd}, hold period {SITE.holdDays === 0 ? 'none: earnings can be withdrawn as soon as they are confirmed' : `${SITE.holdDays} days (double for accounts with extra checks)`}. These live in <span className="font-mono">lib/site.ts</span> so a change is reviewed before it ships.
          </p>
        </Card>
      </div>
    </>
  )
}
