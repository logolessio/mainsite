import { purgeDue } from '@/lib/account-deletion'
import { protect } from '@/lib/guard'
import { json, route } from '@/lib/http'
import { requireAdmin } from '@/lib/user'

/** Removes every account whose 30 days are up. There is no timer on the site yet, so an admin runs this from the Users page. */
export const POST = route(async (req: Request) => {
  const admin = await requireAdmin()
  await protect(req, { name: 'admin-purge', max: 10, windowSec: 600, userId: admin.id })
  return json(await purgeDue())
})
