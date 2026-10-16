import { z } from 'zod'
import { auditSafe } from '@/lib/chain'
import { db, nowSec, uid } from '@/lib/db'
import { protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { createOrder, paypalReady } from '@/lib/paypal'
import { SITE } from '@/lib/site'
import { requireUser } from '@/lib/user'

const MIN = SITE.minTopUpUsd
const schema = z.object({ amount: z.number().int().min(MIN).max(SITE.maxTopUpUsd) })

/** A brand adds funds to their balance. We open a PayPal checkout and send them there; the money lands once they approve it. */
export const POST = route(async (req: Request) => {
  const user = await requireUser()
  await protect(req, { name: 'deposit', max: 12, windowSec: 3600, userId: user.id })
  const parsed = schema.safeParse(await body(req, 1024))
  if (!parsed.success) throw new HttpError(400, `Pick a whole amount between $${MIN} and $${SITE.maxTopUpUsd.toLocaleString()}.`)
  if (!(await paypalReady())) throw new HttpError(503, 'Adding funds is not open yet.')
  const cents = parsed.data.amount * 100
  const origin = new URL(req.url).origin
  const order = await createOrder({
    amountCents: cents,
    userId: user.id,
    description: 'Funds for logoless campaigns',
    returnUrl: `${origin}/brand/billing?paypal=return`,
    cancelUrl: `${origin}/brand/billing?cancelled=1`,
  })
  const d = await db()
  // the order id doubles as the unique id of this payment
  await d.prepare("INSERT INTO topups (id, user_id, session_id, amount_cents, status, created_at) VALUES (?1, ?2, ?3, ?4, 'open', ?5)").bind(uid(), user.id, order.id, cents, nowSec()).run()
  await auditSafe({ id: user.id, email: user.email }, 'balance.deposit.started', order.id, `$${parsed.data.amount}`)
  return json({ url: order.url })
})
