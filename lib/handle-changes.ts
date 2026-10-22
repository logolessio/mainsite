import { db, nowSec } from './db'
import { HANDLE_CHANGES_PER_WEEK, HANDLE_WINDOW_SEC, type HandleQuota, type HandleChange, waitWords } from './handle-shared'
import { HttpError } from './http'

export { HANDLE_CHANGES_PER_WEEK, HANDLE_WINDOW_SEC, waitWords }
export type { HandleQuota }

/**
 * Changing a username is allowed twice in any seven days (admins are not held to it). Each change is written to a short log in the
 * settings table, `handle-log:<user id>`, so this works without a migration. Setting a first username (during onboarding or an invite)
 * is not a change and is never logged.
 */
const keyFor = (userId: string) => `handle-log:${userId}`

async function readLog(userId: string): Promise<HandleChange[]> {
  try {
    const d = await db()
    const r = await d.prepare('SELECT value FROM settings WHERE key = ?1').bind(keyFor(userId)).first<{ value: string }>()
    const list = JSON.parse(r?.value ?? '[]')
    return Array.isArray(list) ? (list as HandleChange[]).filter((e) => typeof e?.at === 'number') : []
  } catch {
    return []
  }
}

export async function handleQuota(userId: string, isAdmin = false): Promise<HandleQuota> {
  const t = nowSec()
  const log = await readLog(userId)
  const recent = log.filter((e) => e.at > t - HANDLE_WINDOW_SEC).sort((a, b) => a.at - b.at)
  const used = recent.length
  const left = isAdmin ? HANDLE_CHANGES_PER_WEEK : Math.max(0, HANDLE_CHANGES_PER_WEEK - used)
  // the change that frees up the next slot is the oldest of the ones still counting
  const nextAt = left > 0 ? null : recent[used - HANDLE_CHANGES_PER_WEEK].at + HANDLE_WINDOW_SEC
  const last = log.length ? log.reduce((a, b) => (b.at > a.at ? b : a)) : null
  return { max: HANDLE_CHANGES_PER_WEEK, used: isAdmin ? 0 : used, left, nextAt, last }
}

export async function assertCanChangeHandle(userId: string, isAdmin: boolean) {
  const q = await handleQuota(userId, isAdmin)
  if (q.left > 0) return q
  throw new HttpError(429, `You can change your username twice a week, and both changes are used. You can change it again in ${waitWords((q.nextAt ?? nowSec()) - nowSec())}.`)
}

export async function recordHandleChange(userId: string, from: string, to: string) {
  try {
    const d = await db()
    const t = nowSec()
    const log = [{ at: t, from, to }, ...(await readLog(userId))].slice(0, 20)
    await d
      .prepare('INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at')
      .bind(keyFor(userId), JSON.stringify(log), t)
      .run()
  } catch {
    /* a log that cannot be written must never undo a username that was changed */
  }
}

/** Three nearby usernames that are free right now, for when the one that was asked for is taken. */
export async function freeAlternatives(wanted: string, loose: boolean): Promise<string[]> {
  const base = wanted.replace(/[^a-z0-9_.-]/g, '').replace(/^[.-]+|[.-]+$/g, '').slice(0, 16)
  if (base.length < 1) return []
  const n = () => Math.floor(10 + Math.random() * 90)
  const sep = loose ? ['.', '_', '-'] : ['_']
  const pool = [`${base}_${n()}`.slice(0, 20), `the${base}`.slice(0, 20), `${base}${n()}`.slice(0, 20), `${base}${sep[Math.floor(Math.random() * sep.length)]}x`.slice(0, 20), `real${base}`.slice(0, 20), `${base}${new Date().getFullYear() % 100}`.slice(0, 20)]
  const unique = [...new Set(pool)].filter((h) => h !== wanted && h.length >= 1)
  try {
    const d = await db()
    const marks = unique.map((_, i) => `?${i + 1}`).join(',')
    const taken = new Set((await d.prepare(`SELECT handle FROM profiles WHERE handle IN (${marks})`).bind(...unique).all<{ handle: string }>()).results.map((r) => r.handle))
    return unique.filter((h) => !taken.has(h)).slice(0, 3)
  } catch {
    return []
  }
}
