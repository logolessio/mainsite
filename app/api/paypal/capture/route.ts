import { z } from 'zod'
import { db } from '@/lib/db'
import { protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { settleDeposit } from '@/lib/deposits'
import { requireUser } from '@/lib/user'

const schema = z.object({ orderId: z.string().regex(/^[A-Z0-9]{8,32}$/) })

/** The person comes back from PayPal. We take the payment and add it to their balance, once. */
export const POST = route(async (req: Request) => {
  const user = await requireUser()
  await protect(req, { name: 'capture', max: 20, windowSec: 600, userId: user.id })
  const parsed = schema.safeParse(await body(req, 512))
  if (!parsed.success) throw new HttpError(400, 'That payment link is not valid.')
  const d = await db()
  const row = await d.prepare('SELECT user_id FROM topups WHERE session_id = ?1').bind(parsed.data.orderId).first<{ user_id: string }>()
  if (!row || row.user_id !== user.id) throw new HttpError(404, 'We could not find that payment.')
  const r = await settleDeposit(parsed.data.orderId)
  if (!r.ok) throw new HttpError(402, r.error)
  return json({ ok: true, amount: r.amountCents })
})
