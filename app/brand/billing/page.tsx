import type { Metadata } from 'next'
import { FundCampaign } from '@/components/app/fund-campaign'
import { Badge, DataTable, EmptyState } from '@/components/app/table'
import { Card, PageHeader, StatCard } from '@/components/app/ui'
import { CAMPAIGN_STATUS } from '@/lib/campaign-status'
import { db } from '@/lib/db'
import { money } from '@/lib/format'
import { pageUser } from '@/lib/user'

export const metadata: Metadata = { title: 'Funding | logoless', robots: { index: false } }

type Row = { id: string; title: string | null; amount_cents: number; status: string; receipt_url: string | null; created_at: number }
type Camp = { id: string; title: string; status: string; funded: number; spent: number; pool: number }

export default async function Page({ searchParams }: { searchParams: Promise<{ funded?: string; cancelled?: string }> }) {
  const user = await pageUser()
  const q = await searchParams
  const d = await db()
  const [rows, camps] = await Promise.all([
    d
      .prepare(
        `SELECT t.id, c.title, t.amount_cents, t.status, t.receipt_url, t.created_at
         FROM topups t LEFT JOIN campaigns c ON c.id = t.campaign_id WHERE t.user_id = ?1 AND t.status <> 'open' ORDER BY t.created_at DESC LIMIT 100`,
      )
      .bind(user.id)
      .all<Row>(),
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
  const totalFunded = camps.results.reduce((a, c) => a + c.funded, 0)
  const totalLeft = camps.results.reduce((a, c) => a + c.pool, 0)

  return (
    <>
      <PageHeader title="Funding" sub="Add money to a running campaign, see what is left in each pool, and find every receipt." />
      {q.funded && (
        <p role="status" className="mb-4 rounded-2xl border border-emerald-400/30 bg-emerald-400/[0.05] px-4 py-3 text-sm">
          Payment sent. The funds appear in the campaign pool as soon as Stripe confirms it, usually within a minute.
        </p>
      )}
      {q.cancelled && <p role="status" className="mb-4 rounded-2xl border border-line px-4 py-3 text-sm text-mute">Payment cancelled. You have not been charged.</p>}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Added in total" value={money(totalFunded)} />
        <StatCard label="Left in your pools" value={money(totalLeft)} note="Spent only on verified views" />
        <StatCard label="Funded campaigns" value={String(camps.results.length)} />
      </div>

      <h2 className="mt-10 mb-4 font-display text-2xl">Your campaigns</h2>
      <div className="grid gap-3">
        {camps.results.length === 0 && (
          <Card>
            <EmptyState icon="CreditCard" title="Nothing to fund yet" body="Once a campaign is paid for you can add more money to it here." />
          </Card>
        )}
        {camps.results.map((c) => {
          const pct = c.funded > 0 ? Math.min(100, Math.round((c.spent / c.funded) * 100)) : 0
          return (
            <Card key={c.id}>
              <div className="flex flex-wrap items-start justify-between gap-5">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-lg">
                    {c.title} <Badge tone={CAMPAIGN_STATUS[c.status]?.tone}>{CAMPAIGN_STATUS[c.status]?.brand ?? c.status}</Badge>
                  </p>
                  <p className="mt-1 text-sm text-mute">
                    {money(c.pool)} left · {money(c.spent)} spent of {money(c.funded)}
                  </p>
                  <div className="mt-3 h-2 max-w-md overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Share of the pool spent">
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
          { key: 'c', header: 'Campaign', render: (r) => r.title ?? 'Balance' },
          { key: 'a', header: 'Amount', render: (r) => money(r.amount_cents), className: 'text-right' },
          { key: 's', header: 'Status', render: (r) => <Badge tone={r.status === 'paid' ? 'good' : r.status === 'disputed' ? 'bad' : 'neutral'}>{r.status}</Badge> },
          { key: 'r', header: 'Receipt', render: (r) => (r.receipt_url ? <a href={r.receipt_url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">View</a> : '-') },
        ]}
        empty={<EmptyState icon="CreditCard" title="No payments yet" body="Payments appear here once you pay for a campaign." />}
      />
    </>
  )
}
