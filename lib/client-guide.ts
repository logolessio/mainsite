import { db, nowSec } from './db'

/**
 * What a client has already been shown: the dashboard walkthrough and the guide for a first submission.
 * One small row each in the settings table, so it is remembered on every device.
 */
export const GUIDE_KEYS = { tour: 'tour-seen', 'first-submission': 'first-sub-seen' } as const
export type GuideKey = keyof typeof GUIDE_KEYS

const rowKey = (key: GuideKey, userId: string) => `${GUIDE_KEYS[key]}:${userId}`

/** Which guides this person has seen. Anything that fails reads as "seen", so nobody is shown a guide twice by mistake. */
export async function guidesSeen(userId: string): Promise<Record<GuideKey, boolean>> {
  try {
    const d = await db()
    const rows = (await d.prepare('SELECT key FROM settings WHERE key IN (?1, ?2)').bind(rowKey('tour', userId), rowKey('first-submission', userId)).all<{ key: string }>()).results
    const has = new Set(rows.map((r) => r.key))
    return { tour: has.has(rowKey('tour', userId)), 'first-submission': has.has(rowKey('first-submission', userId)) }
  } catch {
    return { tour: true, 'first-submission': true }
  }
}

export async function markGuideSeen(userId: string, key: GuideKey) {
  const d = await db()
  await d
    .prepare("INSERT INTO settings (key, value, updated_at) VALUES (?1, '1', ?2) ON CONFLICT(key) DO UPDATE SET updated_at = excluded.updated_at")
    .bind(rowKey(key, userId), nowSec())
    .run()
}

/** How many submissions have ever been made for this client's campaigns (turned down and removed ones too). */
export async function submissionsEver(userId: string) {
  try {
    const d = await db()
    const r = await d.prepare('SELECT COUNT(*) AS n FROM submissions WHERE campaign_id IN (SELECT id FROM campaigns WHERE brand_user_id = ?1)').bind(userId).first<{ n: number }>()
    return r?.n ?? 0
  } catch {
    return 0
  }
}
