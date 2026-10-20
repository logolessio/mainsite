import type { Metadata } from 'next'
import { AddFunds } from '@/components/app/add-funds'
import { CaptureOnReturn } from '@/components/app/capture-on-return'
import { PayCampaignButton } from '@/components/app/pay-campaign-button'
import { Badge, DataTable, EmptyState } from '@/components/app/table'
import { Card, PageHeader } from '@/components/app/ui'
import { db } from '@/lib/db'
import { money } from '@/lib/format'
import { balances } from '@/lib/ledger'
import { costFor, startNeeded } from '@/lib/ledger-math'
import { paypalReady } from '@/lib/paypal'
import { pageUser } from '@/lib/user'

export const metadata: Metadata = { title: 'Balance | logoless', robots: { index: false } }

type Waiting = { id: string; title: string; budget_cents: number }
type Move = { id: string; kind: string; amount_cents: number; created_at: number; title: string | null }

const KIND: Record<string, { label: string; tone: 'good' | 'neutral' | 'warn' }> = {
  topup: { label: 'Added with PayPal', tone: 'good' },
  earning_spend: { label: 'Paid to creators', tone: 'neutral' },
  campaign_spend: { label: 'Put into a campaign', tone: 'neutral' },
  pool_release: { label: 'Returned from a campaign', tone: 'good' },
  refund: { label: 'Refunded', tone: 'warn' },
}

/** One balance for every campaign: add money here, and clippers are paid out of it as they earn. */
export default async function Page({ searchParams }: { searchParams: Promise<{ funded?: string; cancelled?: string; paypal?: string; token?: string; back?: string }> }) {
  const user = await pageUser()
  const q = await searchParams
  const d = await db()
  const [b, ready, waiting, moves, rate] = await Promise.all([
    balances(user.id),
    paypalReady(),
    d.prepare("SELECT id, title, budget_cents FROM campaigns WHERE brand_user_id = ?1 AND status = 'awaiting_payment' ORDER BY updated_at DESC").bind(user.id).all<Waiting>(),
    d
      .prepare("SELECT l.id, l.kind, l.amount_cents, l.created_at, c.title FROM ledger l LEFT JOIN campaigns c ON c.id = l.campaign_id WHERE l.user_id = ?1 AND l.account = 'brand' ORDER BY l.created_at DESC LIMIT 100")
      .bind(user.id)
      .all<Move>(),
    d.prepare("SELECT COALESCE(AVG(rate_cents), 0) AS r FROM campaigns WHERE brand_user_id = ?1 AND status IN ('live','paused','awaiting_payment')").bind(user.id).first<{ r: number }>(),
  ])
  const avg = rate?.r ?? 0
  // what the balance would pay for: the fee comes on top of what clippers earn
  const views = avg > 0 ? Math.floor((b.brand / (1 + 0.15) / avg) * 1000) : 0

  return (
    <>
      <PageHeader title="Balance" sub="One balance for all your campaigns. Creators are paid out of it as they earn, and we cover PayPal's fees on every deposit." />
      {q.paypal === 'return' && q.token && <CaptureOnReturn orderId={q.token} back={q.back} />}
      {q.funded && (
        <p role="status" className="mb-4 rounded-2xl border border-emerald-400/30 bg-emerald-400/[0.05] px-4 py-3 text-sm">
          Payment received. Your balance is updated.
        </p>
      )}
      {q.cancelled && <p role="status" className="mb-4 rounded-2xl border border-line px-4 py-3 text-sm text-mute">Payment cancelled. You have not been charged.</p>}

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="border-t border-line-strong pt-5">
          <p className="text-[15px] text-paper/50">Your balance</p>
          <p className="mt-6 font-display text-6xl leading-none tracking-[-0.045em] tabular-nums md:text-[4.5rem]">{money(b.brand)}</p>
          <p className="mt-5 text-[15px] text-paper/50">{views > 0 ? `Pays for about ${views.toLocaleString()} more verified views at your current rates.` : 'Add funds and start a campaign to see what it will pay for.'}</p>
        </div>
        <Card id="add-funds" title="Add funds">
          <AddFunds ready={ready} />
        </Card>
      </div>

      {waiting.results.length > 0 && (
        <div className="mt-8 grid gap-3">
          {waiting.results.map((w) => {
            const need = startNeeded(w.budget_cents)
            return (
              <Card key={w.id}>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-lg">{w.title} is approved</p>
                    <p className="mt-1 text-sm text-mute">
                      {b.brand >= need ? 'Your balance covers the start. Nothing is charged until creators earn.' : `Add ${money(need - b.brand)} or more first. Up to ${money(costFor(w.budget_cents))} can be spent in total, only as creators earn.`}
                    </p>
                  </div>
                  <PayCampaignButton id={w.id} />
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <h2 className="mt-12 mb-4 font-display text-2xl">History</h2>
      <DataTable
        rows={moves.results}
        columns={[
          { key: 'd', header: 'Date', render: (r) => new Date(r.created_at * 1000).toLocaleDateString('en-US', { dateStyle: 'medium' }) },
          { key: 'k', header: 'What', render: (r) => <Badge tone={KIND[r.kind]?.tone ?? 'neutral'}>{KIND[r.kind]?.label ?? r.kind}</Badge> },
          { key: 'c', header: 'Campaign', render: (r) => r.title ?? '' },
          { key: 'a', header: 'Amount', render: (r) => <span className={r.amount_cents < 0 ? 'text-mute' : ''}>{r.amount_cents < 0 ? '-' : '+'}{money(Math.abs(r.amount_cents))}</span>, className: 'text-right tabular-nums' },
        ]}
        empty={<EmptyState icon="CreditCard" title="Nothing yet" body="Money you add with PayPal, and what creators are paid, appears here." />}
      />
    </>
  )
}
