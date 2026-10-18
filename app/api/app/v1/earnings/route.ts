import { db } from '@/lib/db'
import { json, route } from '@/lib/http'
import { balances } from '@/lib/ledger'
import { paypalReady } from '@/lib/paypal'
import { paypalEmails } from '@/lib/paypal-emails'
import { getSetting } from '@/lib/settings'
import { SITE } from '@/lib/site'
import { requireUser } from '@/lib/user'

/** The Mac app's earnings screen: balances, the ledger, past withdrawals and the PayPal emails. Amounts are cents. */
export const GET = route(async () => {
  const user = await requireUser()
  const d = await db()
  const [b, ledger, payouts, emails, ready, paused] = await Promise.all([
    balances(user.id),
    d
      .prepare(
        `SELECT l.id, l.kind, l.amount_cents AS amountCents, l.note, l.created_at AS createdAt, c.title AS campaign
         FROM ledger l LEFT JOIN campaigns c ON c.id = l.campaign_id
         WHERE l.user_id = ?1 AND l.account = 'clipper' ORDER BY l.created_at DESC LIMIT 100`,
      )
      .bind(user.id)
      .all(),
    d.prepare('SELECT id, amount_cents AS amountCents, status, created_at AS createdAt FROM payouts WHERE user_id = ?1 ORDER BY created_at DESC LIMIT 25').bind(user.id).all(),
    paypalEmails(user.id),
    paypalReady(),
    getSetting('payouts_paused'),
  ])
  return json({
    balances: b,
    ledger: ledger.results,
    payouts: payouts.results,
    paypalEmail: emails.email,
    paypalEmails: emails.emails,
    minPayoutCents: SITE.minPayoutUsd * 100,
    open: ready && paused !== '1',
  })
})
