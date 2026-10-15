import { clipAction, clipActionSchema } from '@/lib/admin-ops'
import { ipHash, protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { requireAdmin } from '@/lib/user'

/** Admin decisions on a clip. Setting verified views pays the clipper the difference since last time, out of the brand's balance. */
export const POST = route(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const admin = await requireAdmin()
  await protect(req, { name: 'admin-submission', max: 120, windowSec: 600, userId: admin.id })
  const { id } = await params
  const parsed = clipActionSchema.safeParse(await body(req))
  if (!parsed.success) throw new HttpError(400, 'That request is not valid.')
  const r = await clipAction({ id: admin.id, email: admin.email }, await ipHash(req), id, parsed.data)
  return json({ ok: true, paid: r.paid })
})
