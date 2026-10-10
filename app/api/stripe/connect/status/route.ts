import { db } from '@/lib/db'
import { json, route } from '@/lib/http'
import { stripe } from '@/lib/stripe'
import { requireUser } from '@/lib/user'

/** Asks Stripe for the live state of the clipper's account and saves it. */
export const GET = route(async () => {
  const user = await requireUser()
  if (!user.stripe_account_id) return json({ status: 'not_connected' })
  const s = await stripe()
  const a = await s.accounts.retrieve(user.stripe_account_id)
  const ready = a.payouts_enabled ? 1 : 0
  const submitted = a.details_submitted ? 1 : 0
  const d = await db()
  await d.prepare('UPDATE users SET connect_ready = ?2, connect_details_submitted = ?3 WHERE id = ?1').bind(user.id, ready, submitted).run()
  return json({
    status: ready ? 'ready' : 'incomplete',
    detailsSubmitted: Boolean(submitted),
    payoutsEnabled: Boolean(ready),
    due: a.requirements?.currently_due ?? [],
  })
})
