import { headers } from 'next/headers'
import { db, nowSec } from './db'
import { featureOn } from './features'

/** How many accounts one network address may make. */
export const MAX_ACCOUNTS_PER_IP = 3

/** Addresses that say nothing about a person: a developer's machine, or no address at all. */
const NOT_AN_ADDRESS = new Set(['', 'unknown', '::1', '127.0.0.1', '::ffff:127.0.0.1'])

/** The address of the request being handled, or null when there is none (a script, a build) or it is not worth keeping. */
export async function requestIp(): Promise<string | null> {
  try {
    const h = await headers()
    const ip = (h.get('cf-connecting-ip') ?? h.get('x-forwarded-for')?.split(',')[0] ?? '').trim().slice(0, 64)
    return NOT_AN_ADDRESS.has(ip) ? null : ip
  } catch {
    return null
  }
}

/** How many live accounts were made from this address. Deleted accounts do not count. Zero when the table has not been made yet. */
export async function accountsFromIp(ip: string): Promise<number> {
  try {
    const d = await db()
    const r = await d
      .prepare("SELECT COUNT(*) AS n FROM signup_ips s JOIN users u ON u.id = s.user_id WHERE s.ip = ?1 AND u.email NOT LIKE 'deleted-%@deleted.invalid'")
      .bind(ip)
      .first<{ n: number }>()
    return r?.n ?? 0
  } catch {
    return 0
  }
}

/** Is a new account from here over the limit? Only when the `account-ip-limit` switch is on, so it can be tried before it is pushed. */
export async function overIpLimit(): Promise<boolean> {
  try {
    if (!(await featureOn('account-ip-limit'))) return false
    const ip = await requestIp()
    return ip ? (await accountsFromIp(ip)) >= MAX_ACCOUNTS_PER_IP : false
  } catch {
    return false
  }
}

/** Writes down where a new account was made from. Always on; never in the way of making the account. */
export async function recordSignupIp(userId: string): Promise<void> {
  try {
    const ip = await requestIp()
    if (!ip) return
    const d = await db()
    await d.prepare('INSERT OR IGNORE INTO signup_ips (user_id, ip, created_at) VALUES (?1, ?2, ?3)').bind(userId, ip, nowSec()).run()
  } catch {
    /* the table is not there yet, or no database: the account is still made */
  }
}

/** The other live accounts made from the same address as this one, for the team to look at. */
export async function sameIpAccounts(userId: string): Promise<{ ip: string | null; others: { id: string; email: string }[] }> {
  try {
    const d = await db()
    const mine = await d.prepare('SELECT ip FROM signup_ips WHERE user_id = ?1').bind(userId).first<{ ip: string }>()
    if (!mine) return { ip: null, others: [] }
    const rows = (
      await d
        .prepare("SELECT u.id, u.email FROM signup_ips s JOIN users u ON u.id = s.user_id WHERE s.ip = ?1 AND s.user_id != ?2 AND u.email NOT LIKE 'deleted-%@deleted.invalid' LIMIT 20")
        .bind(mine.ip, userId)
        .all<{ id: string; email: string }>()
    ).results
    return { ip: mine.ip, others: rows }
  } catch {
    return { ip: null, others: [] }
  }
}

/** The accounts that share a network address with at least one other live account, for the People page. Empty when the table is not there yet. */
export async function sharedIpUserIds(): Promise<string[]> {
  try {
    const d = await db()
    const rows = (
      await d
        .prepare(
          `SELECT s.user_id AS id FROM signup_ips s JOIN users u ON u.id = s.user_id
           WHERE u.email NOT LIKE 'deleted-%@deleted.invalid'
             AND s.ip IN (SELECT s2.ip FROM signup_ips s2 JOIN users u2 ON u2.id = s2.user_id WHERE u2.email NOT LIKE 'deleted-%@deleted.invalid' GROUP BY s2.ip HAVING COUNT(*) > 1)
           LIMIT 200`,
        )
        .all<{ id: string }>()
    ).results
    return rows.map((r) => r.id)
  } catch {
    return []
  }
}
