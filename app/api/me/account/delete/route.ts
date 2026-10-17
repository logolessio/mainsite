import { z } from 'zod'
import { type Choice, deletionBlocker, scheduleDeletion } from '@/lib/account-deletion'
import { auditSafe } from '@/lib/chain'
import { protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { balances } from '@/lib/ledger'
import { notifyAdmins } from '@/lib/notify'
import { requireUser } from '@/lib/user'

const schema = z.object({ choice: z.enum(['return', 'logoless', 'none']) })

/** Starts the 30 days. Nothing is removed yet: the account and the money stay put, and the person can change their mind. */
export const POST = route(async (req: Request) => {
  const user = await requireUser()
  await protect(req, { name: 'delete-account', max: 5, windowSec: 3600, userId: user.id })
  const parsed = schema.safeParse(await body(req, 1024))
  if (!parsed.success) throw new HttpError(400, 'Choose what should happen to your balance.')
  const blocked = await deletionBlocker(user.id)
  if (blocked) throw new HttpError(409, `${blocked} Contact us from the Contact page and we will sort it out with you.`)
  const b = await balances(user.id)
  const left = b.available + b.pending
  if (left > 0 && parsed.data.choice === 'none') throw new HttpError(409, 'You still have money in your account. Withdraw it, or choose where it should go.')
  const choice: Choice = left > 0 ? parsed.data.choice : 'none'
  await scheduleDeletion(user.id, choice)
  await auditSafe({ id: user.id, email: user.email }, 'account.delete_requested', user.id, `choice ${choice}, ${left} cents`)
  await notifyAdmins({ title: 'Account deletion requested', body: user.email, href: '/admin/people', dedupe: `del:${user.id}:${Date.now() >> 17}` })
  return json({ ok: true })
})
