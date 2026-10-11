import Stripe from 'stripe'
import { setting } from './db'
import { HttpError } from './http'

/** A Stripe client that works on Cloudflare Workers (fetch based, no Node sockets). */
export async function stripe() {
  const key = await setting('STRIPE_SECRET_KEY')
  if (!key) throw new HttpError(503, 'Payments are not set up yet.')
  return new Stripe(key, { httpClient: Stripe.createFetchHttpClient() })
}

/**
 * Stripe gives each webhook endpoint its own signing secret. Events about your own account and events about
 * connected (clipper) accounts need separate endpoints, so we accept up to two secrets.
 */
export async function webhookSecrets() {
  const list = [await setting('STRIPE_WEBHOOK_SECRET'), await setting('STRIPE_CONNECT_WEBHOOK_SECRET')].filter((x): x is string => Boolean(x))
  if (!list.length) throw new HttpError(503, 'Webhook secret is not set up yet.')
  return list
}

export { Stripe }

/** True for Stripe test mode keys, so the UI can show a "test mode" notice. */
export async function isTestMode() {
  return ((await setting('STRIPE_SECRET_KEY')) ?? '').startsWith('sk_test_')
}
