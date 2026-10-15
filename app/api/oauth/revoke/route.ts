import { limit } from '@/lib/guard'
import { HttpError } from '@/lib/http'
import { authenticateClient, requireDevelopers, revokeToken } from '@/lib/oauth'

const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, content-type', 'access-control-allow-methods': 'POST, OPTIONS' }
export const OPTIONS = () => new Response(null, { status: 204, headers: CORS })

/** An app ends one token it was given (RFC 7009). Always answers 200, so it never tells whether a token existed. */
export async function POST(req: Request) {
  try {
    await requireDevelopers()
    await limit(req, { name: 'oauth-revoke', max: 60, windowSec: 60 })
    const form = new URLSearchParams(await req.text())
    const client = await authenticateClient(req.headers, form)
    if (!client) return new Response(JSON.stringify({ error: 'invalid_client' }), { status: 401, headers: { 'content-type': 'application/json', ...CORS } })
    const token = form.get('token')
    if (token) await revokeToken(token, client.app.id)
    return new Response(null, { status: 200, headers: CORS })
  } catch (e) {
    if (e instanceof HttpError) return new Response(JSON.stringify({ error: e.message }), { status: e.status, headers: { 'content-type': 'application/json', ...CORS } })
    return new Response(null, { status: 500, headers: CORS })
  }
}
