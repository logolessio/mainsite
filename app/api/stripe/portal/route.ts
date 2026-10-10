import { assertSameOrigin, HttpError, json, route } from '@/lib/http'
import { stripe } from '@/lib/stripe'
import { requireUser } from '@/lib/user'

/** Opens Stripe's hosted billing portal (saved cards, receipts) for a brand. */
export const POST = route(async (req: Request) => {
  assertSameOrigin(req)
  const user = await requireUser()
  if (!user.stripe_customer_id) throw new HttpError(400, 'Add funds first and your billing details will appear here.')
  const s = await stripe()
  const session = await s.billingPortal.sessions.create({ customer: user.stripe_customer_id, return_url: `${new URL(req.url).origin}/brand/billing` })
  return json({ url: session.url })
})
