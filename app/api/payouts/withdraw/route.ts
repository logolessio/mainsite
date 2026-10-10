import { balances, markPayoutSent, reverseWithdrawal, startWithdrawal } from '@/lib/ledger'
import { assertSameOrigin, body, HttpError, json, route } from '@/lib/http'
import { SITE } from '@/lib/site'
import { stripe } from '@/lib/stripe'
import { requireUser } from '@/lib/user'

/** Clipper withdraws earnings to their connected Stripe account. */
export const POST = route(async (req: Request) => {
  assertSameOrigin(req)
  const user = await requireUser()
  const { amount } = await body<{ amount?: number }>(req).catch(() => ({ amount: undefined }))

  if (!user.stripe_account_id || !user.connect_ready) throw new HttpError(400, 'Connect your Stripe account first.')

  const b = await balances(user.id)
  const cents = amount === undefined ? b.available : Math.round(Number(amount) * 100)
  if (!Number.isInteger(cents) || cents <= 0) throw new HttpError(400, 'Enter a valid amount.')
  if (cents < SITE.minPayoutUsd * 100) throw new HttpError(400, `The minimum withdrawal is $${SITE.minPayoutUsd}.`)

  // reserve the money first; this is the step that prevents double withdrawals
  const payoutId = await startWithdrawal(user.id, cents)
  if (!payoutId) throw new HttpError(409, 'That is more than your available balance.')

  try {
    const s = await stripe()
    const transfer = await s.transfers.create(
      {
        amount: cents,
        currency: 'usd',
        destination: user.stripe_account_id,
        transfer_group: `payout_${payoutId}`,
        metadata: { payout_id: payoutId, user_id: user.id },
      },
      { idempotencyKey: `payout_${payoutId}` },
    )
    await markPayoutSent(payoutId, transfer.id)
    return json({ ok: true, payoutId, amount: cents })
  } catch (e) {
    const reason = e instanceof Error ? e.message : 'Transfer failed'
    await reverseWithdrawal(payoutId, 'failed', reason)
    throw new HttpError(502, 'We could not send that payout right now. Your balance has not changed. Please try again later.')
  }
})
