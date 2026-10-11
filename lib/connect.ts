import type Stripe from 'stripe'
import { db, setting } from './db'
import { type ConnectStatus, countryOf, errorMessage } from './connect-fields'
import { HttpError } from './http'
import { isTestMode, stripe } from './stripe'
import type { UserRow } from './user'

/**
 * Creates the clipper's Stripe account. There is no Stripe-hosted page or dashboard anywhere: logoless collects the
 * details in its own forms and sends them to Stripe, which keeps them and does the identity checks. Because logoless
 * collects them, logoless is also the one Stripe bills for fees and the one that covers any losses.
 */
export async function createConnectAccount(user: UserRow, country: string, tos: { ip: string; userAgent: string }) {
  const c = countryOf(country)
  if (!c) throw new HttpError(400, 'Payouts are not available in that country yet.')
  const s = await stripe()
  const account = await s.accounts.create({
    controller: { stripe_dashboard: { type: 'none' }, fees: { payer: 'application' }, losses: { payments: 'application' }, requirement_collection: 'application' },
    country: c.code,
    email: user.email,
    business_type: 'individual',
    business_profile: { mcc: '7311', url: 'https://logoless.io', product_description: 'Creates and posts short video clips for advertisers on logoless.' },
    capabilities: { transfers: { requested: true } },
    tos_acceptance: { date: Math.floor(Date.now() / 1000), ip: tos.ip, user_agent: tos.userAgent.slice(0, 200) },
    settings: { payouts: { schedule: { interval: 'daily' } } },
    metadata: { user_id: user.id },
  })
  const d = await db()
  await d.prepare('UPDATE users SET stripe_account_id = ?2 WHERE id = ?1').bind(user.id, account.id).run()
  return account.id
}

export async function connectStatus(user: UserRow): Promise<ConnectStatus> {
  const publishableKey = (await setting('STRIPE_PUBLISHABLE_KEY')) ?? null
  const empty: ConnectStatus = { status: 'not_connected', country: null, currency: null, publishableKey, due: [], pastDue: [], pending: [], errors: [], disabledReason: null, bank: null }
  if (!user.stripe_account_id) return empty
  const s = await stripe()
  const a = await s.accounts.retrieve(user.stripe_account_id, { expand: ['external_accounts'] })
  const ready = a.payouts_enabled ? 1 : 0
  const submitted = a.details_submitted ? 1 : 0
  if (ready !== user.connect_ready || submitted !== user.connect_details_submitted) {
    const d = await db()
    await d.prepare('UPDATE users SET connect_ready = ?2, connect_details_submitted = ?3 WHERE id = ?1').bind(user.id, ready, submitted).run()
  }
  const r = a.requirements
  const bank = (a.external_accounts?.data ?? []).find((x): x is Stripe.BankAccount => x.object === 'bank_account')
  return {
    status: ready ? 'ready' : 'incomplete',
    country: a.country ?? null,
    currency: a.default_currency ?? null,
    publishableKey,
    due: r?.currently_due ?? [],
    pastDue: r?.past_due ?? [],
    pending: r?.pending_verification ?? [],
    errors: (r?.errors ?? []).map((e) => ({ requirement: e.requirement, message: errorMessage(e.code) })),
    disabledReason: r?.disabled_reason ?? null,
    bank: bank ? { last4: bank.last4, name: bank.bank_name ?? null, currency: bank.currency, country: bank.country } : null,
  }
}

/** Turns Stripe's complaints about a field into a message that is safe and useful to show. */
export async function stripeProblem(e: unknown): Promise<HttpError> {
  const msg = e instanceof Error ? e.message : ''
  const param = (e as { param?: string })?.param ?? ''
  if (/id_number|ssn/i.test(param)) return new HttpError(400, 'That ID number was not accepted. Check it and try again.')
  if (/dob/i.test(param)) return new HttpError(400, 'That date of birth was not accepted.')
  if (/address|postal/i.test(param)) return new HttpError(400, 'That address was not accepted. Check it and try again.')
  if (/phone/i.test(param)) return new HttpError(400, 'That phone number was not accepted. Include the country code.')
  if (/external_account|bank|routing|account_number|iban/i.test(param + msg)) return new HttpError(400, 'That bank account was not accepted. Check the numbers and try again.')
  console.error('stripe connect error', param, msg.slice(0, 300))
  // In test mode show Stripe's own reason, so a setup problem is easy to spot. Live mode stays generic.
  const detail = (await isTestMode()) && msg ? ` (Stripe said: ${msg.slice(0, 300)})` : ''
  return new HttpError(502, `Stripe could not accept that. Check your details and try again.${detail}`)
}
