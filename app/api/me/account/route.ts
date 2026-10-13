import { getDeletion, GRACE_DAYS } from '@/lib/account-deletion'
import { json, route } from '@/lib/http'
import { balances } from '@/lib/ledger'
import { requireUser } from '@/lib/user'

/** What the delete-account panel needs: the money still in the account, and whether a deletion is already scheduled. */
export const GET = route(async () => {
  const user = await requireUser()
  const b = await balances(user.id)
  const del = await getDeletion(user.id)
  return json({ availableCents: b.available, pendingCents: b.pending, deletion: del, graceDays: GRACE_DAYS })
})
