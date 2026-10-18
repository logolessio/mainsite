import { issueWebCode, safeNext } from '@/lib/app-auth'
import { protect } from '@/lib/guard'
import { body, json, route } from '@/lib/http'
import { requireUser } from '@/lib/user'

/** The app asks for an address that shows one of the website's own pages with the person already signed in (see /app/web). */
export const POST = route(async (req: Request) => {
  const user = await requireUser()
  await protect(req, { name: 'app-web', max: 60, windowSec: 600, userId: user.id })
  const { next } = await body<{ next?: string }>(req, 1024)
  const code = await issueWebCode(user.email, safeNext(next))
  const base = `${new URL(req.url).origin}`
  return json({ url: `${base}/app/web?code=${code}` })
})
