import { z } from 'zod'
import { adminSecretSet, setAdminSecret } from '@/lib/admin-secret'
import { auditSafe } from '@/lib/chain'
import { protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { requireAdmin } from '@/lib/user'

export const GET = route(async () => {
  const admin = await requireAdmin()
  return json({ set: await adminSecretSet(admin.id) })
})

const schema = z.object({ next: z.string().min(10).max(200), current: z.string().max(200).optional() })

/** Sets or changes the admin password. Changing it needs the current one. */
export const POST = route(async (req: Request) => {
  const admin = await requireAdmin()
  await protect(req, { name: 'admin-secret-set', max: 10, windowSec: 900, userId: admin.id })
  const parsed = schema.safeParse(await body(req, 2048))
  if (!parsed.success) throw new HttpError(400, 'Use at least 10 characters.')
  await setAdminSecret(admin.id, admin.email, parsed.data.next, parsed.data.current)
  await auditSafe({ id: admin.id, email: admin.email }, 'admin.password.set', admin.email, null)
  return json({ ok: true })
})
