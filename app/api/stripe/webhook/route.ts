import type Stripe from 'stripe'
import { db, nowSec, uid } from '@/lib/db'
import { HttpError, json, route } from '@/lib/http'
import { logEvent } from '@/lib/log'
import { notify, notifyAdmins } from '@/lib/notify'
import { creditTopup, debitRefund, fundCampaign, reverseWithdrawal } from '@/lib/ledger'
import { Stripe as StripeLib, stripe, webhookSecrets } from '@/lib/stripe'

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
  let event: Stripe.Event | null = null
  for (const secret of await webhookSecrets()) {
    try {
      event = await s.webhooks.constructEventAsync(raw, signature, secret, undefined, StripeLib.createSubtleCryptoProvider())
      break
    } catch {
      /* wrong secret for this endpoint: try the next one */
    }
  }
  if (!event) throw new HttpError(400, 'Invalid signature.')

  const d = await db()
  const seen = await d.prepare('SELECT 1 AS x FROM stripe_events WHERE id = ?1').bind(event.id).first()
  if (seen) return json({ received: true, duplicate: true })

  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded': {
      const session = event.data.object as Stripe.Checkout.Session
      const kind = session.metadata?.kind
      if ((kind !== 'topup' && kind !== 'campaign') || session.payment_status !== 'paid') break
      const userId = session.metadata?.user_id
      const campaignId = kind === 'campaign' ? (session.metadata?.campaign_id ?? null) : null
      const amount = session.amount_total ?? 0
      if (!userId || amount <= 0 || (kind === 'campaign' && !campaignId)) break
      const pi = typeof session.payment_intent === 'string' ? session.payment_intent : (session.payment_intent?.id ?? null)

      let receipt: string | null = null
      let processingFee = 0
      if (pi) {
        try {
          const intent = await s.paymentIntents.retrieve(pi, { expand: ['latest_charge.balance_transaction'] })
          const charge = intent.latest_charge as Stripe.Charge | null
          receipt = charge?.receipt_url ?? null
          const bt = charge?.balance_transaction as Stripe.BalanceTransaction | null | undefined
          processingFee = bt && typeof bt === 'object' ? bt.fee : 0
        } catch {
          /* the receipt link and fee are niceties, never block the credit on them */
        }
      }

      const t = nowSec()
      await d
        .prepare(
          `INSERT INTO topups (id, user_id, session_id, payment_intent, amount_cents, status, receipt_url, created_at, paid_at, stripe_fee_cents, campaign_id)
           VALUES (?1, ?2, ?3, ?4, ?5, 'paid', ?6, ?7, ?7, ?8, ?9)
           ON CONFLICT(session_id) DO UPDATE SET status='paid', payment_intent=excluded.payment_intent, receipt_url=excluded.receipt_url,
             paid_at=excluded.paid_at, stripe_fee_cents=excluded.stripe_fee_cents, campaign_id=excluded.campaign_id`,
        )
        .bind(uid(), userId, session.id, pi, amount, receipt, t, processingFee, campaignId)
        .run()
      if (campaignId) {
        // The artist paid for their campaign: the money goes into that campaign's pool and the admin is told it can launch.
        const camp = await d.prepare('SELECT title, status, budget_cents FROM campaigns WHERE id = ?1 AND brand_user_id = ?2').bind(campaignId, userId).first<{ title: string; status: string; budget_cents: number }>()
        if (camp) {
          await fundCampaign(d, userId, campaignId, session.id, amount)
          await d
            .prepare("UPDATE campaigns SET status = 'paid', paid_at = ?2, updated_at = ?2 WHERE id = ?1 AND status IN ('awaiting_payment','requested')")
            .bind(campaignId, t)
            .run()
          await notify(userId, { kind: 'campaign', title: `Payment received for ${camp.title}`, body: 'We will launch your campaign shortly.', href: '/brand/campaigns', dedupe: `camp-paid:${campaignId}` })
          await notifyAdmins({ title: `Paid: ${camp.title} is ready to launch`, body: `$${(amount / 100).toFixed(2)} received.`, href: '/admin/campaigns', dedupe: `camp-paid:${campaignId}` })
        }
      } else {
        await creditTopup(d, userId, session.id, amount)
      }
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
      const topup = await d.prepare('SELECT user_id, refunded_cents, campaign_id FROM topups WHERE payment_intent = ?1').bind(pi).first<{ user_id: string; refunded_cents: number; campaign_id: string | null }>()
      if (!topup) break
      const delta = ch.amount_refunded - topup.refunded_cents
      if (delta > 0) {
        await debitRefund(d, topup.user_id, delta, `refund:${ch.id}:${ch.amount_refunded}`, topup.campaign_id)
        if (topup.campaign_id) await d.prepare("UPDATE campaigns SET status = 'paused', admin_note = 'Payment refunded: review before relaunching', updated_at = ?2 WHERE id = ?1 AND status IN ('live','paid')").bind(topup.campaign_id, nowSec()).run()
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

  logEvent({ kind: 'money', name: `stripe ${event.type}`, detail: `${event.id}${event.livemode ? ' (live)' : ' (test)'}` })
  await d.prepare('INSERT OR IGNORE INTO stripe_events (id, type, received_at) VALUES (?1, ?2, ?3)').bind(event.id, event.type, nowSec()).run()
  return json({ received: true })
})
