import { audit } from '@/lib/chain'
import { protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { appPublic, appsOf, newApp, requireDevelopers } from '@/lib/oauth'
import { appInput, cleanInput } from '@/lib/oauth-input'
import { requireUser } from '@/lib/user'

export const GET = route(async () => {
  await requireDevelopers()
  const user = await requireUser()
  return json({ apps: (await appsOf(user.id)).map(appPublic) })
})

/** Register an app. A secret is made for server apps and shown once. */
export const POST = route(async (req: Request) => {
  await requireDevelopers()
  const user = await requireUser()
  await protect(req, { name: 'oauth-app', max: 10, windowSec: 3600, userId: user.id })
  const parsed = appInput.safeParse(await body(req, 4096))
  if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Please check the form.')
  if ((await appsOf(user.id)).length >= 10) throw new HttpError(429, 'You can have up to 10 apps. Delete one first.')
  const made = await newApp(user.id, cleanInput(parsed.data))
  await audit({ id: user.id, email: user.email }, 'oauth.app_create', made.app.id, made.app.name)
  return json({ ok: true, app: appPublic(made.app), secret: made.secret })
})
