import { limit } from '@/lib/guard'
import { HttpError } from '@/lib/http'
import { authenticateClient, consumeCode, consumeRefresh, getGrant, issueTokens, pkceOk, requireDevelopers } from '@/lib/oauth'

/** Where an app swaps a one-time code (or a refresh token) for tokens. Open to any website, because the code and the secret are the proof. */
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, content-type', 'access-control-allow-methods': 'POST, OPTIONS' }
const reply = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', pragma: 'no-cache', ...CORS } })
const oops = (error: string, description: string, status = 400) => reply({ error, error_description: description }, status)

export const OPTIONS = () => new Response(null, { status: 204, headers: CORS })

export async function POST(req: Request) {
  try {
    await requireDevelopers()
    await limit(req, { name: 'oauth-token', max: 60, windowSec: 60 })
    const text = await req.text()
    if (text.length > 8192) return oops('invalid_request', 'That request is too large.')
    const form = (req.headers.get('content-type') ?? '').includes('json') ? new URLSearchParams(Object.entries(JSON.parse(text || '{}') as Record<string, string>).map(([k, v]) => [k, String(v)])) : new URLSearchParams(text)
    const client = await authenticateClient(req.headers, form)
    if (!client) return reply({ error: 'invalid_client', error_description: 'The client id or secret is wrong, or the app is switched off.' }, 401)
    const { app } = client
    const type = form.get('grant_type')

    if (type === 'authorization_code') {
      const code = form.get('code') ?? ''
      const data = code ? await consumeCode(code) : null // one use only: it is gone even if something below fails
      if (!data || data.clientId !== app.id) return oops('invalid_grant', 'That code is not valid, has already been used, or has expired.')
      if (form.get('redirect_uri') !== data.redirectUri) return oops('invalid_grant', 'The redirect_uri does not match the one used to ask for the code.')
      if (data.challenge) {
        const verifier = form.get('code_verifier') ?? ''
        if (!(await pkceOk(verifier, data.challenge))) return oops('invalid_grant', 'The code_verifier does not match.')
      } else if (!client.authenticated) return oops('invalid_grant', 'This app must prove itself with PKCE or a secret.')
      if (!(await getGrant(data.userId, app.id))) return oops('invalid_grant', 'The person has disconnected this app.')
      return reply(await issueTokens(app, data.userId, data.scope, data.nonce, data.authTime))
    }

    if (type === 'refresh_token') {
      const old = await consumeRefresh(form.get('refresh_token') ?? '') // rotated: the old one stops working
      if (!old || old.clientId !== app.id) return oops('invalid_grant', 'That refresh token is not valid, or was already used.')
      if (!(await getGrant(old.userId, app.id))) return oops('invalid_grant', 'The person has disconnected this app.')
      const wanted = (form.get('scope') ?? '').split(/\s+/).filter(Boolean)
      const scope = wanted.length ? old.scope.filter((s) => wanted.includes(s)) : old.scope
      return reply(await issueTokens(app, old.userId, [...new Set([...scope, ...(old.scope.includes('offline_access') ? ['offline_access'] : [])])], null, old.authTime ?? old.exp))
    }
    return oops('unsupported_grant_type', 'Use authorization_code or refresh_token.')
  } catch (e) {
    if (e instanceof HttpError) return reply({ error: e.status === 429 ? 'slow_down' : 'invalid_request', error_description: e.message }, e.status)
    if (e instanceof SyntaxError) return oops('invalid_request', 'The body is not valid.')
    console.error('oauth token error', e instanceof Error ? e.message : e)
    return reply({ error: 'server_error', error_description: 'Something went wrong on our side.' }, 500)
  }
}
