import { audit } from '@/lib/chain'
import { featureOn } from '@/lib/features'
import { protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { appPublic, appsOf, appUsage, newApp, requireDevelopers } from '@/lib/oauth'
import { appInput, appInputV2, cleanInput, cleanInputV2 } from '@/lib/oauth-input'
import { requireUser } from '@/lib/user'

export const GET = route(async (req: Request) => {
  await requireDevelopers()
  const user = await requireUser()
  const apps = await appsOf(user.id)
  // ?usage=1 (the Developer dashboard) adds how much each app is used
  if (new URL(req.url).searchParams.get('usage') && (await featureOn('developer-tools'))) {
    return json({ apps: await Promise.all(apps.map(async (a) => ({ ...appPublic(a), usage: await appUsage(a.id) }))) })
  }
  return json({ apps: apps.map(appPublic) })
})

/** Register an app. A secret is made for server apps and shown once. */
export const POST = route(async (req: Request) => {
  await requireDevelopers()
  const user = await requireUser()
  await protect(req, { name: 'oauth-app', max: 10, windowSec: 3600, userId: user.id })
  const v2 = await featureOn('developer-tools')
  const raw = await body(req, v2 ? 16384 : 4096)
  let input
  if (v2) {
    const parsed = appInputV2.safeParse(raw)
    if (!parsed.success) throw new HttpError(400, 'Please check the form.')
    const clean = cleanInputV2(parsed.data)
    if ('fields' in clean) return json({ error: Object.values(clean.fields)[0] ?? 'Please check the form.', fields: clean.fields }, 400)
    input = clean.ok
  } else {
    const parsed = appInput.safeParse(raw)
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Please check the form.')
    input = cleanInput(parsed.data)
  }
  if ((await appsOf(user.id)).length >= 10) throw new HttpError(429, 'You can have up to 10 apps. Delete one first.')
  const made = await newApp(user.id, input)
  await audit({ id: user.id, email: user.email }, 'oauth.app_create', made.app.id, made.app.name)
  return json({ ok: true, app: appPublic(made.app), secret: made.secret })
})
