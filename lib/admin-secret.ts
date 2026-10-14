import { db, nowSec } from './db'
import { hit } from './guard'
import { HttpError } from './http'
import { hashPassword, passwordProblem, verifyPassword } from './password'

/**
 * A second password for the things that could hurt the company: pausing every withdrawal or sign-up, changing money limits,
 * deleting an account, giving someone a role. It is separate from how an admin signs in (Google, Discord or email), so a stolen
 * session alone cannot do any of it. It is stored as a salted hash and never shown.
 */
const key = (userId: string) => `admin-secret:${userId}`

export async function adminSecretSet(userId: string) {
  const d = await db()
  return Boolean(await d.prepare('SELECT 1 AS x FROM settings WHERE key = ?1').bind(key(userId)).first())
}

export async function setAdminSecret(userId: string, email: string, next: string, current?: string) {
  const d = await db()
  const row = await d.prepare('SELECT value FROM settings WHERE key = ?1').bind(key(userId)).first<{ value: string }>()
  if (row) {
    if (!current || !(await verifyPassword(current, row.value))) throw new HttpError(403, 'Your current admin password is not right.')
  }
  const problem = await passwordProblem(next, email)
  if (problem) throw new HttpError(400, problem)
  const hash = await hashPassword(next)
  await d
    .prepare('INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at')
    .bind(key(userId), hash, nowSec())
    .run()
}

/** Throws unless `secret` is this admin's password. Eight wrong tries in 15 minutes locks it for a while. */
export async function requireAdminSecret(userId: string, secret: unknown) {
  const d = await db()
  const row = await d.prepare('SELECT value FROM settings WHERE key = ?1').bind(key(userId)).first<{ value: string }>()
  if (!row) throw new HttpError(428, 'Set your admin password first (Admin > System > Security), then try again.')
  if ((await hit(`admin-secret:${userId}`, 900)) > 8) throw new HttpError(429, 'Too many wrong passwords. Wait a few minutes and try again.')
  if (typeof secret !== 'string' || !secret || !(await verifyPassword(secret, row.value))) throw new HttpError(428, 'That admin password is not right.')
}
