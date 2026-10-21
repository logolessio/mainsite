import type { Metadata } from 'next'
import { AdminButton } from '@/components/admin/ui'
import { money, when } from '@/lib/format'
import { PayoutsTable, type PayoutRow } from '@/components/app/admin-tables'
import { Badge } from '@/components/app/table'
import { Card, PageHeader } from '@/components/app/ui'
import { db } from '@/lib/db'
import { pageAdmin } from '@/lib/user'

export const metadata: Metadata = { title: 'Payouts | logoless', robots: { index: false } }

type Raw = { id: string; amount_cents: number; status: PayoutRow['status'] | 'review'; stripe_transfer_id: string | null; paypal_email: string | null; failure: string | null; review_reason: string | null; created_at: number; email: string; risk_level: string }

export default async function Page() {
  await pageAdmin()
  const d = await db()
  const all = (
    await d
      .prepare(
        `SELECT p.id, p.amount_cents, p.status, p.stripe_transfer_id, (SELECT value FROM settings WHERE key = 'payout-to:' || p.id) AS paypal_email, p.failure, p.review_reason, p.created_at, u.email, u.risk_level
         FROM payouts p JOIN users u ON u.id = p.user_id ORDER BY p.created_at DESC LIMIT 200`,
      )
      .all<Raw>()
  ).results
  const waiting = all.filter((p) => p.status === 'review')
  const rows: PayoutRow[] = all
    .filter((p) => p.status !== 'review')
    .map((p) => ({
      id: p.id,
      clipper: p.email,
      amount: p.amount_cents / 100,
      status: p.status as PayoutRow['status'],
      date: when(p.created_at),
      paypalId: p.stripe_transfer_id ?? '',
      to: p.paypal_email ?? '',
      note: p.failure ?? '',
    }))

  return (
    <>
      <PageHeader title="Payouts" sub="Withdrawals are sent to the PayPal email the clipper chose. Some are held for a quick check first." />
      {waiting.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 font-display text-3xl">Waiting for you <span className="text-mute">{waiting.length}</span></h2>
          <div className="grid gap-3">
            {waiting.map((p) => (
              <Card key={p.id}>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-lg">
                      {money(p.amount_cents)} <span className="text-sm text-mute">to {p.paypal_email ?? p.email}</span> {p.risk_level !== 'low' && <Badge tone="warn">extra checks</Badge>}
                    </p>
                    <p className="mt-1 text-xs text-mute">Requested {when(p.created_at)}. Held because: {p.review_reason ?? 'review'}</p>
                  </div>
                  <div className="flex gap-2">
                    <AdminButton variant="solid" url={`/api/admin/payouts/${p.id}`} data={{ action: 'approve' }} confirm={`Send ${money(p.amount_cents)} now?`} summary={[`${money(p.amount_cents)} goes to ${p.paypal_email ?? p.email} on PayPal straight away.`, `Held because: ${p.review_reason ?? 'review'}.`, 'A PayPal payment cannot be called back from here.']} secret={`Sending ${money(p.amount_cents)} to ${p.paypal_email ?? p.email}.`}>Approve and send</AdminButton>
                    <AdminButton variant="danger" url={`/api/admin/payouts/${p.id}`} data={{ action: 'reject' }} ask={{ label: 'Why? (the clipper sees this)', required: true }}>Decline</AdminButton>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}
      <PayoutsTable rows={rows} />
    </>
  )
}
