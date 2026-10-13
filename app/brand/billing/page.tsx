import type { Metadata } from 'next'
import { AddFunds } from '@/components/app/add-funds'
import { CaptureOnReturn } from '@/components/app/capture-on-return'
import { FundCampaign } from '@/components/app/fund-campaign'
import { PayCampaignButton } from '@/components/app/pay-campaign-button'
import { SectionTabs } from '@/components/app/section-tabs'
import { Badge, DataTable, EmptyState } from '@/components/app/table'
import { Card, PageHeader, StatCard } from '@/components/app/ui'
import { CAMPAIGN_STATUS } from '@/lib/campaign-status'
import { db } from '@/lib/db'
import { money } from '@/lib/format'
import { balances } from '@/lib/ledger'
import { costFor } from '@/lib/ledger-math'
import { paypalReady } from '@/lib/paypal'
import { SITE } from '@/lib/site'
import { pageUser } from '@/lib/user'

export const metadata: Metadata = { title: 'Funding | logoless', robots: { index: false } }

type Row = { id: string; amount_cents: number; status: string; created_at: number }
type Waiting = { id: string; title: string; budget_cents: number }
type Camp = { id: string; title: string; status: string; funded: number; spent: number; pool: number }

// The pool holds what clippers get plus our fee on top. These show the clippers' part.
const forClippers = (gross: number) => Math.floor((gross * 100) / (100 + SITE.platformFeePct))

export default async function Page({ searchParams }: { searchParams: Promise<{ funded?: string; cancelled?: string; paypal?: string; token?: string }> }) {
  const user = await pageUser()
  const q = await searchParams
  const d = await db()
  const [b, ready, waiting, rows, camps] = await Promise.all([
    balances(user.id),
    paypalReady(),
    d.prepare("SELECT id, title, budget_cents FROM campaigns WHERE brand_user_id = ?1 AND status = 'awaiting_payment' ORDER BY updated_at DESC").bind(user.id).all<Waiting>(),
    d.prepare("SELECT id, amount_cents, status, created_at FROM topups WHERE user_id = ?1 AND status <> 'open' ORDER BY created_at DESC LIMIT 100").bind(user.id).all<Row>(),
    d
      .prepare(
        `SELECT c.id, c.title, c.status,
           COALESCE((SELECT SUM(amount_cents) FROM ledger WHERE campaign_id = c.id AND account = 'campaign' AND kind IN ('campaign_fund')), 0) AS funded,
           COALESCE((SELECT -SUM(amount_cents) FROM ledger WHERE campaign_id = c.id AND account = 'campaign' AND kind = 'spend'), 0) AS spent,
           COALESCE((SELECT SUM(amount_cents) FROM ledger WHERE campaign_id = c.id AND account = 'campaign'), 0) AS pool
         FROM campaigns c WHERE c.brand_user_id = ?1 AND c.status IN ('paid','live','paused','ended') ORDER BY c.updated_at DESC`,
      )
      .bind(user.id)
      .all<Camp>(),
  ])
  const totalLeft = camps.results.reduce((a, c) => a + forClippers(c.pool), 0)

  return (
    <>
      <SectionTabs group="account" />
      <PageHeader title="Funding" sub="Add money to your balance with PayPal, then put it into campaigns. Clippers are paid from the campaign, and our fee is added on top." />
      {q.paypal === 'return' && q.token && <CaptureOnReturn orderId={q.token} />}
      {q.funded && (
        <p role="status" className="mb-4 rounded-2xl border border-emerald-400/30 bg-emerald-400/[0.05] px-4 py-3 text-sm">
          Payment received. Your balance is updated.
        </p>
      )}
      {q.cancelled && <p role="status" className="mb-4 rounded-2xl border border-line px-4 py-3 text-sm text-mute">Payment cancelled. You have not been charged.</p>}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Your balance" value={money(b.brand)} note="Ready to put into campaigns" />
        <StatCard label="Left for clippers" value={money(totalLeft)} note="Across your running campaigns" />
        <StatCard label="Campaigns" value={String(camps.results.length)} />
      </div>

      {waiting.results.length > 0 && (
        <div className="mt-8 grid gap-3">
          {waiting.results.map((w) => (
            <Card key={w.id}>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-lg">{w.title} is approved and waiting for you</p>
                  <p className="mt-1 text-sm text-mute">
                    {money(w.budget_cents)} for clippers + {money(costFor(w.budget_cents) - w.budget_cents)} fee = {money(costFor(w.budget_cents))}. {b.brand >= costFor(w.budget_cents) ? 'Your balance covers it.' : `Add ${money(costFor(w.budget_cents) - b.brand)} or more below first.`}
                  </p>
                </div>
                <PayCampaignButton id={w.id} amount={money(costFor(w.budget_cents))} />
              </div>
            </Card>
          ))}
        </div>
      )}

      <h2 className="mt-10 mb-4 font-display text-2xl">Add funds</h2>
      <Card>
        <AddFunds ready={ready} />
      </Card>

      <h2 className="mt-10 mb-4 font-display text-2xl">Your campaigns</h2>
      <div className="grid gap-3">
        {camps.results.length === 0 && (
          <Card>
            <EmptyState icon="CreditCard" title="Nothing to fund yet" body="Once a campaign is paid for you can add more money to it here." />
          </Card>
        )}
        {camps.results.map((c) => {
          const left = forClippers(c.pool)
          const spent = forClippers(c.spent)
          const total = left + spent
          const pct = total > 0 ? Math.min(100, Math.round((spent / total) * 100)) : 0
          return (
            <Card key={c.id}>
              <div className="flex flex-wrap items-start justify-between gap-5">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-lg">
                    {c.title} <Badge tone={CAMPAIGN_STATUS[c.status]?.tone}>{CAMPAIGN_STATUS[c.status]?.brand ?? c.status}</Badge>
                  </p>
                  <p className="mt-1 text-sm text-mute">
                    {money(left)} left for clippers · {money(spent)} paid out so far
                  </p>
                  <div className="mt-3 h-2 max-w-md overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Share of the budget paid out">
                    <div className="h-full rounded-full bg-paper" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                {c.status !== 'ended' && <FundCampaign id={c.id} title={c.title} />}
              </div>
            </Card>
          )
        })}
      </div>

      <h2 className="mt-10 mb-4 font-display text-2xl">Payment history</h2>
      <DataTable
        rows={rows.results}
        columns={[
          { key: 'd', header: 'Date', render: (r) => new Date(r.created_at * 1000).toLocaleDateString('en-US', { dateStyle: 'medium' }) },
          { key: 'c', header: 'What', render: () => 'Added with PayPal' },
          { key: 'a', header: 'Amount', render: (r) => money(r.amount_cents), className: 'text-right' },
          { key: 's', header: 'Status', render: (r) => <Badge tone={r.status === 'paid' ? 'good' : r.status === 'disputed' ? 'bad' : 'neutral'}>{r.status}</Badge> },
        ]}
        empty={<EmptyState icon="CreditCard" title="No payments yet" body="Money you add with PayPal appears here." />}
      />
    </>
  )
}
