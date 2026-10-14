import type { Metadata } from 'next'
import { ActionLink } from '@/components/app/action-link'
import { Badge } from '@/components/app/table'
import { Card, PageHeader, StatCard } from '@/components/app/ui'
import { Pill } from '@/components/admin/ui'
import { money } from '@/lib/format'
import { SITE } from '@/lib/site'
import { counts, funds, health, paypalStatus } from '@/lib/admin-stats'
import { newInquiryCount } from '@/lib/inquiries'
import { pageAdmin } from '@/lib/user'

export const metadata: Metadata = { title: 'Admin | logoless', robots: { index: false } }

export default async function Page() {
  await pageAdmin()
  const [f, c, h, sb, inbox] = await Promise.all([funds(), counts(), health(), paypalStatus(), newInquiryCount()])
  const todo = [
    { label: 'Campaign requests', n: c.requests, href: '/admin/campaigns' },
    { label: 'Paid, ready to launch', n: c.readyToLaunch, href: '/admin/campaigns' },
    { label: 'Clips to review', n: c.pendingClips, href: '/admin/submissions' },
    { label: 'Withdrawals to check', n: c.payoutsInReview, href: '/admin/payouts' },
    { label: 'New messages and reports', n: inbox, href: '/admin/inbox' },
    { label: 'Flagged accounts', n: c.flagged, href: '/admin/users?risk=1' },
  ]
  const attention = h.filter((x) => x.state !== 'ok')

  return (
    <>
      <PageHeader title="Admin" sub="Money, people and what needs you right now." actions={
          <div className="flex flex-wrap gap-2">
            <ActionLink href="/admin/design">Design</ActionLink>
            <ActionLink href="/admin/campaigns">Campaigns</ActionLink>
          </div>
        } />

      <div className="flex flex-col gap-4 lg:flex-row">
        <Pill
          label="Company funds"
          value={money(f.company)}
          tone="good"
          note={`Brand money held: ${money(f.heldForCampaigns)} in campaigns + ${money(f.brandBalances)} in balances, with ${money(f.owedToClippers)} owed to clippers`}
        />
        <Pill label="Site fees" value={money(f.fees)} note={`The ${SITE.platformFeePct}% charged to brands on top of payouts. PayPal has charged ${money(f.paypalCosts)} to take payments.`} />
      </div>
      <p className="mt-3 px-2 text-xs text-mute">
        {sb.ready ? (
          <>
            PayPal is connected ({sb.live ? 'live' : 'sandbox'} mode). Paid out to clippers so far: {money(f.paidOut)}.
            {f.inReview > 0 && <> {money(f.inReview)} of withdrawals are waiting for you.</>}
          </>
        ) : (
          <>PayPal is not connected yet: add the keys on the Keys page so brands can add funds and clippers can withdraw.</>
        )}
      </p>

      {attention.length > 0 && (
        <Card title="Needs attention" className="mt-6">
          <ul className="divide-y divide-line">
            {attention.map((x) => (
              <li key={x.key} className="flex items-center justify-between gap-4 py-2.5 text-sm">
                <span>{x.label}</span>
                <span className="flex items-center gap-3 text-mute">
                  {x.detail}
                  <Badge tone={x.state === 'bad' ? 'bad' : 'warn'}>{x.state === 'bad' ? 'Fix' : 'Check'}</Badge>
                </span>
              </li>
            ))}
          </ul>
          <ActionLink href="/admin/keys" className="mt-4">Open keys and tests</ActionLink>
        </Card>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active now" value={String(c.activeNow ?? 0)} note="Signed in, last 5 minutes" />
        <StatCard label="Active today" value={String(c.active24h ?? 0)} note={`${c.signups24h ?? 0} new in 24 hours`} />
        <StatCard label="Members" value={String(c.users ?? 0)} note={`${c.restricted ?? 0} restricted`} />
        <StatCard label="Live campaigns" value={String(c.live ?? 0)} note={`${c.awaitingPayment ?? 0} waiting for payment`} />
      </div>

      <Card title="Queues" className="mt-6">
        <ul className="divide-y divide-line">
          {todo.map((t) => (
            <li key={t.label}>
              <a href={t.href} className="flex items-center justify-between gap-4 py-3 text-sm hover:text-paper">
                <span>{t.label}</span>
                <Badge tone={(t.n ?? 0) > 0 ? 'warn' : 'neutral'}>{t.n ?? 0}</Badge>
              </a>
            </li>
          ))}
        </ul>
      </Card>
    </>
  )
}
