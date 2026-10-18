import { randomToken, safeEqual, sha256Hex } from './crypto'
import { db, nowSec } from './db'
import { HttpError } from './http'

/**
 * Signing in from the native apps (the Mac app).
 *
 * The app never sees a password or a Google/Discord login. It opens the website's own sign-in in a system browser sheet, and when that
 * finishes the website hands back a short code. The app swaps the code for a token that it keeps in the Keychain and sends as
 * `Authorization: Bearer lgl_...`. To stop a code being used by anything but the app that asked for it, the app first sends the
 * SHA-256 of a secret it keeps to itself (PKCE), and must show the secret when it swaps the code.
 *
 * Everything lives in the settings table (no migration): `appcode:<hash>` for the code (one use, two minutes) and `appsess:<hash>` for a
 * signed-in app. Only hashes are stored, so reading the table never reveals a working code or token. An app that is not opened for
 * 90 days is signed out; signing out in the app (or removing the row) ends it at once.
 */
export const APP_TOKEN = /^lgl_[0-9a-f]{48}$/
/** Where the website may send a person back to after signing in for an app: the apps' own address, or this computer's loopback address (desktop apps listen there for a moment, RFC 8252). Nothing else. */
export const APP_REDIRECT = /^(logoless:\/\/auth|http:\/\/127\.0\.0\.1:\d{2,5}\/callback)$/
const CODE_TTL = 120
const IDLE_TTL = 90 * 86400

const b64url = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const challengeOf = async (verifier: string) => b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)))

type CodeRow = { e: string; c: string; x: number }
type SessRow = { e: string; c: number; l: number; d: string }

async function put(key: string, value: unknown) {
  const d = await db()
  await d
    .prepare('INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at')
    .bind(key, JSON.stringify(value), nowSec())
    .run()
}

/** A one-use code for a person who is signed in on the website. `challenge` is the app's SHA-256 (base64url) of its secret. */
export async function issueAppCode(email: string, challenge: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(challenge)) throw new HttpError(400, 'That sign-in request is not valid.')
  const d = await db()
  await d.prepare("DELETE FROM settings WHERE key LIKE 'appcode:%' AND updated_at < ?1").bind(nowSec() - 600).run()
  const code = randomToken(24)
  await put(`appcode:${await sha256Hex(code)}`, { e: email.toLowerCase(), c: challenge, x: nowSec() + CODE_TTL } satisfies CodeRow)
  return code
}

/** Swaps a code (and the secret it was asked for with) for a long-lived token. Null when the code is wrong, used, old or not for this secret. */
export async function redeemAppCode(code: string, verifier: string, device: string) {
  if (!/^[0-9a-f]{48}$/.test(code) || verifier.length < 32 || verifier.length > 128) return null
  const d = await db()
  const key = `appcode:${await sha256Hex(code)}`
  // deleting first makes the code single-use even if two requests arrive together: only the one that removed the row goes on
  const row = await d.prepare('DELETE FROM settings WHERE key = ?1 RETURNING value').bind(key).first<{ value: string }>()
  if (!row) return null
  let c: CodeRow
  try {
    c = JSON.parse(row.value) as CodeRow
  } catch {
    return null
  }
  if (c.x < nowSec() || !safeEqual(c.c, await challengeOf(verifier))) return null
  const token = `lgl_${randomToken(24)}`
  const t = nowSec()
  await put(`appsess:${await sha256Hex(token)}`, { e: c.e, c: t, l: t, d: device.slice(0, 60) } satisfies SessRow)
  await d.prepare("DELETE FROM settings WHERE key LIKE 'appsess:%' AND updated_at < ?1").bind(t - IDLE_TTL).run()
  return { token, email: c.e }
}

/** The email a token belongs to, or null. Keeps the token alive while it is in use (written at most once a day). */
export async function emailForAppToken(token: string): Promise<string | null> {
  if (!APP_TOKEN.test(token)) return null
  const d = await db()
  const key = `appsess:${await sha256Hex(token)}`
  const row = await d.prepare('SELECT value, updated_at FROM settings WHERE key = ?1').bind(key).first<{ value: string; updated_at: number }>()
  if (!row) return null
  const t = nowSec()
  if (row.updated_at < t - IDLE_TTL) return null
  let s: SessRow
  try {
    s = JSON.parse(row.value) as SessRow
  } catch {
    return null
  }
  if (row.updated_at < t - 86400) await put(key, { ...s, l: t })
  return s.e
}

export async function revokeAppToken(token: string) {
  if (!APP_TOKEN.test(token)) return
  const d = await db()
  await d.prepare('DELETE FROM settings WHERE key = ?1').bind(`appsess:${await sha256Hex(token)}`).run()
}

export const bearerOf = (req: Request) => {
  const m = /^Bearer (lgl_[0-9a-f]{48})$/.exec(req.headers.get('authorization') ?? '')
  return m ? m[1] : null
}

// ---------- showing the website's own pages inside the app ----------
// The app signs in with a token; the website's pages sign in with a cookie. To show a page of the site in the app, the app asks for a link that
// sets that cookie once (a code good for a minute, used once) and then lands on the page.

/** A path on this site and nothing else: it starts with one slash, is not a protocol-relative address, and has only ordinary characters. */
export const safeNext = (p: unknown): string => (typeof p === 'string' && /^\/(?!\/)[A-Za-z0-9\-_/?=&.%@~+#:,]*$/.test(p) && p.length <= 300 ? p : '/')

export async function issueWebCode(email: string, next: string) {
  const d = await db()
  await d.prepare("DELETE FROM settings WHERE key LIKE 'appweb:%' AND updated_at < ?1").bind(nowSec() - 300).run()
  const code = randomToken(24)
  await put(`appweb:${await sha256Hex(code)}`, { e: email.toLowerCase(), n: safeNext(next), x: nowSec() + 60 })
  return code
}

export async function redeemWebCode(code: string): Promise<{ email: string; next: string } | null> {
  if (!/^[0-9a-f]{48}$/.test(code)) return null
  const d = await db()
  const row = await d.prepare('DELETE FROM settings WHERE key = ?1 RETURNING value').bind(`appweb:${await sha256Hex(code)}`).first<{ value: string }>()
  if (!row) return null
  try {
    const v = JSON.parse(row.value) as { e: string; n: string; x: number }
    return v.x < nowSec() ? null : { email: v.e, next: safeNext(v.n) }
  } catch {
    return null
  }
}
