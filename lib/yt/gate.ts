import { cookies } from 'next/headers'

/*
 * yt.logoless.io is behind a password. The password is the YT_PASSWORD secret (Cloudflare: `wrangler secret put YT_PASSWORD`, on a developer's
 * machine: .env.local), never in the code: this repository is public. Without the secret the page stays locked for everyone.
 * The right password gets a cookie holding an HMAC of a fixed text keyed by the password, so it cannot be made without knowing the password,
 * and changing the password locks everyone out again.
 */

export const YT_COOKIE = 'yt_plan'
export const YT_COOKIE_DAYS = 60

const password = () => process.env.YT_PASSWORD ?? ''

async function hmac(key: string, text: string): Promise<string> {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(text))
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Compares two strings in time that does not depend on where they differ. */
function same(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/** The cookie value the right password earns. Null when no password is set (the page stays locked). */
export async function unlockToken(): Promise<string | null> {
  const pw = password()
  return pw ? hmac(pw, 'yt.logoless.io unlocked v1') : null
}

/** Is this the password? Compared as HMACs so the check takes the same time whatever was typed. */
export async function isYtPassword(typed: string): Promise<boolean> {
  const pw = password()
  if (!pw) return false
  return same(await hmac(pw, typed), await hmac(pw, pw))
}

/** Has this visitor put the password in? */
export async function ytUnlocked(): Promise<boolean> {
  const token = await unlockToken()
  const got = (await cookies()).get(YT_COOKIE)?.value
  return Boolean(token && got && same(got, token))
}
