import { db } from '@/lib/db'
import { json, route } from '@/lib/http'
import { balances } from '@/lib/ledger'
import { isSandbox, paypalReady } from '@/lib/paypal'
import { requireUser } from '@/lib/user'

/** Everything the billing and payouts pages need, in one call. Amounts are cents. */
export const GET = route(async () => {
  const user = await requireUser()
  const d = await db()
  const [b, topups, payouts, email] = await Promise.all([
    balances(user.id),
    d.prepare("SELECT id, amount_cents, status, created_at FROM topups WHERE user_id = ?1 AND status <> 'open' ORDER BY created_at DESC LIMIT 25").bind(user.id).all(),
    d.prepare('SELECT id, amount_cents, status, created_at FROM payouts WHERE user_id = ?1 ORDER BY created_at DESC LIMIT 25').bind(user.id).all(),
    d.prepare('SELECT value FROM settings WHERE key = ?1').bind(`paypal:${user.id}`).first<{ value: string }>(),
  ])
  return json({
    balances: b,
    paypalEmail: email?.value ?? '',
    topups: topups.results,
    payouts: payouts.results,
    ready: await paypalReady(),
    testMode: await isSandbox(),
  })
})
