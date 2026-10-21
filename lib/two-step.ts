import { sha256Hex } from './crypto'
import { db, nowSec } from './db'
import { hit } from './guard'
import { newSecret, otpauthUrl, verifyTotp } from './totp'

/**
 * Two-step sign-in for people who sign in with an email and password: after the password, a six-digit code from an authenticator app (or one of
 * eight backup codes, each good once). Kept in the settings table, so no database change is needed. Google and Discord sign-in have their own.
 */
type Rec = { secret: string; backup: string[]; last: number; at: number }
const key = (email: string) => `2fa:${email.toLowerCase()}`
const pend = (email: string) => `2fa-pending:${email.toLowerCase()}`

async function read<T>(k: string): Promise<T | null> {
  try {
    const r = await (await db()).prepare('SELECT value FROM settings WHERE key = ?1').bind(k).first<{ value: string }>()
    return r ? (JSON.parse(r.value) as T) : null
  } catch {
    return null
  }
}
async function write(k: string, v: unknown) {
  await (await db()).prepare('INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at').bind(k, JSON.stringify(v), nowSec()).run()
}
const drop = async (k: string) => void (await (await db()).prepare('DELETE FROM settings WHERE key = ?1').bind(k).run())

export async function twoStepOn(email: string): Promise<boolean> {
  return Boolean(await read<Rec>(key(email)))
}

/** Starts turning it on: a new secret to put in the app. Nothing is on until a code from the app has been proven. */
export async function beginTwoStep(email: string) {
  const secret = newSecret()
  await write(pend(email), { secret, at: nowSec() })
  return { secret, url: otpauthUrl(email, secret) }
}

const backupCode = () => {
  const b = crypto.getRandomValues(new Uint8Array(5))
  const s = [...b].map((x) => x.toString(36).padStart(2, '0')).join('').slice(0, 8)
  return `${s.slice(0, 4)}-${s.slice(4)}`
}

/** Turns it on once the code from the app is right. Returns the eight backup codes: they are shown this once and never again. */
export async function enableTwoStep(email: string, code: string): Promise<string[] | null> {
  if ((await hit(`2fa-enable:${email.toLowerCase()}`, 900)) > 10) return null
  const p = await read<{ secret: string; at: number }>(pend(email))
  if (!p || nowSec() - p.at > 3600) return null
  const step = await verifyTotp(p.secret, code.trim())
  if (step === null) return null
  const codes = Array.from({ length: 8 }, backupCode)
  await write(key(email), { secret: p.secret, backup: await Promise.all(codes.map((c) => sha256Hex(c.replace('-', '')))), last: step, at: nowSec() } satisfies Rec)
  await drop(pend(email))
  return codes
}

/** The second step of signing in: a code from the app, or a backup code (which is used up). At most ten tries every fifteen minutes. */
export async function checkTwoStep(email: string, input: string): Promise<boolean> {
  if ((await hit(`2fa-login:${email.toLowerCase()}`, 900)) > 10) return false
  const rec = await read<Rec>(key(email))
  if (!rec) return false
  const v = input.trim()
  if (/^\d{6}$/.test(v)) {
    const step = await verifyTotp(rec.secret, v, rec.last)
    if (step === null) return false
    await write(key(email), { ...rec, last: step })
    return true
  }
  const h = await sha256Hex(v.toLowerCase().replace(/[^a-z0-9]/g, ''))
  if (!rec.backup.includes(h)) return false
  await write(key(email), { ...rec, backup: rec.backup.filter((x) => x !== h) })
  return true
}

export async function backupLeft(email: string): Promise<number> {
  return (await read<Rec>(key(email)))?.backup.length ?? 0
}

export async function turnOffTwoStep(email: string) {
  await drop(key(email))
  await drop(pend(email))
}
