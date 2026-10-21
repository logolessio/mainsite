import { hmacHex, randomToken, safeEqual } from './crypto'
import { db, nowSec, setting } from './db'
import { hit, ipHash } from './guard'
import { HttpError } from './http'

// The waitlist on the coming-soon page: one spot per device.
//
// Every visitor gets a signed cookie (ll_wl) holding a random device id. A device where the owner has signed in gets a signed
// owner mark in the same cookie, and keeps it after signing out, so the owner can make as many test sign-ups as they like there.
// The cookie is the main check. A light browser fingerprint, hashed together with the network, catches the same browser after its
// cookies were cleared. Only keyed hashes are stored (table launch_devices): never the address, the IP or the fingerprint itself.

const COOKIE = 'll_wl'
const YEAR = 365 * 86400

async function secret() {
  return (await setting('AUTH_SECRET')) ?? 'logoless'
}
const sign = async (id: string, owner: boolean) => (await hmacHex(await secret(), `wl-device|${id}|${owner ? 1 : 0}`)).slice(0, 32)

export type Device = { id: string; owner: boolean }

/** The device in the request's cookie, or null when there is none or it was not made by this server. */
export async function readDevice(req: Request): Promise<Device | null> {
  const raw = req.headers.get('cookie')?.split(';').map((c) => c.trim()).find((c) => c.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1)
  const m = /^([A-Za-z0-9_-]{16,40})\.([01])\.([0-9a-f]{32})$/.exec(raw ?? '')
  if (!m) return null
  if (!safeEqual(m[3], await sign(m[1], m[2] === '1'))) return null
  return { id: m[1], owner: m[2] === '1' }
}

/** The Set-Cookie value for a device. */
export async function deviceCookie(req: Request, d: Device) {
  const secure = new URL(req.url).protocol === 'https:' || req.headers.get('x-forwarded-proto') === 'https'
  return `${COOKIE}=${d.id}.${d.owner ? 1 : 0}.${await sign(d.id, d.owner)}; Max-Age=${2 * YEAR}; Path=/; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`
}

/** The device for this request, made if missing, and marked as the owner's when the owner is signed in. `set` is a cookie to send back, if anything changed. */
export async function ensureDevice(req: Request, ownerSignedIn: boolean): Promise<{ device: Device; set: string | null }> {
  const cur = await readDevice(req)
  if (cur && (cur.owner || !ownerSignedIn)) return { device: cur, set: null }
  const device = { id: cur?.id ?? randomToken(12), owner: Boolean(cur?.owner || ownerSignedIn) }
  return { device, set: await deviceCookie(req, device) }
}

/** The fingerprint key: a keyed hash of what the browser sent and the network it came from. Null when the browser sent nothing usable. */
async function fingerprintKey(req: Request, fp: string | undefined) {
  if (!fp || !/^[0-9a-f]{64}$/.test(fp)) return null
  return `f:${(await hmacHex(await secret(), `wl-fp|${fp}|${await ipHash(req)}`)).slice(0, 40)}`
}

const mask = (email: string) => email.replace(/^(.)[^@]*(@.).*?(\.[^.]+)$/, '$1•••$2•••$3')

/**
 * Throws when this device already holds a spot for another address. The answer names that address (masked) so a person who
 * forgot they joined understands why. Exempt: a device carrying the owner's mark, or any request while the owner is signed in.
 */
export async function checkDevice(req: Request, device: Device | null, fp: string | undefined, emailKey: string, exempt: boolean) {
  if (exempt || device?.owner) return
  const keys = [device ? `c:${device.id}` : null, await fingerprintKey(req, fp)].filter(Boolean) as string[]
  if (!keys.length) return
  const d = await db()
  const rows = (await d.prepare(`SELECT key, email_key FROM launch_devices WHERE key IN (${keys.map((_, i) => `?${i + 1}`).join(',')})`).bind(...keys).all<{ key: string; email_key: string }>()).results
  const other = rows.find((r) => r.email_key !== emailKey)
  if (!other) return
  const held = await d.prepare('SELECT value FROM settings WHERE key = ?1').bind(`launch-signup:${other.email_key}`).first<{ value: string }>()
  let who = ''
  try {
    who = held ? mask((JSON.parse(held.value) as { e: string }).e) : ''
  } catch {
    /* no address to show */
  }
  throw new HttpError(409, who ? `This device already has a spot on the waitlist, for ${who}. One spot per device.` : 'This device already has a spot on the waitlist. One spot per device.')
}

/** Records that this device now holds the spot for this address. Also caps how many spots one network can take in a day. */
export async function recordDevice(req: Request, device: Device | null, fp: string | undefined, emailKey: string, exempt: boolean) {
  if (exempt || device?.owner) return
  if ((await hit(`waitlist-net:${await ipHash(req)}`, 86400)) > 30) throw new HttpError(429, 'Too many sign-ups from this network today. Please try again tomorrow.')
  const keys = [device ? `c:${device.id}` : null, await fingerprintKey(req, fp)].filter(Boolean) as string[]
  const d = await db()
  const t = nowSec()
  await d.batch(keys.map((k) => d.prepare('INSERT OR IGNORE INTO launch_devices (key, email_key, created_at) VALUES (?1, ?2, ?3)').bind(k, emailKey, t)))
}

// ---------- the proof that an address was confirmed by its code ----------
// Handed to the browser after the code is right, and needed to finish (pick the username). It is tied to the address and runs out.

const PROOF_TTL = 30 * 60

export async function proofFor(email: string) {
  const exp = nowSec() + PROOF_TTL
  return `${exp}.${(await hmacHex(await secret(), `wl-proof|${email}|${exp}`)).slice(0, 40)}`
}

export async function checkProof(email: string, proof: string) {
  const m = /^(\d{9,11})\.([0-9a-f]{40})$/.exec(proof)
  if (!m || Number(m[1]) < nowSec()) return false
  return safeEqual(m[2], (await hmacHex(await secret(), `wl-proof|${email}|${m[1]}`)).slice(0, 40))
}
