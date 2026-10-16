import { db, nowSec } from './db'

const key = (id: string) => `goal:${id}`

/** The monthly goal a creator set for themselves, in cents, or null. Private to them. */
export async function getGoal(userId: string): Promise<number | null> {
  try {
    const d = await db()
    const r = await d.prepare('SELECT value FROM settings WHERE key = ?1').bind(key(userId)).first<{ value: string }>()
    const n = Number(r?.value)
    return Number.isFinite(n) && n > 0 ? Math.round(n) : null
  } catch {
    return null
  }
}

export async function setGoal(userId: string, cents: number | null) {
  const d = await db()
  if (cents === null) await d.prepare('DELETE FROM settings WHERE key = ?1').bind(key(userId)).run()
  else
    await d
      .prepare('INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at')
      .bind(key(userId), String(Math.round(cents)), nowSec())
      .run()
}

/** What the creator has earned since the first of this month (UTC). */
export async function earnedThisMonth(userId: string): Promise<number> {
  const now = new Date()
  const start = Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1) / 1000)
  const d = await db()
  const r = await d.prepare('SELECT COALESCE(SUM(net_cents), 0) AS n FROM earnings WHERE clipper_user_id = ?1 AND created_at >= ?2').bind(userId, start).first<{ n: number }>()
  return r?.n ?? 0
}
