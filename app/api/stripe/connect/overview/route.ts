import { HttpError, json, route } from '@/lib/http'
import { stripe } from '@/lib/stripe'
import { requireUser } from '@/lib/user'

/** The clipper's own Stripe balance and recent bank payouts, so they can see where their money is. Amounts are minor units. */
export const GET = route(async () => {
  const user = await requireUser()
  if (!user.stripe_account_id) throw new HttpError(400, 'Set up payouts first.')
  const s = await stripe()
  const opts = { stripeAccount: user.stripe_account_id }
  const [bal, list] = await Promise.all([s.balance.retrieve({}, opts), s.payouts.list({ limit: 15 }, opts)])
  return json({
    available: bal.available.map((b) => ({ amount: b.amount, currency: b.currency })),
    pending: bal.pending.map((b) => ({ amount: b.amount, currency: b.currency })),
    payouts: list.data.map((p) => ({ id: p.id, amount: p.amount, currency: p.currency, status: p.status, arrival: p.arrival_date, created: p.created, failure: p.failure_message ? 'Your bank did not accept this payout. Check your bank details.' : null })),
  })
})
