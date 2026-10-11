import { z } from 'zod'
import { auditSafe } from '@/lib/chain'
import { campaignRow } from '@/lib/campaigns-db'
import { db, nowSec, uid } from '@/lib/db'
import { protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { SITE } from '@/lib/site'
import { stripe } from '@/lib/stripe'
import { requireUser } from '@/lib/user'

const MIN_ADD = 25
const schema = z.object({ amount: z.number().int().min(MIN_ADD).max(SITE.maxTopUpUsd) })

/** The artist adds more money to a campaign that is already running. The money lands in that campaign's pool once Stripe confirms it. */
export const POST = route(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser()
  await protect(req, { name: 'campaign-fund', max: 12, windowSec: 3600, userId: user.id })
  const { id } = await params
  const parsed = schema.safeParse(await body(req, 1024))
  if (!parsed.success) throw new HttpError(400, `Pick an amount between $${MIN_ADD} and $${SITE.maxTopUpUsd.toLocaleString()}.`)
  const c = await campaignRow(id)
  if (!c || c.brand_user_id !== user.id) throw new HttpError(404, 'Campaign not found.')
  if (!['paid', 'live', 'paused'].includes(c.status)) throw new HttpError(409, c.status === 'awaiting_payment' ? 'Pay the campaign budget first.' : 'This campaign cannot take more funds right now.')

  const cents = parsed.data.amount * 100
  const s = await stripe()
  const d = await db()
  const origin = new URL(req.url).origin

  let customer = user.stripe_customer_id
  if (!customer) {
    const created = await s.customers.create({ email: user.email, name: user.name ?? undefined, metadata: { user_id: user.id } })
    customer = created.id
    await d.prepare('UPDATE users SET stripe_customer_id = ?2 WHERE id = ?1').bind(user.id, customer).run()
  }
  const session = await s.checkout.sessions.create({
    mode: 'payment',
    customer,
    client_reference_id: user.id,
    line_items: [{ quantity: 1, price_data: { currency: 'usd', unit_amount: cents, product_data: { name: `Add funds: ${c.title}` } } }],
    payment_intent_data: { description: `logoless campaign top-up ${c.id}`, metadata: { user_id: user.id, kind: 'campaign_topup', campaign_id: c.id } },
    metadata: { user_id: user.id, kind: 'campaign_topup', campaign_id: c.id },
    success_url: `${origin}/brand/billing?funded=${encodeURIComponent(c.id)}`,
    cancel_url: `${origin}/brand/billing?cancelled=1`,
  })
  if (!session.url) throw new HttpError(502, 'Stripe did not return a checkout link.')
  await d
    .prepare("INSERT INTO topups (id, user_id, session_id, amount_cents, status, created_at, campaign_id) VALUES (?1, ?2, ?3, ?4, 'open', ?5, ?6)")
    .bind(uid(), user.id, session.id, cents, nowSec(), c.id)
    .run()
  await auditSafe({ id: user.id, email: user.email }, 'campaign.topup.checkout', c.id, `$${parsed.data.amount}`)
  return json({ url: session.url })
})
