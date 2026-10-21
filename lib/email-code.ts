import { hmacHex, safeEqual } from './crypto'
import { db, nowSec, setting } from './db'
import { HttpError } from './http'

export type Purpose = 'signup' | 'reset' | 'test' | 'verify' | 'waitlist' | 'payout'
const TTL = 10 * 60
const MAX_TRIES = 5
const COOLDOWN = 30

/** A random six-digit code, with no bias toward low numbers. */
export function newCode() {
  const limit = Math.floor(0x100000000 / 1_000_000) * 1_000_000
  const a = new Uint32Array(1)
  do crypto.getRandomValues(a)
  while (a[0] >= limit)
  return String(a[0] % 1_000_000).padStart(6, '0')
}

const hashOf = async (email: string, purpose: Purpose, code: string) => hmacHex((await setting('AUTH_SECRET')) ?? 'logoless', `emailcode|${purpose}|${email}|${code}`)

/** Stores a fresh code for this address and purpose (replacing any earlier one) and returns it. `payload` rides along. */
export async function issueCode(email: string, purpose: Purpose, payload?: string) {
  const d = await db()
  const t = nowSec()
  const prev = await d.prepare('SELECT sent_at FROM email_codes WHERE email = ?1 AND purpose = ?2').bind(email, purpose).first<{ sent_at: number }>()
  if (prev && t - prev.sent_at < COOLDOWN) throw new HttpError(429, 'Please wait a few seconds before asking for another code.')
  const code = newCode()
  await d
    .prepare(
      `INSERT INTO email_codes (email, purpose, code_hash, expires_at, attempts, sent_at, payload) VALUES (?1, ?2, ?3, ?4, 0, ?5, ?6)
       ON CONFLICT(email, purpose) DO UPDATE SET code_hash = excluded.code_hash, expires_at = excluded.expires_at, attempts = 0,
         sent_at = excluded.sent_at, payload = COALESCE(excluded.payload, email_codes.payload)`,
    )
    .bind(email, purpose, await hashOf(email, purpose, code), t + TTL, t, payload ?? null)
    .run()
  return code
}

/**
 * Checks a code. Every attempt is counted first (one atomic statement), so parallel guesses cannot beat the limit.
 * A correct code is deleted so it can only be used once. Returns the stored payload on success.
 */
export async function checkCode(email: string, purpose: Purpose, code: string): Promise<{ payload: string | null } | null> {
  const d = await db()
  const row = await d
    .prepare('UPDATE email_codes SET attempts = attempts + 1 WHERE email = ?1 AND purpose = ?2 AND expires_at > ?3 AND attempts < ?4 RETURNING code_hash, payload')
    .bind(email, purpose, nowSec(), MAX_TRIES)
    .first<{ code_hash: string; payload: string | null }>()
  if (!row) return null
  if (!safeEqual(row.code_hash, await hashOf(email, purpose, code))) return null
  await d.prepare('DELETE FROM email_codes WHERE email = ?1 AND purpose = ?2').bind(email, purpose).run()
  return { payload: row.payload }
}
