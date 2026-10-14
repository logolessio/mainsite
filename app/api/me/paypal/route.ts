import { z } from 'zod'
import { protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { addPaypalEmail, paypalEmails, removePaypalEmail } from '@/lib/paypal-emails'
import { requireUser } from '@/lib/user'

/** The PayPal emails a clipper can be paid at: `email` is the default, `emails` is the whole list. */
export const GET = route(async () => {
  const user = await requireUser()
  return json(await paypalEmails(user.id))
})

const schema = z.object({ email: z.string().trim().toLowerCase().email().max(254), makeDefault: z.boolean().optional() })

/** Adds an address (and makes it the default unless told not to). */
export const POST = route(async (req: Request) => {
  const user = await requireUser()
  await protect(req, { name: 'paypal-email', max: 20, windowSec: 600, userId: user.id })
  const parsed = schema.safeParse(await body(req, 1024))
  if (!parsed.success) throw new HttpError(400, 'Enter a valid PayPal email address.')
  return json({ ok: true, ...(await addPaypalEmail(user.id, parsed.data.email, parsed.data.makeDefault ?? true)) })
})

export const DELETE = route(async (req: Request) => {
  const user = await requireUser()
  await protect(req, { name: 'paypal-email', max: 20, windowSec: 600, userId: user.id })
  const parsed = schema.pick({ email: true }).safeParse(await body(req, 1024))
  if (!parsed.success) throw new HttpError(400, 'That email is not valid.')
  return json({ ok: true, ...(await removePaypalEmail(user.id, parsed.data.email)) })
})
