import { purgeDue } from '@/lib/account-deletion'
import { protect } from '@/lib/guard'
import { z } from 'zod'
import { requireAdminSecret } from '@/lib/admin-secret'
import { body, json, route } from '@/lib/http'
import { requireOwner } from '@/lib/user'

/** Removes every account whose 30 days are up. There is no timer on the site yet, so an admin runs this from the Users page. */
export const POST = route(async (req: Request) => {
  // deleting accounts cannot be undone: the owner only, with the admin password
  const admin = await requireOwner()
  await protect(req, { name: 'admin-purge', max: 10, windowSec: 600, userId: admin.id })
  const parsed = z.object({ secret: z.string().max(200).optional() }).safeParse(await body(req, 1024))
  await requireAdminSecret(admin.id, parsed.success ? parsed.data.secret : undefined)
  return json(await purgeDue())
})
