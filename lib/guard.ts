import { sha256Hex } from './crypto'
import { db, nowSec, setting } from './db'
import { assertSameOrigin, HttpError } from './http'

export function clientIp(req: Request) {
  return req.headers.get('cf-connecting-ip') ?? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
}

/** A salted hash of the address, so abuse can be matched without storing anyone's IP. */
export async function ipHash(req: Request) {
  const salt = (await setting('AUTH_SECRET')) ?? 'logoless'
  return (await sha256Hex(`${salt}|${clientIp(req)}`)).slice(0, 32)
}

/** Fixed-window counter in D1. Returns the count inside the current window, including this call. */
export async function hit(key: string, windowSec: number) {
  const d = await db()
  const t = nowSec()
  const row = await d
    .prepare(
      `INSERT INTO rate_limits (key, window_start, count) VALUES (?1, ?2, 1)
       ON CONFLICT(key) DO UPDATE SET
         count = CASE WHEN window_start <= ?3 THEN 1 ELSE count + 1 END,
         window_start = CASE WHEN window_start <= ?3 THEN ?2 ELSE window_start END
       RETURNING count`,
    )
    .bind(key, t, t - windowSec)
    .first<{ count: number }>()
  return row?.count ?? 1
}

type Opts = { name: string; max: number; windowSec: number; userId?: string }

/**
 * Standard protection for any route that changes something: same-site check, then a per-address limit
 * (and a per-account limit when we know the account). Throws 403 or 429.
 */
export async function protect(req: Request, o: Opts) {
  assertSameOrigin(req)
  await limit(req, o)
}

export async function limit(req: Request, o: Opts) {
  const ip = await ipHash(req)
  if ((await hit(`${o.name}:ip:${ip}`, o.windowSec)) > o.max) throw new HttpError(429, 'Too many attempts. Please wait a moment and try again.')
  if (o.userId && (await hit(`${o.name}:u:${o.userId}`, o.windowSec)) > o.max) {
    throw new HttpError(429, 'Too many attempts. Please wait a moment and try again.')
  }
}

/** Housekeeping: drop counters that expired long ago. Cheap to call occasionally. */
export async function sweepLimits() {
  const d = await db()
  await d.prepare('DELETE FROM rate_limits WHERE window_start < ?1').bind(nowSec() - 86400).run()
}
