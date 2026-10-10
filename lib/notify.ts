import { db, nowSec, uid } from './db'

/**
 * In-app notifications. Only things that directly affect the person are created, and each event can only
 * notify a person once (the dedupe key), so nobody is spammed by a retry or a repeated action.
 */
export type NotifyKind = 'badge' | 'submission' | 'payout' | 'campaign' | 'favorite' | 'account' | 'earning'

export async function notify(
  userId: string,
  n: { kind: NotifyKind; title: string; body?: string; href?: string; dedupe: string },
) {
  try {
    const d = await db()
    await d
      .prepare(
        `INSERT OR IGNORE INTO notifications (id, user_id, kind, title, body, href, dedupe_key, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
      )
      .bind(uid(), userId, n.kind, n.title.slice(0, 120), (n.body ?? '').slice(0, 240), n.href ?? null, n.dedupe.slice(0, 120), nowSec())
      .run()
  } catch (e) {
    // A failed notification must never break the action that caused it.
    console.error('notify failed', e instanceof Error ? e.message : e)
  }
}

/** Tells everyone who favourited a campaign that something changed on it. */
export async function notifyFavoriters(campaignId: string, n: { title: string; body?: string; dedupe: string }) {
  try {
    const d = await db()
    const t = nowSec()
    await d
      .prepare(
        `INSERT OR IGNORE INTO notifications (id, user_id, kind, title, body, href, dedupe_key, created_at)
         SELECT lower(hex(randomblob(16))), f.user_id, 'favorite', ?2, ?3, ?4, ?5, ?6 FROM favorites f WHERE f.campaign_id = ?1`,
      )
      .bind(campaignId, n.title.slice(0, 120), (n.body ?? '').slice(0, 240), `/campaign/${campaignId}`, `${n.dedupe}`.slice(0, 120), t)
      .run()
  } catch (e) {
    console.error('notifyFavoriters failed', e instanceof Error ? e.message : e)
  }
}

export async function unreadCount(userId: string) {
  const d = await db()
  const r = await d.prepare('SELECT COUNT(*) AS n FROM notifications WHERE user_id = ?1 AND read_at IS NULL').bind(userId).first<{ n: number }>()
  return r?.n ?? 0
}

/** Tells every admin something needs their attention (a campaign was paid, a withdrawal is waiting). */
export async function notifyAdmins(n: { title: string; body?: string; href?: string; dedupe: string }) {
  try {
    const d = await db()
    await d
      .prepare(
        `INSERT OR IGNORE INTO notifications (id, user_id, kind, title, body, href, dedupe_key, created_at)
         SELECT lower(hex(randomblob(16))), u.id, 'account', ?1, ?2, ?3, ?4, ?5 FROM users u WHERE u.role = 'admin'`,
      )
      .bind(n.title.slice(0, 120), (n.body ?? '').slice(0, 240), n.href ?? null, n.dedupe.slice(0, 120), nowSec())
      .run()
  } catch (e) {
    console.error('notifyAdmins failed', e instanceof Error ? e.message : e)
  }
}
