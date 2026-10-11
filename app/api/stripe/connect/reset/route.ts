import { db } from '@/lib/db'
import { protect } from '@/lib/guard'
import { HttpError, json, route } from '@/lib/http'
import { logEvent } from '@/lib/log'
import { isTestMode, stripe } from '@/lib/stripe'
import { requireAdmin } from '@/lib/user'

/**
 * Admin testing aid: throws away your own Stripe test payout account so setup can be run again from the start.
 * It refuses to run unless Stripe is in test mode, so it can never delete a real clipper's payout account.
 * It touches nothing else: your login, profile, earnings and history stay as they are.
 */
export const POST = route(async (req: Request) => {
  const user = await requireAdmin()
  await protect(req, { name: 'connect-reset', max: 20, windowSec: 3600, userId: user.id })
  if (!(await isTestMode())) throw new HttpError(403, 'Reset only works while Stripe is in test mode.')
  if (!user.stripe_account_id) return json({ ok: true, deleted: false })
  const s = await stripe()
  try {
    await s.accounts.del(user.stripe_account_id)
  } catch (e) {
    // Already gone on Stripe's side is fine: we still clear our link to it.
    if (!(e instanceof Error) || !/(No such account|does not exist|not found)/i.test(e.message)) throw new HttpError(502, `Stripe would not delete it${e instanceof Error ? `: ${e.message.slice(0, 200)}` : '.'}`)
  }
  const d = await db()
  await d.prepare('UPDATE users SET stripe_account_id = NULL, connect_ready = 0, connect_details_submitted = 0 WHERE id = ?1').bind(user.id).run()
  logEvent({ kind: 'admin', name: 'payout test account reset', actor: user.email, req })
  return json({ ok: true, deleted: true })
})
