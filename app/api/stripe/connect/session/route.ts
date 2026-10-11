import { setting } from '@/lib/db'
import { assertSameOrigin, body, HttpError, json, route } from '@/lib/http'
import { ensureConnectAccount, stripe } from '@/lib/stripe'
import { requireUser } from '@/lib/user'

/**
 * Starts an on-site (embedded) Stripe form: the sign-up form (`onboarding`) or the account dashboard (`manage`) for the signed-in clipper. Stripe gives us a short-lived secret
 * that lets this one browser show the form for this one account. The publishable key is public by design.
 */
export const POST = route(async (req: Request) => {
  assertSameOrigin(req)
  const user = await requireUser()
  const { kind } = await body<{ kind?: string }>(req).catch(() => ({ kind: undefined }))
  const publishableKey = await setting('STRIPE_PUBLISHABLE_KEY')
  if (!publishableKey) throw new HttpError(503, 'Embedded setup is not switched on yet.')
  const s = await stripe()
  const account = await ensureConnectAccount(s, user)
  const components =
    kind === 'manage'
      ? {
          notification_banner: { enabled: true },
          balances: { enabled: true },
          payouts: { enabled: true, features: { instant_payouts: false, standard_payouts: true, edit_payout_schedule: true, external_account_collection: true } },
          account_management: { enabled: true, features: { external_account_collection: true } },
        }
      : { account_onboarding: { enabled: true, features: { external_account_collection: true } } }
  const session = await s.accountSessions.create({ account, components })
  return json({ clientSecret: session.client_secret, publishableKey })
})
