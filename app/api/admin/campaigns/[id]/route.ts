import { campaignAction, campaignActionSchema } from '@/lib/admin-ops'
import { ipHash, protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { requireAdmin } from '@/lib/user'

/** Admin decisions on a campaign. Every one is written to the tamper-evident audit log. */
export const POST = route(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const admin = await requireAdmin()
  await protect(req, { name: 'admin-campaign', max: 60, windowSec: 600, userId: admin.id })
  const { id } = await params
  const parsed = campaignActionSchema.safeParse(await body(req))
  if (!parsed.success) throw new HttpError(400, 'That request is not valid.')
  await campaignAction({ id: admin.id, email: admin.email }, await ipHash(req), id, parsed.data)
  return json({ ok: true })
})
