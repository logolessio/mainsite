import type { Metadata } from 'next'
import { PayoutsPanel } from '@/components/app/payouts-panel'
import { Bento, Tile } from '@/components/app/bento'
import { CountUp } from '@/components/app/count-up'
import { EarningsChart } from '@/components/app/earnings-chart'
import { Badge, DataTable, EmptyState } from '@/components/app/table'
import { Card, PageHeader } from '@/components/app/ui'
import { db, nowSec } from '@/lib/db'
import { balances } from '@/lib/ledger'
import { pageUser } from '@/lib/user'

export const metadata: Metadata = { title: 'Earnings | logoless', robots: { index: false } }

type Row = { id: string; kind: string; amount_cents: number; note: string | null; created_at: number; title: string | null }

const usd = (c: number) => `${c < 0 ? '-' : ''}$${(Math.abs(c) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const KIND: Record<string, { label: string; tone: 'good' | 'warn' | 'bad' | 'neutral' }> = {
  earning: { label: 'Earned', tone: 'good' },
  withdrawal: { label: 'Withdrawn', tone: 'neutral' },
  withdrawal_reversal: { label: 'Returned', tone: 'warn' },
  earning_reversal: { label: 'Reversed', tone: 'bad' },
}

export default async function Page() {
  const user = await pageUser()
  const d = await db()
  const now = nowSec()
  const [b, rows] = await Promise.all([
    balances(user.id),
    d
      .prepare(
        `SELECT l.id, l.kind, l.amount_cents, l.note, l.created_at, c.title
         FROM ledger l LEFT JOIN campaigns c ON c.id = l.campaign_id
         WHERE l.user_id = ?1 AND l.account = 'clipper' ORDER BY l.created_at DESC LIMIT 300`,
      )
      .bind(user.id)
      .all<Row>(),
  ])
  const events: [number, number][] = rows.results.filter((r) => r.kind === 'earning').map((r) => [r.created_at, r.amount_cents])
  const monthAgo = now - 30 * 86400
  const thisMonth = events.filter(([t]) => t >= monthAgo).reduce((s, [, c]) => s + c, 0)

  return (
    <>
      <PageHeader title="Earnings" sub="What your clips have earned, your PayPal emails, and withdrawing. We cover PayPal's fees." />
      <div className="mb-6">
        <PayoutsPanel />
      </div>
      <Bento>
        <Tile className="p-7 md:col-span-6 xl:col-span-6">
          <p className="text-sm text-mute">Lifetime earned</p>
          <p className="mt-4 font-display text-6xl leading-none font-medium tracking-tight tabular-nums md:text-7xl">
            <CountUp value={usd(b.earned)} />
          </p>
          <p className="mt-4 text-sm text-mute">{usd(thisMonth)} in the last 30 days</p>
        </Tile>
        {[
          { label: 'Available', value: usd(b.available), note: 'Ready to withdraw' },
          ...(b.pending > 0 ? [{ label: 'Pending', value: usd(b.pending), note: 'Being confirmed' }] : []),
          { label: 'Withdrawn', value: usd(b.withdrawn), note: 'All time' },
        ].map((t) => (
          <Tile key={t.label} className="p-6 md:col-span-3 xl:col-span-3">
            <p className="text-sm text-mute">{t.label}</p>
            <p className="mt-3 font-display text-3xl leading-none font-medium tracking-tight tabular-nums">
              <CountUp value={t.value} />
            </p>
            <p className="mt-3 text-xs text-mute">{t.note}</p>
          </Tile>
        ))}
        <Tile className="p-6 md:col-span-6 xl:col-span-12">
          <h2 className="mb-6 text-base font-medium tracking-tight">Earnings over time</h2>
          {events.length === 0 ? <EmptyState icon="CircleDollarSign" title="No earnings yet" body="Your chart will appear here once your first clip is verified." /> : <EarningsChart events={events} now={now} />}
        </Tile>
      </Bento>

      <Card title="Ledger" sub="Every earning and withdrawal, newest first." className="mt-6">
        <DataTable
          rows={rows.results}
          columns={[
            { key: 'd', header: 'Date', render: (r) => new Date(r.created_at * 1000).toLocaleDateString('en-US', { dateStyle: 'medium' }) },
            { key: 'k', header: 'Type', render: (r) => <Badge tone={KIND[r.kind]?.tone ?? 'neutral'}>{KIND[r.kind]?.label ?? r.kind}</Badge> },
            { key: 'c', header: 'Campaign', render: (r) => r.title ?? r.note ?? '-' },
            { key: 'a', header: 'Amount', render: (r) => <span className={r.amount_cents < 0 ? 'text-mute' : ''}>{usd(r.amount_cents)}</span>, className: 'text-right tabular-nums' },
          ]}
          empty={<EmptyState title="Ledger is empty" body="Approved clips and withdrawals will be listed here." />}
        />
      </Card>
    </>
  )
}
