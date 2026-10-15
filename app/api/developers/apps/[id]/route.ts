import { z } from 'zod'
import { audit } from '@/lib/chain'
import { protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { appPublic, deleteApp, getApp, requireDevelopers, rotateSecret, saveApp } from '@/lib/oauth'
import { requireUser } from '@/lib/user'
import { appInput, cleanInput } from '@/lib/oauth-input'

const schema = z.discriminatedUnion('action', [z.object({ action: z.literal('update'), app: appInput }), z.object({ action: z.literal('rotate') }), z.object({ action: z.literal('delete') })])

export const POST = route(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireDevelopers()
  const user = await requireUser()
  await protect(req, { name: 'oauth-app-edit', max: 30, windowSec: 600, userId: user.id })
  const { id } = await params
  const app = await getApp(id)
  if (!app || app.ownerId !== user.id) throw new HttpError(404, 'App not found.')
  const parsed = schema.safeParse(await body(req, 4096))
  if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Please check the form.')
  const a = parsed.data
  const actor = { id: user.id, email: user.email }
  if (a.action === 'delete') {
    await deleteApp(id)
    await audit(actor, 'oauth.app_delete', id, app.name)
    return json({ ok: true })
  }
  if (a.action === 'rotate') {
    const secret = await rotateSecret(app)
    await audit(actor, 'oauth.secret_rotate', id, app.name)
    return json({ ok: true, secret })
  }
  const next = cleanInput({ ...a.app, type: app.type }) // the type cannot change after it is made
  Object.assign(app, next)
  await saveApp(app)
  return json({ ok: true, app: appPublic(app) })
})
