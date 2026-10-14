import { auditSafe } from './chain'
import { db, nowSec, uid } from './db'
import { balances } from './ledger'

export const GRACE_DAYS = 30
export type Choice = 'return' | 'logoless' | 'none'
export type Deletion = { at: number; choice: Choice }

const key = (id: string) => `deletion:${id}`

export async function getDeletion(userId: string): Promise<Deletion | null> {
  const d = await db()
  const r = await d.prepare('SELECT value FROM settings WHERE key = ?1').bind(key(userId)).first<{ value: string }>()
  if (!r) return null
  try {
    return JSON.parse(r.value) as Deletion
  } catch {
    return null
  }
}

export async function scheduleDeletion(userId: string, choice: Choice) {
  const d = await db()
  const t = nowSec()
  await d
    .prepare('INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at')
    .bind(key(userId), JSON.stringify({ at: t, choice } satisfies Deletion), t)
    .run()
}

export async function cancelDeletion(userId: string) {
  const d = await db()
  await d.prepare('DELETE FROM settings WHERE key = ?1').bind(key(userId)).run()
}

/**
 * Permanently removes everything personal about an account whose 30 days are up. What is left of their balance goes where they
 * chose: back into the pools of the campaigns it came from, or to logoless. Money records stay (without a name), because the books
 * have to balance.
 */
export async function purgeAccount(userId: string, d0: Deletion) {
  const d = await db()
  const t = nowSec()
  const b = await balances(userId)
  const left = b.available + b.pending
  let kept = left
  if (left > 0 && d0.choice === 'return') {
    const per = (await d.prepare("SELECT campaign_id, SUM(amount_cents) AS e FROM ledger WHERE user_id = ?1 AND account = 'clipper' AND kind = 'earning' AND campaign_id IS NOT NULL GROUP BY campaign_id").bind(userId).all<{ campaign_id: string; e: number }>()).results
    const total = per.reduce((s, r) => s + r.e, 0)
    let rest = left
    for (let i = 0; i < per.length; i++) {
      const share = i === per.length - 1 ? rest : Math.floor((left * per[i].e) / Math.max(1, total))
      rest -= share
      if (share <= 0) continue
      const owner = await d.prepare('SELECT brand_user_id FROM campaigns WHERE id = ?1').bind(per[i].campaign_id).first<{ brand_user_id: string | null }>()
      if (!owner?.brand_user_id) continue
      await d.batch([
        d.prepare("INSERT OR IGNORE INTO ledger (id, user_id, account, kind, amount_cents, available_at, ref, note, created_at, campaign_id) VALUES (?1, ?2, 'clipper', 'deletion_return', ?3, ?4, ?5, 'Account deleted: returned to the campaign', ?4, ?6)").bind(uid(), userId, -share, t, `del-out:${userId}:${per[i].campaign_id}`, per[i].campaign_id),
        d.prepare("INSERT OR IGNORE INTO ledger (id, user_id, account, kind, amount_cents, available_at, ref, note, created_at, campaign_id) VALUES (?1, ?2, 'campaign', 'deletion_return', ?3, ?4, ?5, 'Returned from a deleted account', ?4, ?6)").bind(uid(), owner.brand_user_id, share, t, `del-in:${userId}:${per[i].campaign_id}`, per[i].campaign_id),
      ])
      kept -= share
    }
  }
  // Whatever was not sent back (they chose logoless, or a campaign has no owner to return it to) is kept by logoless.
  if (kept > 0)
    await d.prepare("INSERT OR IGNORE INTO ledger (id, user_id, account, kind, amount_cents, available_at, ref, note, created_at) VALUES (?1, ?2, 'clipper', 'deletion_forfeit', ?3, ?4, ?5, 'Account deleted: kept by logoless', ?4)").bind(uid(), userId, -kept, t, `del-forfeit:${userId}`).run()
  const email = (await d.prepare('SELECT email FROM users WHERE id = ?1').bind(userId).first<{ email: string }>())?.email ?? ''
  await d.batch([
    d.prepare('DELETE FROM credentials WHERE user_id = ?1').bind(userId),
    d.prepare('DELETE FROM profiles WHERE user_id = ?1').bind(userId),
    d.prepare('DELETE FROM favorites WHERE user_id = ?1').bind(userId),
    d.prepare('DELETE FROM notifications WHERE user_id = ?1').bind(userId),
    d.prepare('DELETE FROM uploads WHERE user_id = ?1').bind(userId),
    d.prepare('DELETE FROM badges_unlocked WHERE user_id = ?1').bind(userId),
    d.prepare("DELETE FROM settings WHERE key IN (?1, ?2)").bind(`paypal:${userId}`, key(userId)),
    d.prepare("UPDATE users SET email = ?2, name = NULL, image = NULL, status = 'banned' WHERE id = ?1").bind(userId, `deleted-${userId}@deleted.invalid`),
  ])
  await auditSafe({ id: null, email: 'system' }, 'account.purged', userId, `choice ${d0.choice}, ${left} cents, was ${email.replace(/^(.).*(@.*)$/, '$1***$2')}`)
}

/** Finds every account whose 30 days are up and removes it. Safe to run any number of times. */
export async function purgeDue() {
  const d = await db()
  const cutoff = nowSec() - GRACE_DAYS * 86400
  const rows = (await d.prepare("SELECT key, value FROM settings WHERE key LIKE 'deletion:%'").all<{ key: string; value: string }>()).results
  let n = 0
  const failed: string[] = []
  for (const r of rows) {
    try {
      const del = JSON.parse(r.value) as Deletion
      if (del.at <= cutoff) {
        const id = r.key.slice('deletion:'.length)
        const blocked = await deletionBlocker(id)
        if (blocked) {
          failed.push(`${id}: ${blocked}`.slice(0, 200))
          continue
        }
        await purgeAccount(id, del)
        n++
      }
    } catch (e) {
      // A row that fails is left alone for a person to look at; the rest still run.
      const why = e instanceof Error ? e.message : String(e)
      console.error('account purge failed', r.key, why)
      failed.push(`${r.key.slice('deletion:'.length)}: ${why}`.slice(0, 200))
    }
  }
  return { removed: n, failed }
}

/**
 * Money or work that has to be sorted out by a person before an account can be deleted, or null when it is safe. A brand's balance
 * and running campaigns are real money, and a waiting withdrawal is not finished: deleting around them would lose it.
 */
export async function deletionBlocker(userId: string): Promise<string | null> {
  const d = await db()
  const b = await balances(userId)
  if (b.brand > 0) return `This account still has $${(b.brand / 100).toFixed(2)} in its brand balance. Refund it in PayPal and bring the balance to zero first.`
  const camp = await d.prepare("SELECT COUNT(*) AS n FROM campaigns WHERE brand_user_id = ?1 AND status IN ('awaiting_payment','paid','live','paused')").bind(userId).first<{ n: number }>()
  if ((camp?.n ?? 0) > 0) return 'This account has campaigns that are not finished. End them, and refund what is left in their pools, first.'
  const pay = await d.prepare("SELECT COUNT(*) AS n FROM payouts WHERE user_id = ?1 AND status IN ('pending','review')").bind(userId).first<{ n: number }>()
  if ((pay?.n ?? 0) > 0) return 'A withdrawal for this account is still waiting. Approve or decline it first.'
  return null
}
