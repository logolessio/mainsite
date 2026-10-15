import { hmacHex, safeEqual, sha256Hex } from './crypto'
import { db, nowSec, setting } from './db'
import { featureOn } from './features'
import { HttpError } from './http'
import { profileStats } from './profile'
import { SITE } from './site'
import { isVerified } from './verification'

/**
 * "Login with logoless": logoless as an OAuth 2.0 and OpenID Connect provider, so other sites and apps can sign people in with
 * their logoless account. Authorization code flow with PKCE, RS256 id tokens, a discovery document and a keys document.
 * Everything is kept in the settings table, so no database change is needed:
 *   oauth:app:<clientId>              the registered app
 *   oauth:grant:<userId>:<clientId>   what a person agreed to
 *   oauth:code:<hash>                 a one-time code (five minutes)
 *   oauth:at:<hash> / oauth:rt:<hash> access tokens (one hour) and refresh tokens (thirty days)
 *   oauth:jwk                         the signing key
 */
export const ISSUER = SITE.url

export { SCOPES, SCOPE_IDS, type Scope } from './oauth-scopes'
import { SCOPE_IDS } from './oauth-scopes'

export type OAuthApp = {
  id: string
  name: string
  description: string
  website: string
  redirectUris: string[]
  type: 'confidential' | 'public'
  ownerId: string
  secretHash: string | null
  verified: boolean
  suspended: boolean
  createdAt: number
}

const rand = (bytes: number) => [...crypto.getRandomValues(new Uint8Array(bytes))].map((b) => b.toString(16).padStart(2, '0')).join('')
const b64url = (buf: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(buf instanceof Uint8Array ? buf : buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const fromB64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))
const enc = new TextEncoder()

/** Everything is off until the feature is pushed live. */
export async function requireDevelopers() {
  if (!(await featureOn('developers'))) throw new HttpError(404, 'Not found.')
}

// ---------- apps ----------
export const appKey = (id: string) => `oauth:app:${id}`

export async function getApp(clientId: string): Promise<OAuthApp | null> {
  if (!/^lg_[0-9a-f]{20}$/.test(clientId)) return null
  const d = await db()
  const r = await d.prepare('SELECT value FROM settings WHERE key = ?1').bind(appKey(clientId)).first<{ value: string }>()
  try {
    return r ? (JSON.parse(r.value) as OAuthApp) : null
  } catch {
    return null
  }
}

export async function saveApp(app: OAuthApp) {
  const d = await db()
  await d
    .prepare('INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at')
    .bind(appKey(app.id), JSON.stringify(app), nowSec())
    .run()
}

export async function appsOf(ownerId: string): Promise<OAuthApp[]> {
  const d = await db()
  const rows = (await d.prepare("SELECT value FROM settings WHERE key LIKE 'oauth:app:%' AND json_extract(value, '$.ownerId') = ?1 ORDER BY updated_at DESC").bind(ownerId).all<{ value: string }>()).results
  return rows.flatMap((r) => {
    try {
      return [JSON.parse(r.value) as OAuthApp]
    } catch {
      return []
    }
  })
}

export async function allApps(): Promise<(OAuthApp & { ownerEmail: string | null })[]> {
  const d = await db()
  const rows = (await d.prepare("SELECT s.value, u.email FROM settings s LEFT JOIN users u ON u.id = json_extract(s.value, '$.ownerId') WHERE s.key LIKE 'oauth:app:%' ORDER BY s.updated_at DESC LIMIT 300").all<{ value: string; email: string | null }>()).results
  return rows.flatMap((r) => {
    try {
      return [{ ...(JSON.parse(r.value) as OAuthApp), ownerEmail: r.email }]
    } catch {
      return []
    }
  })
}

export async function deleteApp(id: string) {
  const d = await db()
  await d.batch([
    d.prepare('DELETE FROM settings WHERE key = ?1').bind(appKey(id)),
    d.prepare("DELETE FROM settings WHERE key LIKE 'oauth:grant:%' AND key LIKE ?1").bind(`%:${id}`),
    d.prepare("DELETE FROM settings WHERE (key LIKE 'oauth:rt:%' OR key LIKE 'oauth:at:%') AND json_extract(value, '$.clientId') = ?1").bind(id),
  ])
}

/** Redirect addresses must be https, or http on this machine (for testing). No wildcards, no fragments, no logins in the address. */
export function checkRedirect(raw: string): string | null {
  let u: URL
  try {
    u = new URL(raw.trim())
  } catch {
    return null
  }
  const local = u.protocol === 'http:' && (u.hostname === 'localhost' || u.hostname === '127.0.0.1' || u.hostname === '[::1]')
  if (!(u.protocol === 'https:' || local) || u.username || u.password || u.hash || /[*\s]/.test(raw) || raw.length > 300) return null
  return u.toString()
}

export async function newApp(ownerId: string, i: { name: string; description: string; website: string; redirectUris: string[]; type: 'confidential' | 'public' }) {
  const id = `lg_${rand(10)}`
  const secret = i.type === 'confidential' ? `lgs_${rand(24)}` : null
  const app: OAuthApp = { id, ...i, ownerId, secretHash: secret ? await sha256Hex(secret) : null, verified: false, suspended: false, createdAt: nowSec() }
  await saveApp(app)
  return { app, secret }
}

export async function rotateSecret(app: OAuthApp) {
  if (app.type !== 'confidential') throw new HttpError(400, 'This app has no secret.')
  const secret = `lgs_${rand(24)}`
  app.secretHash = await sha256Hex(secret)
  await saveApp(app)
  return secret
}

export const appPublic = (a: OAuthApp) => ({ id: a.id, name: a.name, description: a.description, website: a.website, redirectUris: a.redirectUris, type: a.type, verified: a.verified, suspended: a.suspended, createdAt: a.createdAt })

// ---------- the signing key ----------
type Jwks = { kid: string; priv: JsonWebKey; pub: JsonWebKey }
let memo: { jwks: Jwks; key: CryptoKey } | null = null
const ALG = { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' } as const

async function signingKey() {
  if (memo) return memo
  const d = await db()
  let r = await d.prepare("SELECT value FROM settings WHERE key = 'oauth:jwk'").first<{ value: string }>()
  if (!r) {
    const pair = (await crypto.subtle.generateKey({ ...ALG, modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]) }, true, ['sign', 'verify'])) as CryptoKeyPair
    const jwks: Jwks = { kid: rand(6), priv: await crypto.subtle.exportKey('jwk', pair.privateKey), pub: await crypto.subtle.exportKey('jwk', pair.publicKey) }
    // two first requests at once: the first to write wins, and both then read that one
    await d.prepare("INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('oauth:jwk', ?1, ?2)").bind(JSON.stringify(jwks), nowSec()).run()
    r = await d.prepare("SELECT value FROM settings WHERE key = 'oauth:jwk'").first<{ value: string }>()
  }
  const jwks = JSON.parse(r!.value) as Jwks
  memo = { jwks, key: await crypto.subtle.importKey('jwk', jwks.priv, ALG, false, ['sign']) }
  return memo
}

export async function publicJwks() {
  const { jwks } = await signingKey()
  return { keys: [{ ...jwks.pub, kid: jwks.kid, use: 'sig', alg: 'RS256', key_ops: ['verify'], ext: undefined }] }
}

async function signJwt(payload: Record<string, unknown>) {
  const { jwks, key } = await signingKey()
  const head = b64url(enc.encode(JSON.stringify({ alg: 'RS256', typ: 'JWT', kid: jwks.kid })))
  const pay = b64url(enc.encode(JSON.stringify(payload)))
  const sig = await crypto.subtle.sign(ALG, key, enc.encode(`${head}.${pay}`))
  return `${head}.${pay}.${b64url(sig)}`
}

// ---------- people ----------
/** The id an app sees for a person. It is different for every app, so two apps cannot compare notes. */
export async function pairwiseSub(userId: string, clientId: string) {
  return (await hmacHex((await setting('AUTH_SECRET')) ?? 'logoless', `oauth-sub|${userId}|${clientId}`)).slice(0, 32)
}

export async function claimsFor(userId: string, scope: string[], clientId: string) {
  const d = await db()
  const u = await d.prepare('SELECT u.email, u.name, u.created_at, p.handle, p.display_name, p.avatar_key, p.updated_at, p.badges_json, p.show_json FROM users u LEFT JOIN profiles p ON p.user_id = u.id WHERE u.id = ?1').bind(userId).first<{ email: string; name: string | null; created_at: number; handle: string | null; display_name: string | null; avatar_key: string | null; updated_at: number | null; badges_json: string | null; show_json: string | null }>()
  if (!u) throw new HttpError(404, 'That account no longer exists.')
  const c: Record<string, unknown> = { sub: await pairwiseSub(userId, clientId) }
  if (scope.includes('profile')) {
    c.name = u.display_name ?? u.name ?? u.handle ?? ''
    if (u.handle) {
      c.preferred_username = u.handle
      c.profile = `${ISSUER}/@${u.handle}`
    }
    if (u.avatar_key) c.picture = `${ISSUER}/api/img/${u.avatar_key}`
    c.updated_at = u.updated_at ?? u.created_at
  }
  if (scope.includes('email')) {
    c.email = u.email
    c.email_verified = (await isVerified(userId, u.email)).verified
  }
  if (scope.includes('stats')) {
    const s = await profileStats(userId)
    let badges: string[] = []
    try {
      badges = u.badges_json ? (JSON.parse(u.badges_json) as string[]) : []
    } catch {
      badges = []
    }
    c['logoless:stats'] = { clips: s.clips, views: s.views, campaigns: s.campaigns, badges }
  }
  return c
}

// ---------- grants ----------
const grantKey = (userId: string, clientId: string) => `oauth:grant:${userId}:${clientId}`
export type Grant = { scope: string[]; at: number; last: number }

export async function getGrant(userId: string, clientId: string): Promise<Grant | null> {
  const d = await db()
  const r = await d.prepare('SELECT value FROM settings WHERE key = ?1').bind(grantKey(userId, clientId)).first<{ value: string }>()
  try {
    return r ? (JSON.parse(r.value) as Grant) : null
  } catch {
    return null
  }
}

export async function saveGrant(userId: string, clientId: string, scope: string[]) {
  const prev = await getGrant(userId, clientId)
  const merged = [...new Set([...(prev?.scope ?? []), ...scope])]
  const g: Grant = { scope: merged, at: prev?.at ?? nowSec(), last: nowSec() }
  const d = await db()
  await d.prepare('INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at').bind(grantKey(userId, clientId), JSON.stringify(g), nowSec()).run()
  return g
}

export async function revokeGrant(userId: string, clientId: string) {
  const d = await db()
  await d.batch([
    d.prepare('DELETE FROM settings WHERE key = ?1').bind(grantKey(userId, clientId)),
    d.prepare("DELETE FROM settings WHERE (key LIKE 'oauth:rt:%' OR key LIKE 'oauth:at:%') AND json_extract(value, '$.userId') = ?1 AND json_extract(value, '$.clientId') = ?2").bind(userId, clientId),
  ])
}

export async function grantsOf(userId: string) {
  const d = await db()
  const rows = (await d.prepare("SELECT key, value FROM settings WHERE key LIKE ?1").bind(`oauth:grant:${userId}:%`).all<{ key: string; value: string }>()).results
  const out: { app: ReturnType<typeof appPublic>; grant: Grant }[] = []
  for (const r of rows) {
    try {
      const app = await getApp(r.key.split(':')[3])
      if (app) out.push({ app: appPublic(app), grant: JSON.parse(r.value) as Grant })
    } catch {
      /* skip */
    }
  }
  return out
}

// ---------- codes and tokens ----------
const CODE_TTL = 300
const AT_TTL = 3600
const RT_TTL = 30 * 86400
const put = async (key: string, value: unknown) => {
  const d = await db()
  await d.prepare('INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3)').bind(key, JSON.stringify(value), nowSec()).run()
}
const take = async <T>(key: string): Promise<T | null> => {
  const d = await db()
  const r = await d.prepare('DELETE FROM settings WHERE key = ?1 RETURNING value').bind(key).first<{ value: string }>()
  try {
    return r ? (JSON.parse(r.value) as T) : null
  } catch {
    return null
  }
}

/** Throws away expired codes and tokens. Cheap, and done now and then as new ones are made. */
async function sweep() {
  if (Math.random() > 0.05) return
  const d = await db()
  await d.prepare("DELETE FROM settings WHERE (key LIKE 'oauth:code:%' OR key LIKE 'oauth:at:%' OR key LIKE 'oauth:rt:%') AND json_extract(value, '$.exp') < ?1").bind(nowSec()).run()
}

export type CodeData = { clientId: string; userId: string; redirectUri: string; scope: string[]; nonce: string | null; challenge: string | null; exp: number; authTime: number }

export async function issueCode(d: Omit<CodeData, 'exp' | 'authTime'>) {
  await sweep()
  const code = b64url(crypto.getRandomValues(new Uint8Array(32)))
  await put(`oauth:code:${await sha256Hex(code)}`, { ...d, exp: nowSec() + CODE_TTL, authTime: nowSec() })
  return code
}

export async function consumeCode(code: string) {
  const data = await take<CodeData>(`oauth:code:${await sha256Hex(code)}`)
  return data && data.exp > nowSec() ? data : null
}

export const pkceOk = async (verifier: string, challenge: string) => verifier.length >= 43 && verifier.length <= 128 && /^[A-Za-z0-9\-._~]+$/.test(verifier) && safeEqual(b64url(await crypto.subtle.digest('SHA-256', enc.encode(verifier))), challenge)

export async function issueTokens(app: OAuthApp, userId: string, scope: string[], nonce: string | null, authTime: number) {
  await sweep()
  const access = `lga_${b64url(crypto.getRandomValues(new Uint8Array(32)))}`
  await put(`oauth:at:${await sha256Hex(access)}`, { userId, clientId: app.id, scope, exp: nowSec() + AT_TTL })
  const out: Record<string, unknown> = { access_token: access, token_type: 'Bearer', expires_in: AT_TTL, scope: scope.join(' ') }
  if (scope.includes('offline_access')) {
    const refresh = `lgr_${b64url(crypto.getRandomValues(new Uint8Array(32)))}`
    await put(`oauth:rt:${await sha256Hex(refresh)}`, { userId, clientId: app.id, scope, exp: nowSec() + RT_TTL, authTime })
    out.refresh_token = refresh
  }
  if (scope.includes('openid')) {
    const claims = await claimsFor(userId, scope, app.id)
    out.id_token = await signJwt({ iss: ISSUER, aud: app.id, iat: nowSec(), exp: nowSec() + AT_TTL, auth_time: authTime, ...(nonce ? { nonce } : {}), ...claims })
  }
  return out
}

export type TokenData = { userId: string; clientId: string; scope: string[]; exp: number; authTime?: number }

export async function consumeRefresh(token: string) {
  const data = await take<TokenData>(`oauth:rt:${await sha256Hex(token)}`)
  return data && data.exp > nowSec() ? data : null
}

export async function lookupAccess(token: string): Promise<TokenData | null> {
  const d = await db()
  const r = await d.prepare('SELECT value FROM settings WHERE key = ?1').bind(`oauth:at:${await sha256Hex(token)}`).first<{ value: string }>()
  if (!r) return null
  const data = JSON.parse(r.value) as TokenData
  if (data.exp <= nowSec()) return null
  // a token works only while the person still has the app connected and the app is not suspended
  const [grant, app] = await Promise.all([getGrant(data.userId, data.clientId), getApp(data.clientId)])
  return grant && app && !app.suspended ? data : null
}

export async function revokeToken(token: string, clientId: string) {
  const h = await sha256Hex(token)
  const d = await db()
  await d.prepare("DELETE FROM settings WHERE key IN (?1, ?2) AND json_extract(value, '$.clientId') = ?3").bind(`oauth:rt:${h}`, `oauth:at:${h}`, clientId).run()
}

/** Checks an app's secret (or that a public app sent none) from the way the request identified itself. */
export async function authenticateClient(headers: Headers, form: URLSearchParams): Promise<{ app: OAuthApp; authenticated: boolean } | null> {
  let id = form.get('client_id') ?? ''
  let secret = form.get('client_secret') ?? ''
  const basic = headers.get('authorization')?.match(/^Basic\s+(.+)$/i)
  if (basic) {
    try {
      const [bid, ...rest] = atob(basic[1]).split(':')
      id = decodeURIComponent(bid)
      secret = decodeURIComponent(rest.join(':'))
    } catch {
      return null
    }
  }
  const app = await getApp(id)
  if (!app || app.suspended) return null
  if (app.type === 'confidential') {
    if (!secret || !app.secretHash || !safeEqual(app.secretHash, await sha256Hex(secret))) return null
    return { app, authenticated: true }
  }
  return { app, authenticated: false }
}

export const fromB64 = fromB64url
export const toB64 = b64url
