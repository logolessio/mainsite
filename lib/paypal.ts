import { setting } from './db'
import { HttpError } from './http'

/**
 * PayPal, over plain fetch (it works on Cloudflare Workers). All money on logoless is held and moved here:
 *  - brands add funds with a PayPal checkout (Orders API),
 *  - clippers are paid to a PayPal email (Payouts API).
 * Keys come from the Worker secrets: PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_ENV (live or sandbox) and PAYPAL_WEBHOOK_ID.
 */

type Config = { id: string; secret: string; base: string; live: boolean }

export async function paypalConfig(): Promise<Config | null> {
  const id = await setting('PAYPAL_CLIENT_ID')
  const secret = await setting('PAYPAL_CLIENT_SECRET')
  if (!id || !secret) return null
  const live = ((await setting('PAYPAL_ENV')) ?? 'live').trim().toLowerCase() !== 'sandbox'
  // PAYPAL_API_BASE points the site at a stand-in server, for testing on a laptop only
  const base = (await setting('PAYPAL_API_BASE')) || (live ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com')
  return { id, secret, live, base }
}

export const paypalReady = async () => (await paypalConfig()) !== null
export const isSandbox = async () => {
  const c = await paypalConfig()
  return Boolean(c && !c.live)
}

async function config() {
  const c = await paypalConfig()
  if (!c) throw new HttpError(503, 'Payments are not open yet.')
  return c
}

/** An error from PayPal. `code` is PayPal's own name for it, like INSTRUMENT_DECLINED or DUPLICATE_BATCH. */
export class PayPalError extends HttpError {
  constructor(
    status: number,
    message: string,
    public code: string,
  ) {
    super(status, message)
  }
}

let cached: { key: string; token: string; until: number } | null = null

async function accessToken(c: Config) {
  const now = Date.now()
  if (cached && cached.key === c.id + c.base && cached.until > now + 30_000) return cached.token
  const res = await fetch(`${c.base}/v1/oauth2/token`, {
    method: 'POST',
    headers: { authorization: `Basic ${btoa(`${c.id}:${c.secret}`)}`, 'content-type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  })
  const j = (await res.json().catch(() => null)) as { access_token?: string; expires_in?: number; error_description?: string } | null
  if (!res.ok || !j?.access_token) throw new PayPalError(502, 'PayPal did not accept our keys. Check them in the admin keys page.', 'AUTH')
  cached = { key: c.id + c.base, token: j.access_token, until: now + (j.expires_in ?? 300) * 1000 }
  return j.access_token
}

export async function paypal<T>(path: string, init: { method?: 'GET' | 'POST'; body?: unknown; requestId?: string } = {}): Promise<T> {
  const c = await config()
  const token = await accessToken(c)
  const res = await fetch(`${c.base}${path}`, {
    method: init.method ?? (init.body === undefined ? 'GET' : 'POST'),
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      ...(init.requestId ? { 'paypal-request-id': init.requestId } : {}),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  })
  const text = await res.text()
  let j: unknown = null
  try {
    j = text ? JSON.parse(text) : null
  } catch {
    /* not JSON */
  }
  if (!res.ok) {
    const e = j as { name?: string; message?: string; details?: { issue?: string; description?: string }[] } | null
    const issue = e?.details?.[0]?.issue ?? e?.name ?? 'ERROR'
    throw new PayPalError(res.status >= 500 ? 502 : 400, e?.details?.[0]?.description ?? e?.message ?? 'PayPal could not do that.', issue)
  }
  return j as T
}

export const toValue = (cents: number) => (cents / 100).toFixed(2)
export const toCents = (value: string | number | undefined | null) => Math.round(Number(value ?? 0) * 100)

type Link = { href: string; rel: string }

/** Starts a PayPal checkout for adding funds. Returns the order id and the page to send the person to. */
export async function createOrder(input: { amountCents: number; userId: string; returnUrl: string; cancelUrl: string; description: string }) {
  const o = await paypal<{ id: string; links?: Link[] }>('/v2/checkout/orders', {
    body: {
      intent: 'CAPTURE',
      purchase_units: [{ reference_id: 'logoless', custom_id: input.userId, description: input.description, amount: { currency_code: 'USD', value: toValue(input.amountCents) } }],
      payment_source: {
        paypal: {
          experience_context: { brand_name: 'logoless', shipping_preference: 'NO_SHIPPING', user_action: 'PAY_NOW', return_url: input.returnUrl, cancel_url: input.cancelUrl },
        },
      },
    },
  })
  const url = o.links?.find((l) => l.rel === 'payer-action')?.href ?? o.links?.find((l) => l.rel === 'approve')?.href
  if (!url) throw new PayPalError(502, 'PayPal did not return a checkout page.', 'NO_LINK')
  return { id: o.id, url }
}

export type Captured = { status: string; captureId: string | null; amountCents: number; feeCents: number }
type OrderBody = { status?: string; purchase_units?: { payments?: { captures?: { id: string; status: string; amount?: { value: string }; seller_receivable_breakdown?: { paypal_fee?: { value: string } } }[] } }[] }

const readCapture = (o: OrderBody): Captured => {
  const cap = o.purchase_units?.[0]?.payments?.captures?.[0]
  return { status: cap?.status ?? o.status ?? 'UNKNOWN', captureId: cap?.id ?? null, amountCents: toCents(cap?.amount?.value), feeCents: toCents(cap?.seller_receivable_breakdown?.paypal_fee?.value) }
}

/** Takes the money once the person has approved it at PayPal. Safe to call twice: the second call reads the finished order. */
export async function captureOrder(orderId: string): Promise<Captured> {
  try {
    return readCapture(await paypal<OrderBody>(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, { body: {}, requestId: `capture-${orderId}` }))
  } catch (e) {
    if (e instanceof PayPalError && e.code === 'ORDER_ALREADY_CAPTURED') return readCapture(await paypal<OrderBody>(`/v2/checkout/orders/${encodeURIComponent(orderId)}`))
    throw e
  }
}

/** Sends money to a PayPal email. `payoutId` doubles as PayPal's own batch and item id, so it can only ever be sent once. */
export async function sendPayoutTo(input: { payoutId: string; email: string; amountCents: number }) {
  const r = await paypal<{ batch_header?: { payout_batch_id?: string; batch_status?: string } }>('/v1/payments/payouts', {
    requestId: `payout-${input.payoutId}`,
    body: {
      sender_batch_header: { sender_batch_id: input.payoutId, email_subject: 'You have been paid by logoless', email_message: 'Your logoless earnings are here. Thanks for clipping.' },
      items: [{ recipient_type: 'EMAIL', receiver: input.email, amount: { value: toValue(input.amountCents), currency: 'USD' }, note: 'logoless earnings', sender_item_id: input.payoutId }],
    },
  })
  return { batchId: r.batch_header?.payout_batch_id ?? input.payoutId, status: r.batch_header?.batch_status ?? 'PENDING' }
}

/** Asks PayPal whether a webhook really came from PayPal. Needs PAYPAL_WEBHOOK_ID. */
export async function verifyWebhook(headers: Headers, rawBody: string) {
  const webhookId = await setting('PAYPAL_WEBHOOK_ID')
  if (!webhookId) throw new HttpError(503, 'The PayPal webhook is not set up yet.')
  let event: unknown
  try {
    event = JSON.parse(rawBody)
  } catch {
    return null
  }
  const r = await paypal<{ verification_status?: string }>('/v1/notifications/verify-webhook-signature', {
    body: {
      auth_algo: headers.get('paypal-auth-algo'),
      cert_url: headers.get('paypal-cert-url'),
      transmission_id: headers.get('paypal-transmission-id'),
      transmission_sig: headers.get('paypal-transmission-sig'),
      transmission_time: headers.get('paypal-transmission-time'),
      webhook_id: webhookId,
      webhook_event: event,
    },
  })
  return r.verification_status === 'SUCCESS' ? (event as { id: string; event_type: string; resource: Record<string, unknown> }) : null
}

/** Proves the keys work by asking PayPal for a token. Returns which mode they are for. */
export async function paypalPing() {
  const c = await config()
  await accessToken(c)
  return { live: c.live }
}

/** The webhooks registered on the PayPal app, so the admin can check ours is among them. */
export async function listWebhooks() {
  const r = await paypal<{ webhooks?: { id: string; url: string; event_types?: { name: string }[] }[] }>('/v1/notifications/webhooks')
  return r.webhooks ?? []
}
