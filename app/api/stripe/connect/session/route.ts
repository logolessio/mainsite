import { setting } from '@/lib/db'
import { assertSameOrigin, HttpError, json, route } from '@/lib/http'
import { ensureConnectAccount, stripe } from '@/lib/stripe'
import { requireUser } from '@/lib/user'

/**
 * Starts the on-site (embedded) Stripe setup form for the signed-in clipper. Stripe gives us a short-lived secret
 * that lets this one browser show the form for this one account. The publishable key is public by design.
 */
export const POST = route(async (req: Request) => {
  assertSameOrigin(req)
  const user = await requireUser()
  const publishableKey = await setting('STRIPE_PUBLISHABLE_KEY')
  if (!publishableKey) throw new HttpError(503, 'Embedded setup is not switched on yet.')
  const s = await stripe()
  const account = await ensureConnectAccount(s, user)
  const session = await s.accountSessions.create({
    account,
    components: { account_onboarding: { enabled: true, features: { external_account_collection: true } } },
  })
  return json({ clientSecret: session.client_secret, publishableKey })
})
