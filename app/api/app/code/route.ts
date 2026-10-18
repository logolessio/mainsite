import { APP_REDIRECT, issueAppCode } from '@/lib/app-auth'
import { protect } from '@/lib/guard'
import { body, json, route } from '@/lib/http'
import { requireUser } from '@/lib/user'

/** The sign-in sheet's "Continue" button (website session, same site): returns the address that hands a one-use code to the Mac app. */
export const POST = route(async (req: Request) => {
  const user = await requireUser()
  await protect(req, { name: 'app-code', max: 20, windowSec: 600, userId: user.id })
  const { challenge, state, redirect } = await body<{ challenge?: string; state?: string; redirect?: string }>(req, 1024)
  if (typeof challenge !== 'string' || typeof state !== 'string' || !/^[A-Za-z0-9_-]{8,64}$/.test(state)) return json({ error: 'That sign-in request is not valid.' }, 400)
  const to = redirect ?? 'logoless://auth'
  if (!APP_REDIRECT.test(to)) return json({ error: 'That sign-in request is not valid.' }, 400)
  const code = await issueAppCode(user.email, challenge)
  return json({ redirect: `${to}?code=${code}&state=${encodeURIComponent(state)}`, email: user.email })
})
