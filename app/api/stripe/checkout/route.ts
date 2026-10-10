import { db, nowSec, uid } from '@/lib/db'
import { assertSameOrigin, body, HttpError, json, route, safeReturn } from '@/lib/http'
import { SITE } from '@/lib/site'
import { stripe } from '@/lib/stripe'
import { requireUser } from '@/lib/user'

/** Brand adds funds: creates a Stripe Checkout session and returns its URL. */
export const POST = route(async (req: Request) => {
  assertSameOrigin(req)
  const user = await requireUser()
  const { amount, returnTo } = await body<{ amount?: number; returnTo?: string }>(req)

  const cents = Math.round(Number(amount) * 100)
  if (!Number.isFinite(cents) || cents < SITE.minTopUpUsd * 100 || cents > SITE.maxTopUpUsd * 100) {
    throw new HttpError(400, `Add between $${SITE.minTopUpUsd} and $${SITE.maxTopUpUsd.toLocaleString()}.`)
  }

  const s = await stripe()
  const d = await db()
  const origin = new URL(req.url).origin
  const back = safeReturn(returnTo, '/brand/billing')

  let customer = user.stripe_customer_id
  if (!customer) {
    const c = await s.customers.create({ email: user.email, name: user.name ?? undefined, metadata: { user_id: user.id } })
    customer = c.id
    await d.prepare('UPDATE users SET stripe_customer_id = ?2 WHERE id = ?1').bind(user.id, customer).run()
  }

  const session = await s.checkout.sessions.create({
    mode: 'payment',
    customer,
    client_reference_id: user.id,
    line_items: [{ quantity: 1, price_data: { currency: 'usd', unit_amount: cents, product_data: { name: 'logoless balance top-up' } } }],
    payment_intent_data: { description: 'logoless balance top-up', metadata: { user_id: user.id, kind: 'topup' } },
    metadata: { user_id: user.id, kind: 'topup' },
    success_url: `${origin}${back}?topup=success`,
    cancel_url: `${origin}${back}?topup=cancelled`,
  })
  if (!session.url) throw new HttpError(502, 'Stripe did not return a checkout link.')

  await d
    .prepare("INSERT INTO topups (id, user_id, session_id, amount_cents, status, created_at) VALUES (?1, ?2, ?3, ?4, 'open', ?5)")
    .bind(uid(), user.id, session.id, cents, nowSec())
    .run()

  return json({ url: session.url })
})
