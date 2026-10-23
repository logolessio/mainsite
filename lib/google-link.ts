import { hmacHex, safeEqual } from './crypto'
import { db, nowSec, setting } from './db'
import { hit } from './guard'
import { aliasForKey, aliasKey } from './prelaunch'
import { isOwnerEmail } from './user'

/**
 * "Add Google" on the pre-launch sign-up. The person is signed in (with Discord); pressing the button attaches a short-lived note, signed by the server, that
 * says which account they are. When Google then sends them back, auth.ts reads the note and records that this Google address leads to that account
 * (`alias:<google email>`), so the next Google sign-in lands in the same account instead of a second one.
 *
 * The note is the only thing that can create the link, it lasts ten minutes and works once, and it is refused when the Google address already has an
 * account of its own or belongs to an owner, so it cannot be used to attach to, or take over, anyone else's.
 */
export const LINK_COOKIE = 'lg_link'
const TTL = 600

const b64 = (s: string) => btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const unb64 = (s: string) => atob(s.replace(/-/g, '+').replace(/_/g, '/'))

async function secret() {
  return (await setting('AUTH_SECRET')) ?? 'logoless'
}

/** The note for this account. */
export async function sealIntent(accountEmail: string): Promise<string> {
  const body = b64(JSON.stringify({ p: accountEmail.trim().toLowerCase(), e: nowSec() + TTL, n: crypto.randomUUID() }))
  return `${body}.${await hmacHex(await secret(), `google-link|${body}`)}`
}

/** The Set-Cookie value that carries the note to the sign-in (the sign-in lives on logoless.io while the page is on beta.logoless.io, so it is set for the whole domain). */
export function intentCookie(value: string, host: string, maxAge = TTL): string {
  const shared = host.split(':')[0].endsWith('.logoless.io')
  return `${LINK_COOKIE}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${shared ? '; Secure; Domain=.logoless.io' : ''}`
}

/** The account a valid note names, with the note's one-use id. Null for no note, a forged one, or an old one. */
export async function readIntent(cookie: string | null): Promise<{ account: string; id: string } | null> {
  const raw = cookie?.split(';').map((c) => c.trim()).find((c) => c.startsWith(`${LINK_COOKIE}=`))?.slice(LINK_COOKIE.length + 1)
  if (!raw) return null
  const [body, mac] = raw.split('.')
  if (!body || !mac || !safeEqual(mac, await hmacHex(await secret(), `google-link|${body}`))) return null
  try {
    const j = JSON.parse(unb64(body)) as { p?: string; e?: number; n?: string }
    if (typeof j.p !== 'string' || typeof j.n !== 'string' || typeof j.e !== 'number' || j.e < nowSec()) return null
    return { account: j.p, id: j.n }
  } catch {
    return null
  }
}

export type Claim = 'ok' | 'same' | 'taken' | 'owner' | 'used'

/** Records that `googleEmail` leads to `account`, if that is allowed. Replaces an earlier Google address on the same account. */
export async function claimAlias(intent: { account: string; id: string }, googleEmail: string): Promise<Claim> {
  const g = googleEmail.trim().toLowerCase()
  const p = intent.account
  if (g === p) return 'same'
  if (await isOwnerEmail(g)) return 'owner'
  const d = await db()
  const [user, cred, existing] = await Promise.all([
    d.prepare('SELECT 1 AS x FROM users WHERE email = ?1').bind(g).first(),
    d.prepare('SELECT 1 AS x FROM credentials WHERE email = ?1').bind(g).first(),
    d.prepare('SELECT value FROM settings WHERE key = ?1').bind(aliasKey(g)).first<{ value: string }>(),
  ])
  if (user || cred) return 'taken'
  if (existing && JSON.parse(existing.value) !== p) return 'taken'
  if ((await hit(`google-link-used:${intent.id}`, 900)) > 1) return 'used'
  const old = await d.prepare('SELECT value FROM settings WHERE key = ?1').bind(aliasForKey(p)).first<{ value: string }>()
  const t = nowSec()
  const put = (key: string, v: string) =>
    d.prepare('INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at').bind(key, JSON.stringify(v), t)
  const stmts = [put(aliasKey(g), p), put(aliasForKey(p), g)]
  const oldG = old ? (JSON.parse(old.value) as string) : null
  if (oldG && oldG !== g) stmts.push(d.prepare('DELETE FROM settings WHERE key = ?1').bind(aliasKey(oldG)))
  await d.batch(stmts)
  return 'ok'
}

/** The account a Google address leads to, if it was linked. */
export async function aliasTarget(googleEmail: string): Promise<string | null> {
  try {
    const r = await (await db()).prepare('SELECT value FROM settings WHERE key = ?1').bind(aliasKey(googleEmail)).first<{ value: string }>()
    return r ? (JSON.parse(r.value) as string) : null
  } catch {
    return null
  }
}

/** Takes the Google address off an account again. */
export async function unlinkGoogle(accountEmail: string): Promise<void> {
  const d = await db()
  const r = await d.prepare('SELECT value FROM settings WHERE key = ?1').bind(aliasForKey(accountEmail)).first<{ value: string }>()
  if (!r) return
  await d.batch([d.prepare('DELETE FROM settings WHERE key = ?1').bind(aliasKey(JSON.parse(r.value) as string)), d.prepare('DELETE FROM settings WHERE key = ?1').bind(aliasForKey(accountEmail))])
}
