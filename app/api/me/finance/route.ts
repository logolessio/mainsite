import { db } from '@/lib/db'
import { json, route } from '@/lib/http'
import { balances } from '@/lib/ledger'
import { isTestMode } from '@/lib/stripe'
import { requireUser } from '@/lib/user'

/** Everything the billing and payouts pages need, in one call. Amounts are cents. */
export const GET = route(async () => {
  const user = await requireUser()
  const d = await db()
  const [b, topups, payouts] = await Promise.all([
    balances(user.id),
    d.prepare("SELECT id, amount_cents, status, receipt_url, created_at FROM topups WHERE user_id = ?1 AND status <> 'open' ORDER BY created_at DESC LIMIT 25").bind(user.id).all(),
    d.prepare('SELECT id, amount_cents, status, created_at FROM payouts WHERE user_id = ?1 ORDER BY created_at DESC LIMIT 25').bind(user.id).all(),
  ])
  return json({
    balances: b,
    connect: { status: !user.stripe_account_id ? 'not_connected' : user.connect_ready ? 'ready' : 'incomplete' },
    hasCustomer: Boolean(user.stripe_customer_id),
    topups: topups.results,
    payouts: payouts.results,
    testMode: await isTestMode(),
  })
})
