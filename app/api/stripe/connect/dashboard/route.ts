import { assertSameOrigin, HttpError, json, route } from '@/lib/http'
import { stripe } from '@/lib/stripe'
import { requireUser } from '@/lib/user'

/** One-time link into the clipper's own Stripe Express dashboard (bank details, tax forms, payout history). */
export const POST = route(async (req: Request) => {
  assertSameOrigin(req)
  const user = await requireUser()
  if (!user.stripe_account_id) throw new HttpError(400, 'Connect Stripe first.')
  const s = await stripe()
  const link = await s.accounts.createLoginLink(user.stripe_account_id)
  return json({ url: link.url })
})
