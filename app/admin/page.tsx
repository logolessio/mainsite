import type { Metadata } from 'next'
import { ActionLink } from '@/components/app/action-link'
import { Badge } from '@/components/app/table'
import { Card, PageHeader, StatCard } from '@/components/app/ui'
import { LockdownButton } from '@/components/admin/lockdown'
import { OverviewQueue } from '@/components/admin/overview-queue'
import { Pill } from '@/components/admin/ui'
import { money } from '@/lib/format'
import { SITE } from '@/lib/site'
import { counts, funds, health, paypalStatus } from '@/lib/admin-stats'
import { newInquiryCount } from '@/lib/inquiries'
import { allSettings } from '@/lib/settings'
import { pageAdmin } from '@/lib/user'

export const metadata: Metadata = { title: 'Overview | logoless', robots: { index: false } }

export default async function Page() {
  await pageAdmin()
  const [f, c, h, sb, inbox, st] = await Promise.all([funds(), counts(), health(), paypalStatus(), newInquiryCount(), allSettings()])
  const locked = st.payouts_paused === '1' && st.submissions_paused === '1' && st.signups_paused === '1'
  // the requests, clips and withdrawals are decided right on this page; these are the rest that need a look
  const todo = [
    { label: 'Paid, ready to launch', n: c.readyToLaunch ?? 0, href: '/admin/campaigns' },
    { label: 'New messages and reports', n: inbox, href: '/admin/inbox' },
    { label: 'Flagged accounts', n: c.flagged ?? 0, href: '/admin/users?risk=1' },
  ].filter((t) => t.n > 0)
  const attention = h.filter((x) => x.state !== 'ok')

  return (
    <>
      <PageHeader title="Overview" sub="Money, people and what needs you right now." />

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

      <OverviewQueue />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active now" value={String(c.activeNow ?? 0)} note="Signed in, last 5 minutes" />
        <StatCard label="Active today" value={String(c.active24h ?? 0)} note={`${c.signups24h ?? 0} new in 24 hours`} />
        <StatCard label="Members" value={String(c.users ?? 0)} note={`${c.restricted ?? 0} restricted`} />
        <StatCard label="Live campaigns" value={String(c.live ?? 0)} note={`${c.awaitingPayment ?? 0} waiting for payment`} />
      </div>

      <Card title="Emergency" sub="If something looks wrong, stop withdrawals, new clips and sign-ups at once. Nothing is lost, and you can open them again." className="mt-6">
        <LockdownButton locked={locked} />
      </Card>

      {todo.length > 0 && (
        <Card title="Also waiting" className="mt-6">
          <ul className="divide-y divide-line">
            {todo.map((t) => (
              <li key={t.label}>
                <a href={t.href} className="flex items-center justify-between gap-4 py-3 text-sm hover:text-paper">
                  <span>{t.label}</span>
                  <Badge tone="warn">{t.n}</Badge>
                </a>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  )
}
