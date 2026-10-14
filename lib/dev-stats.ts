import { db } from './db'

export type Check = { key: string; label: string; ok: boolean; detail: string }

const n = async (sql: string) => Number((await (await db()).prepare(sql).first<{ n: number }>())?.n ?? 0)

/** Sanity checks on the money. Every one should be zero: a number above zero means something needs a look. */
export async function integrity(): Promise<Check[]> {
  const [brand, clipper, pool, orphans] = await Promise.all([
    n("SELECT COUNT(*) AS n FROM (SELECT user_id FROM ledger WHERE account = 'brand' GROUP BY user_id HAVING SUM(amount_cents) < 0)"),
    n("SELECT COUNT(*) AS n FROM (SELECT user_id FROM ledger WHERE account = 'clipper' GROUP BY user_id HAVING SUM(amount_cents) < 0)"),
    n("SELECT COUNT(*) AS n FROM (SELECT campaign_id FROM ledger WHERE account = 'campaign' AND campaign_id IS NOT NULL GROUP BY campaign_id HAVING SUM(amount_cents) < 0)"),
    n("SELECT COUNT(*) AS n FROM ledger l LEFT JOIN users u ON u.id = l.user_id WHERE u.id IS NULL"),
  ])
  const row = (key: string, label: string, v: number, bad: string): Check => ({ key, label, ok: v === 0, detail: v === 0 ? 'None' : `${v} ${bad}` })
  return [
    row('brand', 'Brand balances below zero', brand, 'brand accounts are overdrawn'),
    row('clipper', 'Clipper balances below zero', clipper, 'clipper accounts are overdrawn'),
    row('pool', 'Campaign pools below zero', pool, 'campaigns have paid out more than they held'),
    row('orphans', 'Ledger rows with no account', orphans, 'ledger rows point at a missing user'),
  ]
}

export async function recentErrors(limit = 12) {
  const d = await db()
  return (
    await d
      .prepare("SELECT id, ts, kind, name, path, status, substr(detail, 1, 140) AS detail FROM event_log WHERE kind IN ('error','clienterror') ORDER BY id DESC LIMIT ?1")
      .bind(limit)
      .all<{ id: number; ts: number; kind: string; name: string; path: string | null; status: number | null; detail: string | null }>()
  ).results
}
