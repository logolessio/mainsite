import type { Metadata } from 'next'
import { ActionLink } from '@/components/app/action-link'
import { Disclosure } from '@/components/admin/disclosure'
import Link from 'next/link'
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
    { label: 'Flagged accounts', n: c.flagged ?? 0, href: '/admin/people?f=risk' },
  ].filter((t) => t.n > 0)
  const attention = h.filter((x) => x.state !== 'ok')

  const bad = attention.filter((x) => x.state === 'bad').length

  return (
    <>
      <PageHeader title="Overview" sub="What needs you first, then the money, then how things are running." />

      {todo.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2" aria-label="Also waiting">
          <span className="mr-1 text-sm text-mute">Also waiting</span>
          {todo.map((t) => (
            <Link key={t.label} href={t.href} className="inline-flex h-9 items-center gap-2 rounded-full border border-line-strong px-4 text-sm transition-colors duration-300 hover:bg-white/[0.06]">
              {t.label}
              <span className="grid h-5 min-w-5 place-items-center rounded-full border border-cyan-300/60 px-1.5 text-[11px] text-cyan-200 tabular-nums">{t.n}</span>
            </Link>
          ))}
        </div>
      )}

      <OverviewQueue />

      <div className="mt-10 flex flex-col gap-4 lg:flex-row">
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

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active now" value={String(c.activeNow ?? 0)} note="Signed in, last 5 minutes" />
        <StatCard label="Active today" value={String(c.active24h ?? 0)} note={`${c.signups24h ?? 0} new in 24 hours`} />
        <StatCard label="Members" value={String(c.users ?? 0)} note={`${c.restricted ?? 0} restricted`} />
        <StatCard label="Live campaigns" value={String(c.live ?? 0)} note={`${c.awaitingPayment ?? 0} waiting for payment`} />
      </div>

      <div className="mt-10 grid gap-4">
        <Disclosure
          title="Setup and health"
          sub={attention.length === 0 ? 'Everything is set up and running.' : 'Keys, sign-in, email and the other things the site needs to run.'}
           
          badge={attention.length > 0 ? <Badge tone={bad > 0 ? 'bad' : 'warn'}>{attention.length} to check</Badge> : <Badge tone="good">all good</Badge>}
        >
          {attention.length === 0 ? (
            <p className="text-sm text-mute">Nothing needs attention.</p>
          ) : (
            <>
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
            </>
          )}
        </Disclosure>
        <Disclosure title="Emergency controls" sub="Stop withdrawals, new clips and sign-ups at once. Nothing is lost, and you can open them again." badge={locked ? <Badge tone="bad">locked down</Badge> : undefined}>
          <LockdownButton locked={locked} />
        </Disclosure>
      </div>
    </>
  )
}
