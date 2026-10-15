import { type OAuthApp, SCOPE_IDS, getApp } from './oauth'

/** Looks at an authorization request the way the standard says to: anything wrong with the app or the return address is shown to the person (never redirected), everything else is sent back to the app as an error. */
export type AuthRequest = { app: OAuthApp; redirectUri: string; scope: string[]; state: string | null; nonce: string | null; challenge: string | null; prompt: string | null }
export type AuthCheck = { fatal: string } | { fail: { redirectUri: string; error: string; description: string; state: string | null } } | { ok: AuthRequest }

export async function checkAuthRequest(p: Record<string, string | undefined>): Promise<AuthCheck> {
  const app = await getApp(p.client_id ?? '')
  if (!app || app.suspended) return { fatal: 'This app does not exist or has been switched off.' }
  const redirectUri = p.redirect_uri ?? ''
  if (!app.redirectUris.includes(redirectUri)) return { fatal: 'The return address does not match one the app registered. Nothing was shared.' }
  const state = (p.state ?? '').slice(0, 500) || null
  const fail = (error: string, description: string) => ({ fail: { redirectUri, error, description, state } })
  if (p.response_type !== 'code') return fail('unsupported_response_type', 'Only response_type=code is supported.')
  const asked = (p.scope ?? 'openid').split(/\s+/).filter(Boolean)
  const scope = [...new Set(asked.filter((s) => SCOPE_IDS.includes(s)))]
  if (!scope.length) return fail('invalid_scope', 'None of the scopes you asked for exist.')
  const challenge = p.code_challenge?.slice(0, 128) || null
  if (challenge && p.code_challenge_method !== 'S256') return fail('invalid_request', 'Only code_challenge_method=S256 is supported.')
  if (challenge && !/^[A-Za-z0-9\-_]{43}$/.test(challenge)) return fail('invalid_request', 'The code_challenge is not valid.')
  if (!challenge && app.type === 'public') return fail('invalid_request', 'This app needs PKCE: send a code_challenge with S256.')
  return { ok: { app, redirectUri, scope, state, nonce: (p.nonce ?? '').slice(0, 200) || null, challenge, prompt: p.prompt ?? null } }
}

const withParams = (uri: string, params: Record<string, string | null>) => {
  const u = new URL(uri)
  for (const [k, v] of Object.entries(params)) if (v !== null) u.searchParams.set(k, v)
  return u.toString()
}
export const errorRedirect = (f: { redirectUri: string; error: string; description: string; state: string | null }) => withParams(f.redirectUri, { error: f.error, error_description: f.description, state: f.state, iss: 'https://logoless.io' })
export const codeRedirect = (uri: string, code: string, state: string | null) => withParams(uri, { code, state, iss: 'https://logoless.io' })

/** Encodes for the sign-in page's ?next=, which only accepts a small set of characters. */
export const enc = (s: string) => encodeURIComponent(s).replace(/[!'()*~]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
