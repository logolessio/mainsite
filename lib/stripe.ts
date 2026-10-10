import Stripe from 'stripe'
import { setting } from './db'
import { HttpError } from './http'

/** A Stripe client that works on Cloudflare Workers (fetch based, no Node sockets). */
export async function stripe() {
  const key = await setting('STRIPE_SECRET_KEY')
  if (!key) throw new HttpError(503, 'Payments are not set up yet.')
  return new Stripe(key, { httpClient: Stripe.createFetchHttpClient() })
}

export async function webhookSecret() {
  const s = await setting('STRIPE_WEBHOOK_SECRET')
  if (!s) throw new HttpError(503, 'Webhook secret is not set up yet.')
  return s
}

export { Stripe }

/** True for Stripe test mode keys, so the UI can show a "test mode" notice. */
export async function isTestMode() {
  return ((await setting('STRIPE_SECRET_KEY')) ?? '').startsWith('sk_test_')
}
