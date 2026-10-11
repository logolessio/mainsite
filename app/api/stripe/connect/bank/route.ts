import { connectStatus, stripeProblem } from '@/lib/connect'
import { protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { logEvent } from '@/lib/log'
import { stripe } from '@/lib/stripe'
import { requireUser } from '@/lib/user'

/**
 * Saves the clipper's bank account. The browser swaps the real numbers for a one-time Stripe token first, so the
 * account number never reaches logoless. We receive only the token.
 */
export const POST = route(async (req: Request) => {
  const user = await requireUser()
  await protect(req, { name: 'connect-bank', max: 10, windowSec: 3600, userId: user.id })
  if (!user.stripe_account_id) throw new HttpError(400, 'Pick your country first.')
  const { token } = await body<{ token?: string }>(req)
  if (typeof token !== 'string' || !/^btok_[A-Za-z0-9]{10,60}$/.test(token)) throw new HttpError(400, 'That bank account could not be read. Try again.')
  try {
    const s = await stripe()
    await s.accounts.createExternalAccount(user.stripe_account_id, { external_account: token, default_for_currency: true })
  } catch (e) {
    throw await stripeProblem(e)
  }
  logEvent({ kind: 'money', name: 'payout bank saved', actor: user.email, req })
  return json(await connectStatus(user))
})
