import { db } from '@/lib/db'
import { assertSameOrigin, body, json, route, safeReturn } from '@/lib/http'
import { stripe } from '@/lib/stripe'
import { requireUser } from '@/lib/user'

/** Clipper starts (or resumes) Stripe Connect onboarding. Returns the hosted Stripe link. */
export const POST = route(async (req: Request) => {
  assertSameOrigin(req)
  const user = await requireUser()
  const { returnTo } = await body<{ returnTo?: string }>(req).catch(() => ({ returnTo: undefined }))
  const s = await stripe()
  const origin = new URL(req.url).origin
  const back = safeReturn(returnTo, '/dashboard/payouts')

  let account = user.stripe_account_id
  if (!account) {
    const a = await s.accounts.create({
      type: 'express',
      email: user.email,
      capabilities: { transfers: { requested: true } },
      business_type: 'individual',
      metadata: { user_id: user.id },
    })
    account = a.id
    const d = await db()
    await d.prepare('UPDATE users SET stripe_account_id = ?2 WHERE id = ?1').bind(user.id, account).run()
  }

  const link = await s.accountLinks.create({
    account,
    type: 'account_onboarding',
    refresh_url: `${origin}/api/stripe/connect/refresh?returnTo=${encodeURIComponent(back)}`,
    return_url: `${origin}${back}?stripe=return`,
  })
  return json({ url: link.url })
})
