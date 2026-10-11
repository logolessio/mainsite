import { db, nowSec, setting } from './db'
import { captchaConfigured } from './human'
import { stripe } from './stripe'

export type Funds = {
  heldForCampaigns: number // budgets artists paid that have not been paid out yet
  owedToClippers: number // earned by clippers, not yet withdrawn (pending and available)
  legacyBalances: number // old-style brand balances
  company: number // all of the above: brand money we hold to pay clippers
  fees: number // the platform fee kept so far (the 10%)
  stripeCosts: number // what Stripe charged us to take the payments
  paidOut: number // sent to clippers
  inReview: number // withdrawals waiting for an admin
}

export async function funds(): Promise<Funds> {
  const d = await db()
  const r = await d
    .prepare(
      `SELECT
         COALESCE((SELECT SUM(amount_cents) FROM ledger WHERE account = 'campaign'), 0) AS heldForCampaigns,
         COALESCE((SELECT SUM(amount_cents) FROM ledger WHERE account = 'clipper'), 0) AS owedToClippers,
         COALESCE((SELECT SUM(amount_cents) FROM ledger WHERE account = 'brand'), 0) AS legacyBalances,
         COALESCE((SELECT SUM(fee_cents) FROM earnings), 0) AS fees,
         COALESCE((SELECT SUM(stripe_fee_cents) FROM topups WHERE status = 'paid'), 0) AS stripeCosts,
         COALESCE((SELECT SUM(amount_cents) FROM payouts WHERE status = 'sent'), 0) AS paidOut,
         COALESCE((SELECT SUM(amount_cents) FROM payouts WHERE status = 'review'), 0) AS inReview`,
    )
    .first<Omit<Funds, 'company'>>()
  const f = r ?? { heldForCampaigns: 0, owedToClippers: 0, legacyBalances: 0, fees: 0, stripeCosts: 0, paidOut: 0, inReview: 0 }
  return { ...f, company: f.heldForCampaigns + f.owedToClippers + f.legacyBalances }
}

export async function counts() {
  const d = await db()
  const t = nowSec()
  const r = await d
    .prepare(
      `SELECT
         (SELECT COUNT(*) FROM users) AS users,
         (SELECT COUNT(*) FROM users WHERE last_seen_at > ?1 - 300) AS activeNow,
         (SELECT COUNT(*) FROM users WHERE last_seen_at > ?1 - 86400) AS active24h,
         (SELECT COUNT(*) FROM users WHERE created_at > ?1 - 86400) AS signups24h,
         (SELECT COUNT(*) FROM users WHERE risk_level != 'low') AS flagged,
         (SELECT COUNT(*) FROM users WHERE status != 'active') AS restricted,
         (SELECT COUNT(*) FROM submissions WHERE status = 'pending') AS pendingClips,
         (SELECT COUNT(*) FROM campaigns WHERE status = 'requested') AS requests,
         (SELECT COUNT(*) FROM campaigns WHERE status = 'awaiting_payment') AS awaitingPayment,
         (SELECT COUNT(*) FROM campaigns WHERE status = 'paid') AS readyToLaunch,
         (SELECT COUNT(*) FROM campaigns WHERE status = 'live') AS live,
         (SELECT COUNT(*) FROM payouts WHERE status = 'review') AS payoutsInReview,
         (SELECT COUNT(*) FROM payouts WHERE status = 'failed' AND created_at > ?1 - 604800) AS payoutsFailed`,
    )
    .bind(t)
    .first<Record<string, number>>()
  return r ?? {}
}

export type Health = { key: string; label: string; state: 'ok' | 'warn' | 'bad'; detail: string }

/** Which secrets and services are set up. Never returns a secret value, only whether it exists. */
export async function health(): Promise<Health[]> {
  const out: Health[] = []
  const has = async (n: string) => Boolean(await setting(n))
  const sk = (await setting('STRIPE_SECRET_KEY')) ?? ''
  out.push({
    key: 'stripe',
    label: 'Stripe key',
    state: sk ? 'ok' : 'bad',
    detail: sk ? (sk.startsWith('sk_live_') || sk.startsWith('rk_live_') ? 'Live mode: real money' : 'Test mode: no real money') : 'Not set',
  })
  out.push({ key: 'webhook', label: 'Stripe webhook secret', state: (await has('STRIPE_WEBHOOK_SECRET')) ? 'ok' : 'bad', detail: (await has('STRIPE_WEBHOOK_SECRET')) ? 'Set' : 'Not set: payments will not be credited' })
  const secret = (await setting('AUTH_SECRET')) ?? ''
  out.push({ key: 'auth', label: 'Sign-in secret', state: secret.length >= 32 ? 'ok' : secret ? 'warn' : 'bad', detail: secret.length >= 32 ? 'Set and long enough' : secret ? 'Set but short: use 32+ characters' : 'Not set' })
  out.push({ key: 'google', label: 'Google sign-in', state: (await has('AUTH_GOOGLE_ID')) && (await has('AUTH_GOOGLE_SECRET')) ? 'ok' : 'bad', detail: (await has('AUTH_GOOGLE_ID')) ? 'Set' : 'Not set' })
  out.push({ key: 'captcha', label: 'Human check (Turnstile)', state: (await captchaConfigured()) ? 'ok' : 'warn', detail: (await captchaConfigured()) ? 'Active on sign-in' : 'Not set up: bots can sign up' })
  out.push({ key: 'email', label: 'Email (Resend)', state: (await has('RESEND_API_KEY')) ? 'ok' : 'warn', detail: (await has('RESEND_API_KEY')) ? 'Key set. Run the email test to check the domain.' : 'Not set: email sign-up and password reset are off' })
  const admins = ((await setting('ADMIN_EMAILS')) ?? '').split(',').filter((e) => e.trim()).length
  out.push({ key: 'admins', label: 'Admin accounts', state: admins > 0 ? 'ok' : 'bad', detail: admins ? `${admins} admin email${admins > 1 ? 's' : ''}` : 'ADMIN_EMAILS is empty' })
  return out
}

/** The balance Stripe itself reports, in USD cents. Null when Stripe is not connected. */
export async function stripeBalance(): Promise<{ available: number; pending: number; live: boolean } | { error: string }> {
  try {
    const s = await stripe()
    const b = await s.balance.retrieve()
    const sum = (rows: { amount: number; currency: string }[]) => rows.filter((r) => r.currency === 'usd').reduce((a, r) => a + r.amount, 0)
    return { available: sum(b.available), pending: sum(b.pending), live: b.livemode }
  } catch (e) {
    return { error: e instanceof Error ? e.message.slice(0, 160) : 'Could not reach Stripe.' }
  }
}
