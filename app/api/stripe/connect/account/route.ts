import { connectStatus, createConnectAccount, stripeProblem } from '@/lib/connect'
import { clientIp, protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { logEvent } from '@/lib/log'
import { requireUser } from '@/lib/user'

/** Step one: the clipper picks their country and accepts Stripe's payout terms. Creates their Stripe account. */
export const POST = route(async (req: Request) => {
  const user = await requireUser()
  await protect(req, { name: 'connect-create', max: 5, windowSec: 3600, userId: user.id })
  const { country, accepted } = await body<{ country?: string; accepted?: boolean }>(req)
  if (accepted !== true) throw new HttpError(400, 'Please accept the payment terms to continue.')
  if (user.stripe_account_id) return json(await connectStatus(user))
  let id: string
  try {
    id = await createConnectAccount(user, String(country ?? '').toUpperCase(), { ip: clientIp(req), userAgent: req.headers.get('user-agent') ?? '' })
  } catch (e) {
    if (e instanceof HttpError) throw e
    throw await stripeProblem(e)
  }
  logEvent({ kind: 'money', name: 'payout account created', actor: user.email, detail: String(country), req })
  return json(await connectStatus({ ...user, stripe_account_id: id }))
})
