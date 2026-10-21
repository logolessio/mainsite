import { z } from 'zod'
import { audit } from '@/lib/chain'
import { checkRedirectUri, LIMITS } from '@/lib/dev-app-rules'
import { featureOn } from '@/lib/features'
import { protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { appPublic, appUsage, deleteApp, getApp, requireDevelopers, rotateSecret, saveApp } from '@/lib/oauth'
import { requireUser } from '@/lib/user'
import { appInput, appInputV2, cleanInput, cleanInputV2 } from '@/lib/oauth-input'

const schema = z.discriminatedUnion('action', [z.object({ action: z.literal('update'), app: appInput }), z.object({ action: z.literal('rotate') }), z.object({ action: z.literal('delete') })])
const schemaV2 = z.discriminatedUnion('action', [
  z.object({ action: z.literal('update'), app: appInputV2 }),
  z.object({ action: z.literal('redirects'), redirectUris: z.array(z.string().max(400)).max(20) }),
  z.object({ action: z.literal('rotate') }),
  z.object({ action: z.literal('delete'), confirm: z.string().max(80) }),
])

async function ownApp(req: Request, params: Promise<{ id: string }>) {
  await requireDevelopers()
  const user = await requireUser()
  const { id } = await params
  const app = await getApp(id)
  if (!app || app.ownerId !== user.id) throw new HttpError(404, 'App not found.')
  return { user, app }
}

/** One app with how much it is used (the Developer dashboard). */
export const GET = route(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  if (!(await featureOn('developer-tools'))) throw new HttpError(404, 'Not found.')
  const { app } = await ownApp(req, params)
  return json({ app: { ...appPublic(app), usage: await appUsage(app.id) } })
})

export const POST = route(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { user, app } = await ownApp(req, params)
  await protect(req, { name: 'oauth-app-edit', max: 30, windowSec: 600, userId: user.id })
  const v2 = await featureOn('developer-tools')
  const raw = await body(req, v2 ? 16384 : 4096)
  const actor = { id: user.id, email: user.email }
  const id = app.id

  if (v2) {
    const parsed = schemaV2.safeParse(raw)
    if (!parsed.success) throw new HttpError(400, 'Please check the form.')
    const a = parsed.data
    if (a.action === 'delete') {
      if (a.confirm.trim() !== app.name) throw new HttpError(400, 'Type the name of the app exactly to delete it.')
      await deleteApp(id)
      await audit(actor, 'oauth.app_delete', id, app.name)
      return json({ ok: true })
    }
    if (a.action === 'rotate') {
      const secret = await rotateSecret(app)
      await audit(actor, 'oauth.secret_rotate', id, app.name)
      return json({ ok: true, secret })
    }
    if (a.action === 'redirects') {
      const list = a.redirectUris.map((u) => u.trim()).filter(Boolean)
      if (!list.length) return json({ error: 'Keep at least one return address.', fields: { redirectUris: 'Keep at least one return address.' } }, 400)
      if (list.length > LIMITS.redirects) return json({ error: `Up to ${LIMITS.redirects} return addresses.`, fields: { redirectUris: `Up to ${LIMITS.redirects} return addresses.` } }, 400)
      const checked = list.map((u) => checkRedirectUri(u, app.type))
      const bad = checked.find((c) => 'problem' in c)
      if (bad && 'problem' in bad) return json({ error: bad.problem, fields: { redirectUris: bad.problem } }, 400)
      app.redirectUris = [...new Set(checked.map((c) => (c as { ok: string }).ok))]
      await saveApp(app)
      await audit(actor, 'oauth.app_redirects', id, app.name)
      return json({ ok: true, app: appPublic(app) })
    }
    const clean = cleanInputV2({ ...a.app, type: app.type }) // the type cannot change after it is made
    if ('fields' in clean) return json({ error: Object.values(clean.fields)[0] ?? 'Please check the form.', fields: clean.fields }, 400)
    Object.assign(app, clean.ok)
    await saveApp(app)
    await audit(actor, 'oauth.app_update', id, app.name)
    return json({ ok: true, app: appPublic(app) })
  }

  const parsed = schema.safeParse(raw)
  if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Please check the form.')
  const a = parsed.data
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
