import { assertSameOrigin, body, json, route, safeReturn } from '@/lib/http'
import { ensureConnectAccount, stripe } from '@/lib/stripe'
import { requireUser } from '@/lib/user'

/** Clipper starts (or resumes) Stripe Connect onboarding. Returns the hosted Stripe link. */
export const POST = route(async (req: Request) => {
  assertSameOrigin(req)
  const user = await requireUser()
  const { returnTo } = await body<{ returnTo?: string }>(req).catch(() => ({ returnTo: undefined }))
  const s = await stripe()
  const origin = new URL(req.url).origin
  const back = safeReturn(returnTo, '/dashboard/payouts')

  const account = await ensureConnectAccount(s, user)

  const link = await s.accountLinks.create({
    account,
    type: 'account_onboarding',
    refresh_url: `${origin}/api/stripe/connect/refresh?returnTo=${encodeURIComponent(back)}`,
    return_url: `${origin}${back}?stripe=return`,
  })
  return json({ url: link.url })
})
