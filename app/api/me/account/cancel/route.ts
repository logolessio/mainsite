import { cancelDeletion } from '@/lib/account-deletion'
import { auditSafe } from '@/lib/chain'
import { protect } from '@/lib/guard'
import { json, route } from '@/lib/http'
import { requireUser } from '@/lib/user'

export const POST = route(async (req: Request) => {
  const user = await requireUser()
  await protect(req, { name: 'cancel-delete', max: 10, windowSec: 3600, userId: user.id })
  await cancelDeletion(user.id)
  await auditSafe({ id: user.id, email: user.email }, 'account.delete_cancelled', user.id, null)
  return json({ ok: true })
})
