import { intentCookie, sealIntent, unlinkGoogle } from '@/lib/google-link'
import { protect } from '@/lib/guard'
import { json, route } from '@/lib/http'
import { requireUser } from '@/lib/user'

/** "Add Google": hands the signed-in person a short-lived signed note, which auth.ts reads when Google sends them back (see lib/google-link.ts). */
export const POST = route(async (req: Request) => {
  const user = await requireUser()
  await protect(req, { name: 'pre-link', max: 10, windowSec: 600, userId: user.id })
  const host = req.headers.get('host') ?? new URL(req.url).host
  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store', 'set-cookie': intentCookie(await sealIntent(user.email), host) },
  })
})

/** Takes Google off the account again (Discord stays). */
export const DELETE = route(async (req: Request) => {
  const user = await requireUser()
  await protect(req, { name: 'pre-link', max: 10, windowSec: 600, userId: user.id })
  await unlinkGoogle(user.email)
  return json({ ok: true })
})
