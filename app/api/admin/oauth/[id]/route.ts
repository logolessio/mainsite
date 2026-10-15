import { z } from 'zod'
import { audit } from '@/lib/chain'
import { ipHash, protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { deleteApp, getApp, saveApp } from '@/lib/oauth'
import { requireAdmin } from '@/lib/user'

const schema = z.object({ action: z.enum(['verify', 'unverify', 'suspend', 'restore', 'delete']) })

/** Check an app (removes the "independent developer" warning), switch it off, or remove it. */
export const POST = route(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const admin = await requireAdmin()
  await protect(req, { name: 'admin-oauth', max: 60, windowSec: 600, userId: admin.id })
  const { id } = await params
  const app = await getApp(id)
  if (!app) throw new HttpError(404, 'App not found.')
  const parsed = schema.safeParse(await body(req, 256))
  if (!parsed.success) throw new HttpError(400, 'That request is not valid.')
  const a = parsed.data.action
  if (a === 'delete') await deleteApp(id)
  else {
    if (a === 'verify') app.verified = true
    if (a === 'unverify') app.verified = false
    if (a === 'suspend') app.suspended = true
    if (a === 'restore') app.suspended = false
    await saveApp(app)
  }
  await audit({ id: admin.id, email: admin.email }, `oauth.${a}`, id, app.name, await ipHash(req))
  return json({ ok: true })
})
