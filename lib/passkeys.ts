import { generateAuthenticationOptions, generateRegistrationOptions, verifyAuthenticationResponse, verifyRegistrationResponse } from '@simplewebauthn/server'
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from '@simplewebauthn/server'
import { hmacHex, safeEqual, sha256Hex } from './crypto'
import { db, nowSec, setting } from './db'
import { hit } from './guard'
import { HttpError } from './http'

/**
 * Passkeys: signing in with Face ID, a fingerprint, a device PIN or a security key instead of a password. A passkey is a key pair: the phone or computer keeps
 * the private half behind its own lock, and logoless keeps only the public half, so there is nothing to steal from our side and nothing to phish.
 *
 * Kept in the settings table like two-step sign-in, so no database change is needed:
 *   passkey:<email>        a JSON list of that person's passkeys (their public keys, a use counter, a name)
 *   passkey-id:<id>        which email a passkey belongs to, so signing in needs no email typed first
 * The challenge each ceremony must answer travels in a short-lived signed cookie, and is good once.
 */
export type Passkey = {
  id: string // the credential id, base64url
  pk: string // the public key (COSE), base64url
  counter: number
  transports?: string[]
  name: string
  at: number // when it was added (seconds)
  last?: number // when it last signed someone in (seconds)
  multi: boolean // a synced passkey (iCloud Keychain, Google Password Manager, a password manager) as opposed to one stuck on one device
}
export type PasskeyView = { id: string; name: string; at: number; last: number | null; synced: boolean }

const MAX_PER_PERSON = 10
const CHALLENGE_COOKIE = 'lg_pk'
const ALGORITHMS = [-7, -257] // ES256 (Face ID, Touch ID, Android, most keys) and RS256 (some Windows Hello setups)
const OWN_HOST = /^(?:(?:www|dev|owner|admin)\.)?logoless\.io$/i

// ---- base64url ----
export const toB64u = (b: Uint8Array) => btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
export const fromB64u = (s: string) => {
  const p = s.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(p + '='.repeat((4 - (p.length % 4)) % 4))
  return Uint8Array.from(bin, (c) => c.charCodeAt(0)) as Uint8Array<ArrayBuffer>
}

/**
 * Which site the passkey belongs to. On logoless.io, dev., owner. and admin. it is logoless.io for all of them, so a passkey made on one works on the others
 * (they share one sign-in anyway). On a local machine it is localhost. Anywhere else (a preview address) passkeys are not offered.
 */
export function relyingParty(req: Request): { id: string; origin: string } | null {
  const host = (req.headers.get('host') ?? new URL(req.url).host).toLowerCase()
  const name = host.split(':')[0]
  if (OWN_HOST.test(name)) return { id: 'logoless.io', origin: `https://${name}` }
  if (name === 'localhost') return { id: 'localhost', origin: `http://${host}` }
  return null
}

function needRp(req: Request) {
  const rp = relyingParty(req)
  if (!rp) throw new HttpError(400, 'Passkeys work on logoless.io. Open the site there and try again.')
  return rp
}

// ---- the stored passkeys ----
async function read<T>(key: string): Promise<T | null> {
  try {
    const r = await (await db()).prepare('SELECT value FROM settings WHERE key = ?1').bind(key).first<{ value: string }>()
    return r ? (JSON.parse(r.value) as T) : null
  } catch {
    return null
  }
}
async function write(key: string, value: unknown) {
  await (await db())
    .prepare('INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at')
    .bind(key, JSON.stringify(value), nowSec())
    .run()
}
const drop = async (key: string) => void (await (await db()).prepare('DELETE FROM settings WHERE key = ?1').bind(key).run())

const listKey = (email: string) => `passkey:${email.toLowerCase()}`
const idKey = (id: string) => `passkey-id:${id}`

export async function passkeysOf(email: string): Promise<Passkey[]> {
  return (await read<Passkey[]>(listKey(email))) ?? []
}

export const viewOf = (list: Passkey[]): PasskeyView[] => list.map((p) => ({ id: p.id, name: p.name, at: p.at, last: p.last ?? null, synced: p.multi }))

/** The person a credential id belongs to, with the passkey itself. */
async function findByCredential(id: string): Promise<{ email: string; passkey: Passkey } | null> {
  const owner = await read<string>(idKey(id))
  if (!owner) return null
  const passkey = (await passkeysOf(owner)).find((p) => p.id === id)
  return passkey ? { email: owner, passkey } : null
}

export async function removePasskey(email: string, id: string): Promise<boolean> {
  const list = await passkeysOf(email)
  const next = list.filter((p) => p.id !== id)
  if (next.length === list.length) return false
  if (next.length) await write(listKey(email), next)
  else await drop(listKey(email))
  await drop(idKey(id))
  return true
}

// ---- the challenge cookie ----
type Challenge = { c: string; p: 'reg' | 'auth'; e: number; u?: string }

async function secret() {
  const s = await setting('AUTH_SECRET')
  if (!s) throw new HttpError(503, 'Sign-in is not set up yet.')
  return s
}

async function seal(ch: Challenge): Promise<string> {
  const body = toB64u(new TextEncoder().encode(JSON.stringify(ch)))
  return `${body}.${await hmacHex(await secret(), `passkey|${body}`)}`
}

/** Reads the cookie out of a request's headers and checks it: signed by us, the right ceremony, not expired, and never seen before (so it works once). */
async function unseal(req: Request, purpose: Challenge['p']): Promise<Challenge> {
  const raw = /(?:^|;\s*)lg_pk=([^;]+)/.exec(req.headers.get('cookie') ?? '')?.[1]
  const bad = new HttpError(400, 'That took too long or did not match. Please try again.')
  if (!raw) throw bad
  const [body, mac] = raw.split('.')
  if (!body || !mac || !safeEqual(mac, await hmacHex(await secret(), `passkey|${body}`))) throw bad
  let ch: Challenge
  try {
    ch = JSON.parse(new TextDecoder().decode(fromB64u(body))) as Challenge
  } catch {
    throw bad
  }
  if (ch.p !== purpose || ch.e < nowSec()) throw bad
  if ((await hit(`pk-used:${(await sha256Hex(ch.c)).slice(0, 32)}`, 900)) > 1) throw bad
  return ch
}

/** The Set-Cookie header that carries the challenge to the next request (and the one that clears it). */
function cookieHeader(value: string, rpOrigin: string, maxAge: number) {
  return `${CHALLENGE_COOKIE}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${rpOrigin.startsWith('https') ? '; Secure' : ''}`
}
export const clearCookie = (req: Request) => cookieHeader('', relyingParty(req)?.origin ?? 'http://localhost', 0)

// ---- adding a passkey (signed in) ----
export async function registrationOptions(req: Request, user: { id: string; email: string; name: string | null }) {
  const rp = needRp(req)
  const have = await passkeysOf(user.email)
  if (have.length >= MAX_PER_PERSON) throw new HttpError(409, `You can keep up to ${MAX_PER_PERSON} passkeys. Remove one you no longer use first.`)
  const options = await generateRegistrationOptions({
    rpName: 'logoless',
    rpID: rp.id,
    userName: user.email,
    userDisplayName: user.name || user.email,
    userID: new TextEncoder().encode(user.id) as Uint8Array<ArrayBuffer>,
    attestationType: 'none',
    excludeCredentials: have.map((p) => ({ id: p.id, transports: p.transports })),
    // a passkey you can pick without typing an email first: it is stored on the device or in its keychain, and unlocked with Face ID, a fingerprint or the device PIN
    authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
    supportedAlgorithmIDs: ALGORITHMS,
    timeout: 120_000,
  })
  const cookie = cookieHeader(await seal({ c: options.challenge, p: 'reg', e: nowSec() + 300, u: user.id }), rp.origin, 300)
  return { options, cookie }
}

export async function finishRegistration(req: Request, user: { id: string; email: string }, response: RegistrationResponseJSON, name: string): Promise<PasskeyView[]> {
  const rp = needRp(req)
  const ch = await unseal(req, 'reg')
  if (ch.u !== user.id) throw new HttpError(400, 'That took too long or did not match. Please try again.')
  let v
  try {
    v = await verifyRegistrationResponse({ response, expectedChallenge: ch.c, expectedOrigin: rp.origin, expectedRPID: rp.id, requireUserVerification: true, supportedAlgorithmIDs: ALGORITHMS })
  } catch {
    throw new HttpError(400, 'Your device could not confirm that passkey. Please try again.')
  }
  if (!v.verified) throw new HttpError(400, 'Your device could not confirm that passkey. Please try again.')
  const c = v.registrationInfo.credential
  if (await read<string>(idKey(c.id))) throw new HttpError(409, 'That passkey is already saved.')
  const list = await passkeysOf(user.email)
  if (list.length >= MAX_PER_PERSON) throw new HttpError(409, `You can keep up to ${MAX_PER_PERSON} passkeys.`)
  const pk: Passkey = {
    id: c.id,
    pk: toB64u(c.publicKey),
    counter: c.counter,
    transports: c.transports,
    name: name.trim().slice(0, 40) || 'Passkey',
    at: nowSec(),
    multi: v.registrationInfo.credentialDeviceType === 'multiDevice',
  }
  const next = [...list, pk]
  await write(idKey(c.id), user.email.toLowerCase())
  await write(listKey(user.email), next)
  return viewOf(next)
}

// ---- signing in with one ----
/** Options for the browser. No email is asked for: the person picks a passkey on their device, and the device says which one. */
export async function authenticationOptions(req: Request) {
  const rp = needRp(req)
  const options = await generateAuthenticationOptions({ rpID: rp.id, userVerification: 'required', timeout: 120_000 })
  const cookie = cookieHeader(await seal({ c: options.challenge, p: 'auth', e: nowSec() + 300 }), rp.origin, 300)
  return { options, cookie }
}

/** Checks the browser's answer and returns whose passkey it was, or null. Used by the sign-in provider in auth.ts. */
export async function finishAuthentication(req: Request, response: AuthenticationResponseJSON): Promise<string | null> {
  const rp = relyingParty(req)
  if (!rp || typeof response?.id !== 'string') return null
  try {
    const ch = await unseal(req, 'auth')
    const found = await findByCredential(response.id)
    if (!found) return null
    const { email, passkey } = found
    const v = await verifyAuthenticationResponse({
      response,
      expectedChallenge: ch.c,
      expectedOrigin: rp.origin,
      expectedRPID: rp.id,
      requireUserVerification: true,
      credential: { id: passkey.id, publicKey: fromB64u(passkey.pk), counter: passkey.counter, transports: passkey.transports as never },
    })
    if (!v.verified) return null
    const list = await passkeysOf(email)
    await write(listKey(email), list.map((p) => (p.id === passkey.id ? { ...p, counter: v.authenticationInfo.newCounter, last: nowSec(), multi: v.authenticationInfo.credentialDeviceType === 'multiDevice' } : p)))
    return email
  } catch {
    return null
  }
}
