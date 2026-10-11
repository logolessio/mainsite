import { auditSafe } from '@/lib/chain'
import { campaignRow } from '@/lib/campaigns-db'
import { db, nowSec, uid } from '@/lib/db'
import { protect } from '@/lib/guard'
import { HttpError, json, route } from '@/lib/http'
import { stripe } from '@/lib/stripe'
import { requireUser } from '@/lib/user'

/** The artist pays for an accepted campaign. The amount comes from our database, never from the browser. */
export const POST = route(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser()
  await protect(req, { name: 'campaign-pay', max: 10, windowSec: 3600, userId: user.id })
  const { id } = await params
  const c = await campaignRow(id)
  if (!c || c.brand_user_id !== user.id) throw new HttpError(404, 'Campaign not found.')
  if (c.status !== 'awaiting_payment') throw new HttpError(409, c.status === 'requested' ? 'We are still reviewing this request.' : 'This campaign does not need a payment.')

  const s = await stripe()
  const d = await db()
  const origin = new URL(req.url).origin
  // A campaign made through an invite sends the artist back to their own link afterwards.
  const inv = c.invite_id ? await d.prepare('SELECT slug FROM artist_invites WHERE id = ?1').bind(c.invite_id).first<{ slug: string }>() : null
  const back = inv ? `${origin}/${inv.slug}` : `${origin}/brand/campaigns`

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
    line_items: [{ quantity: 1, price_data: { currency: 'usd', unit_amount: c.budget_cents, product_data: { name: `logoless campaign: ${c.title}` } } }],
    payment_intent_data: { description: `logoless campaign ${c.id}`, metadata: { user_id: user.id, kind: 'campaign', campaign_id: c.id } },
    metadata: { user_id: user.id, kind: 'campaign', campaign_id: c.id },
    success_url: `${back}?paid=${encodeURIComponent(c.id)}`,
    cancel_url: `${back}?cancelled=1`,
  })
  if (!session.url) throw new HttpError(502, 'Stripe did not return a checkout link.')

  await d
    .prepare("INSERT INTO topups (id, user_id, session_id, amount_cents, status, created_at, campaign_id) VALUES (?1, ?2, ?3, ?4, 'open', ?5, ?6)")
    .bind(uid(), user.id, session.id, c.budget_cents, nowSec(), c.id)
    .run()
  await d.prepare('UPDATE campaigns SET payment_session_id = ?2, updated_at = ?3 WHERE id = ?1').bind(c.id, session.id, nowSec()).run()
  await auditSafe({ id: user.id, email: user.email }, 'campaign.checkout', c.id, `$${(c.budget_cents / 100).toFixed(2)}`)
  return json({ url: session.url })
})
