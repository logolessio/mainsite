import { db, nowSec } from '../db'
import { hashPassword } from '../password'
import { DEFAULT_SETTINGS, type Mini, type Profile, type Settings } from './types'

// Where the trailers site keeps what it knows about a person, in the settings table (no migration):
//   trailers:<email>          the profile (name, favourites, liked, saved, settings)
//   trailers-user:<username>  which email owns a username
//   trailers-cred:<username>  a username and password account: { hash } (the sign-in is in auth.ts)
// The email of a username and password account is made up (<username>@trailers.logoless.io): nobody is ever emailed there.

export const SYNTHETIC = '@trailers.logoless.io'
const CAP = 400

const RESERVED = new Set(['admin', 'administrator', 'root', 'support', 'logoless', 'moderator', 'mod', 'staff', 'system', 'tmdb', 'youtube', 'null', 'undefined', 'me', 'you'])
export const usernameProblem = (u: string): string | null => {
  if (!/^[a-z0-9._]{3,20}$/.test(u)) return 'Use 3 to 20 letters, numbers, dots or underscores.'
  if (/^[._]|[._]$|[._]{2}/.test(u)) return 'No dots or underscores at the ends or twice in a row.'
  if (RESERVED.has(u)) return 'That name is taken.'
  return null
}

async function get(key: string): Promise<string | null> {
  const r = await (await db()).prepare('SELECT value FROM settings WHERE key = ?1').bind(key).first<{ value: string }>()
  return r?.value ?? null
}
async function put(key: string, value: string) {
  await (await db())
    .prepare('INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at')
    .bind(key, value, nowSec())
    .run()
}

export async function loadProfile(email: string): Promise<Profile | null> {
  const raw = await get(`trailers:${email.toLowerCase()}`)
  if (!raw) return null
  try {
    const p = JSON.parse(raw) as Profile
    return { ...p, settings: { ...DEFAULT_SETTINGS, ...p.settings } }
  } catch {
    return null
  }
}

export async function saveProfile(email: string, p: Profile) {
  await put(`trailers:${email.toLowerCase()}`, JSON.stringify(p))
}

export const usernameTaken = async (u: string) => (await get(`trailers-user:${u}`)) !== null

/** Reserves a username for an email. False if somebody else holds it. */
export async function claimUsername(username: string, email: string): Promise<boolean> {
  const d = await db()
  const res = await d
    .prepare('INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3)')
    .bind(`trailers-user:${username}`, email.toLowerCase(), nowSec())
    .run()
  if (res.meta.changes === 1) return true
  return (await get(`trailers-user:${username}`)) === email.toLowerCase()
}

export async function releaseUsername(username: string, email: string) {
  const d = await db()
  await d.prepare('DELETE FROM settings WHERE key = ?1 AND value = ?2').bind(`trailers-user:${username}`, email.toLowerCase()).run()
}

/** A username and password account. False if the username is already taken. */
export async function createCredentials(username: string, password: string): Promise<boolean> {
  const email = `${username}${SYNTHETIC}`
  if (!(await claimUsername(username, email))) return false
  const res = await (await db())
    .prepare('INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3)')
    .bind(`trailers-cred:${username}`, JSON.stringify({ hash: await hashPassword(password) }), nowSec())
    .run()
  return res.meta.changes === 1
}

export async function credentialHash(username: string): Promise<string | null> {
  const raw = await get(`trailers-cred:${username}`)
  if (!raw) return null
  try {
    return (JSON.parse(raw) as { hash: string }).hash
  } catch {
    return null
  }
}

/** A username for someone who signed in with Google, Discord or logoless: their name, made safe, with digits until it is free. */
export async function freeUsername(name: string, email: string): Promise<string> {
  const base = (name || email.split('@')[0]).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '').slice(0, 14) || 'movie.fan'
  const start = usernameProblem(base) ? 'movie.fan' : base
  for (let i = 0; i < 12; i++) {
    const u = i === 0 ? start : `${start}${Math.floor(1000 + Math.random() * 9000)}`
    if (await claimUsername(u, email)) return u
  }
  return `${start}${Date.now() % 100000}`
}

// ---------- lists ----------
export function toggle(list: Mini[], m: Mini): { list: Mini[]; on: boolean } {
  const has = list.some((x) => x.id === m.id)
  return has ? { list: list.filter((x) => x.id !== m.id), on: false } : { list: [m, ...list].slice(0, CAP), on: true }
}

export function mergeSettings(cur: Settings, patch: Partial<Settings>): Settings {
  return {
    region: typeof patch.region === 'string' && /^[A-Z]{2}$/.test(patch.region) ? patch.region : cur.region,
    sound: typeof patch.sound === 'boolean' ? patch.sound : cur.sound,
    autoNext: typeof patch.autoNext === 'boolean' ? patch.autoNext : cur.autoNext,
    ambient: typeof patch.ambient === 'boolean' ? patch.ambient : cur.ambient,
    glass: typeof patch.glass === 'number' ? Math.max(0, Math.min(100, Math.round(patch.glass))) : cur.glass,
  }
}
