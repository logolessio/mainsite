import { HttpError } from '@/lib/http'
import { limit } from '@/lib/guard'
import { claimsFor, lookupAccess, requireDevelopers } from '@/lib/oauth'

const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, content-type', 'access-control-allow-methods': 'GET, POST, OPTIONS' }
const reply = (data: unknown, status = 200, extra: Record<string, string> = {}) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...CORS, ...extra } })

export const OPTIONS = () => new Response(null, { status: 204, headers: CORS })

/** The person's details, as far as they agreed. Send the access token as "Authorization: Bearer …". */
async function handle(req: Request) {
  try {
    await requireDevelopers()
    await limit(req, { name: 'oauth-userinfo', max: 120, windowSec: 60 })
    const token = req.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim()
    const at = token ? await lookupAccess(token) : null
    if (!at) return reply({ error: 'invalid_token', error_description: 'The access token is missing, expired or revoked.' }, 401, { 'www-authenticate': 'Bearer error="invalid_token"' })
    if (!at.scope.includes('openid')) return reply({ error: 'insufficient_scope', error_description: 'The openid scope is needed.' }, 403)
    return reply(await claimsFor(at.userId, at.scope, at.clientId))
  } catch (e) {
    if (e instanceof HttpError) return reply({ error: e.status === 429 ? 'slow_down' : 'not_found', error_description: e.message }, e.status)
    console.error('oauth userinfo error', e instanceof Error ? e.message : e)
    return reply({ error: 'server_error' }, 500)
  }
}
export const GET = handle
export const POST = handle
