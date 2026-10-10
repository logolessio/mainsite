import { HttpError, route, safeReturn } from '@/lib/http'
import { stripe } from '@/lib/stripe'
import { requireUser } from '@/lib/user'

/** Stripe sends people here when an onboarding link has expired. We make a fresh one and redirect. */
export const GET = route(async (req: Request) => {
  const user = await requireUser()
  if (!user.stripe_account_id) throw new HttpError(400, 'Start from the payouts page.')
  const url = new URL(req.url)
  const back = safeReturn(url.searchParams.get('returnTo'), '/dashboard/payouts')
  const s = await stripe()
  const link = await s.accountLinks.create({
    account: user.stripe_account_id,
    type: 'account_onboarding',
    refresh_url: `${url.origin}/api/stripe/connect/refresh?returnTo=${encodeURIComponent(back)}`,
    return_url: `${url.origin}${back}?stripe=return`,
  })
  return Response.redirect(link.url, 302)
})
