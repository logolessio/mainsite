import type Stripe from 'stripe'
import { db, nowSec, uid } from '@/lib/db'
import { HttpError, json, route } from '@/lib/http'
import { creditTopup, debitRefund, reverseWithdrawal } from '@/lib/ledger'
import { Stripe as StripeLib, stripe, webhookSecret } from '@/lib/stripe'

/**
 * Stripe calls this URL when something happens (payment paid, refund, account ready...).
 * The signature check proves the request really came from Stripe. Every handler below is safe to run twice,
 * because Stripe retries deliveries.
 *
 * In the Stripe dashboard (Developers > Webhooks) point an endpoint at /api/stripe/webhook and tick:
 *   checkout.session.completed, checkout.session.async_payment_succeeded, checkout.session.async_payment_failed,
 *   checkout.session.expired, account.updated, transfer.reversed, charge.refunded, charge.dispute.created
 * For account.updated choose "Listen to events on Connected accounts".
 */
export const POST = route(async (req: Request) => {
  const raw = await req.text()
  const signature = req.headers.get('stripe-signature')
  if (!signature) throw new HttpError(400, 'Missing signature.')

  const s = await stripe()
  let event: Stripe.Event
  try {
    event = await s.webhooks.constructEventAsync(raw, signature, await webhookSecret(), undefined, StripeLib.createSubtleCryptoProvider())
  } catch {
    throw new HttpError(400, 'Invalid signature.')
  }

  const d = await db()
  const seen = await d.prepare('SELECT 1 AS x FROM stripe_events WHERE id = ?1').bind(event.id).first()
  if (seen) return json({ received: true, duplicate: true })

  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded': {
      const session = event.data.object as Stripe.Checkout.Session
      if (session.metadata?.kind !== 'topup' || session.payment_status !== 'paid') break
      const userId = session.metadata.user_id
      const amount = session.amount_total ?? 0
      if (!userId || amount <= 0) break
      const pi = typeof session.payment_intent === 'string' ? session.payment_intent : (session.payment_intent?.id ?? null)

      let receipt: string | null = null
      if (pi) {
        try {
          const intent = await s.paymentIntents.retrieve(pi, { expand: ['latest_charge'] })
          const charge = intent.latest_charge as Stripe.Charge | null
          receipt = charge?.receipt_url ?? null
        } catch {
          /* the receipt link is a nicety, never block the credit on it */
        }
      }

      const t = nowSec()
      await d
        .prepare(
          `INSERT INTO topups (id, user_id, session_id, payment_intent, amount_cents, status, receipt_url, created_at, paid_at)
           VALUES (?1, ?2, ?3, ?4, ?5, 'paid', ?6, ?7, ?7)
           ON CONFLICT(session_id) DO UPDATE SET status='paid', payment_intent=excluded.payment_intent, receipt_url=excluded.receipt_url, paid_at=excluded.paid_at`,
        )
        .bind(uid(), userId, session.id, pi, amount, receipt, t)
        .run()
      await creditTopup(d, userId, session.id, amount)
      break
    }

    case 'checkout.session.async_payment_failed':
    case 'checkout.session.expired': {
      const session = event.data.object as Stripe.Checkout.Session
      const status = event.type === 'checkout.session.expired' ? 'expired' : 'failed'
      await d.prepare("UPDATE topups SET status = ?2 WHERE session_id = ?1 AND status = 'open'").bind(session.id, status).run()
      break
    }

    case 'account.updated': {
      const a = event.data.object as Stripe.Account
      await d
        .prepare('UPDATE users SET connect_ready = ?2, connect_details_submitted = ?3 WHERE stripe_account_id = ?1')
        .bind(a.id, a.payouts_enabled ? 1 : 0, a.details_submitted ? 1 : 0)
        .run()
      break
    }

    case 'transfer.reversed': {
      const tr = event.data.object as Stripe.Transfer
      const payoutId = tr.metadata?.payout_id
      if (payoutId) await reverseWithdrawal(payoutId, 'reversed', 'Transfer reversed by Stripe')
      break
    }

    case 'charge.refunded': {
      const ch = event.data.object as Stripe.Charge
      const pi = typeof ch.payment_intent === 'string' ? ch.payment_intent : ch.payment_intent?.id
      if (!pi) break
      const topup = await d.prepare('SELECT user_id, refunded_cents FROM topups WHERE payment_intent = ?1').bind(pi).first<{ user_id: string; refunded_cents: number }>()
      if (!topup) break
      const delta = ch.amount_refunded - topup.refunded_cents
      if (delta > 0) {
        await debitRefund(d, topup.user_id, delta, `refund:${ch.id}:${ch.amount_refunded}`)
        await d.prepare('UPDATE topups SET refunded_cents = ?2 WHERE payment_intent = ?1').bind(pi, ch.amount_refunded).run()
      }
      break
    }

    case 'charge.dispute.created': {
      const dp = event.data.object as Stripe.Dispute
      const pi = typeof dp.payment_intent === 'string' ? dp.payment_intent : dp.payment_intent?.id
      // A dispute needs a human. Flag the top-up so an admin can see it; no money moves automatically.
      if (pi) await d.prepare("UPDATE topups SET status = 'disputed' WHERE payment_intent = ?1").bind(pi).run()
      break
    }

    default:
      break
  }

  await d.prepare('INSERT OR IGNORE INTO stripe_events (id, type, received_at) VALUES (?1, ?2, ?3)').bind(event.id, event.type, nowSec()).run()
  return json({ received: true })
})
