import { hmacHex, safeEqual } from './crypto'
import { setting } from './db'

/**
 * Password storage. A password is mixed with a secret "pepper" that lives only in Cloudflare, then run through PBKDF2
 * with a random salt. 100,000 rounds is the most Cloudflare Workers allows. Only the result is stored.
 * Do not change the pepper (PASSWORD_PEPPER, or AUTH_SECRET if that is not set): every password would stop matching.
 */
const ITER = 100_000
const enc = new TextEncoder()
const hex = (b: ArrayBuffer | Uint8Array) => [...new Uint8Array(b instanceof Uint8Array ? b : b)].map((x) => x.toString(16).padStart(2, '0')).join('')
const unhex = (s: string) => Uint8Array.from(s.match(/../g) ?? [], (h) => parseInt(h, 16))

async function derive(password: string, salt: Uint8Array, iter: number) {
  const pepper = (await setting('PASSWORD_PEPPER')) ?? (await setting('AUTH_SECRET')) ?? 'logoless'
  const mixed = await hmacHex(pepper, password.normalize('NFKC'))
  const key = await crypto.subtle.importKey('raw', enc.encode(mixed), 'PBKDF2', false, ['deriveBits'])
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-512', salt: salt as BufferSource, iterations: iter }, key, 512))
}

export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(24))
  return `pbkdf2-sha512$${ITER}$${hex(salt)}$${await derive(password, salt, ITER)}`
}

export async function verifyPassword(password: string, stored: string | null | undefined) {
  // With no stored hash we still do the same work, so timing does not reveal which addresses have accounts.
  const parts = (stored ?? '').split('$')
  const real = parts.length === 4 && parts[0] === 'pbkdf2-sha512'
  const iter = real ? Number(parts[1]) : ITER
  const salt = real ? unhex(parts[2]) : new Uint8Array(24)
  const got = await derive(password, salt, iter)
  return real && safeEqual(got, parts[3])
}

const COMMON = new Set(
  'password 123456789 1234567890 qwertyuiop 1q2w3e4r5t iloveyou password1 password123 letmein123 welcome123 admin12345 qwerty123 abc1234567 11111111 00000000 football1 baseball1 trustno1 monkey1234 dragon1234 sunshine1 princess1 logoless123 logoless1234'.split(' '),
)

/** The rules for a new password. Returns the reason it is not allowed, or null if it is fine. */
export async function passwordProblem(password: string, email: string): Promise<string | null> {
  if (password.length < 10) return 'Use at least 10 characters.'
  if (password.length > 128) return 'That password is too long (128 characters at most).'
  const lower = password.toLowerCase()
  if (COMMON.has(lower) || /^(.)\1+$/.test(password)) return 'That password is too easy to guess. Pick something less common.'
  const local = email.split('@')[0].toLowerCase()
  if (local.length >= 4 && lower.includes(local)) return 'Your password should not contain your email address.'
  if (await isBreached(password)) return 'That password has appeared in a data breach. Please choose a different one.'
  return null
}

/** Checks the password against Have I Been Pwned without sending it: only the first 5 characters of its SHA-1 leave. */
async function isBreached(password: string) {
  try {
    const sha = hex(await crypto.subtle.digest('SHA-1', enc.encode(password))).toUpperCase()
    const res = await fetch(`https://api.pwnedpasswords.com/range/${sha.slice(0, 5)}`, { headers: { 'add-padding': 'true' }, signal: AbortSignal.timeout(2500) })
    if (!res.ok) return false
    const text = await res.text()
    return text.split('\n').some((l) => {
      const [suffix, count] = l.trim().split(':')
      return suffix === sha.slice(5) && Number(count) > 0
    })
  } catch {
    return false // if the service is down we do not block sign-ups
  }
}
