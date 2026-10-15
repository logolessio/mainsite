import { z } from 'zod'
import { protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { issueCode, requireDevelopers, saveGrant } from '@/lib/oauth'
import { checkAuthRequest, codeRedirect, errorRedirect } from '@/lib/oauth-request'
import { requireUser } from '@/lib/user'

const schema = z.object({
  decision: z.enum(['allow', 'deny']),
  client_id: z.string().max(40),
  redirect_uri: z.string().max(300),
  scope: z.string().max(200),
  state: z.string().max(500).optional(),
  nonce: z.string().max(200).optional(),
  code_challenge: z.string().max(128).optional(),
  code_challenge_method: z.string().max(10).optional(),
  response_type: z.string().max(20).optional(),
})

/** The person pressed Allow or Cancel on the consent page. Everything is checked again here: the page is only a form. */
export const POST = route(async (req: Request) => {
  await requireDevelopers()
  const user = await requireUser()
  await protect(req, { name: 'oauth-consent', max: 30, windowSec: 600, userId: user.id })
  const parsed = schema.safeParse(await body(req, 4096))
  if (!parsed.success) throw new HttpError(400, 'That request is not valid.')
  const a = parsed.data
  const check = await checkAuthRequest({ ...a, response_type: a.response_type ?? 'code' })
  if ('fatal' in check) throw new HttpError(400, check.fatal)
  if ('fail' in check) return json({ redirect: errorRedirect(check.fail) })
  const r = check.ok
  if (a.decision === 'deny') return json({ redirect: errorRedirect({ redirectUri: r.redirectUri, error: 'access_denied', description: 'The person said no.', state: r.state }) })
  await saveGrant(user.id, r.app.id, r.scope)
  const code = await issueCode({ clientId: r.app.id, userId: user.id, redirectUri: r.redirectUri, scope: r.scope, nonce: r.nonce, challenge: r.challenge })
  return json({ redirect: codeRedirect(r.redirectUri, code, r.state) })
})
