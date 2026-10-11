import { db } from './db'

export type Range = '24h' | '7d' | '30d' | '90d' | 'all'
export const RANGES: { id: Range; label: string; secs: number }[] = [
  { id: '24h', label: '24 hours', secs: 86400 },
  { id: '7d', label: '7 days', secs: 7 * 86400 },
  { id: '30d', label: '30 days', secs: 30 * 86400 },
  { id: '90d', label: '90 days', secs: 90 * 86400 },
  { id: 'all', label: 'All time', secs: 0 },
]
export const sinceFor = (r: Range, now = Math.floor(Date.now() / 1000)) => {
  const secs = RANGES.find((x) => x.id === r)?.secs ?? 0
  return secs ? now - secs : 0
}

type Row = Record<string, string | number | null>
const all = async (sql: string, ...args: unknown[]) => (await (await db()).prepare(sql).bind(...args).all<Row>()).results
const one = async (sql: string, ...args: unknown[]) => (await (await db()).prepare(sql).bind(...args).first<Row>()) ?? {}

/** Every number on the stats page. `since` is a unix time, or 0 for all time. */
export async function overview(since: number) {
  const day = "strftime('%Y-%m-%d', ts, 'unixepoch')"
  const [totals, series, pages, refs, countries, devices, routes, security, people, signins, errors, slow, business, money] = await Promise.all([
    one(
      `SELECT COUNT(*) AS events,
         SUM(kind = 'pageview') AS pageviews,
         COUNT(DISTINCT CASE WHEN kind = 'pageview' THEN ip_hash END) AS visitors,
         COUNT(DISTINCT CASE WHEN actor IS NOT NULL THEN actor END) AS signedInPeople,
         SUM(kind = 'api') AS api,
         SUM(kind IN ('error', 'clienterror')) AS errors,
         SUM(kind = 'security') AS security,
         SUM(kind = 'auth' AND name = 'signin') AS signins,
         SUM(kind = 'money') AS money,
         SUM(kind = 'admin') AS admin,
         COUNT(DISTINCT CASE WHEN ua = 'bot' THEN ip_hash END) AS bots
       FROM event_log WHERE ts >= ?1`,
      since,
    ),
    all(
      `SELECT ${day} AS d, SUM(kind = 'pageview') AS views, COUNT(DISTINCT CASE WHEN kind = 'pageview' THEN ip_hash END) AS visitors,
         SUM(kind = 'api') AS api, SUM(kind IN ('error','clienterror')) AS errors, SUM(kind = 'security') AS security,
         SUM(kind = 'auth' AND name = 'signin') AS signins
       FROM event_log WHERE ts >= ?1 GROUP BY d ORDER BY d`,
      since,
    ),
    all("SELECT path AS label, COUNT(*) AS n, COUNT(DISTINCT ip_hash) AS u FROM event_log WHERE kind = 'pageview' AND ts >= ?1 GROUP BY path ORDER BY n DESC LIMIT 15", since),
    all("SELECT ref AS label, COUNT(*) AS n FROM event_log WHERE kind = 'pageview' AND ref IS NOT NULL AND ts >= ?1 GROUP BY ref ORDER BY n DESC LIMIT 10", since),
    all("SELECT COALESCE(country, '??') AS label, COUNT(DISTINCT ip_hash) AS n FROM event_log WHERE kind = 'pageview' AND ts >= ?1 GROUP BY country ORDER BY n DESC LIMIT 12", since),
    all("SELECT COALESCE(ua, 'unknown') AS label, COUNT(*) AS n FROM event_log WHERE kind = 'pageview' AND ts >= ?1 GROUP BY ua ORDER BY n DESC LIMIT 10", since),
    all("SELECT name AS label, COUNT(*) AS n, CAST(AVG(ms) AS INTEGER) AS ms, SUM(status >= 400) AS bad FROM event_log WHERE kind IN ('api','error','security') AND method IS NOT NULL AND ts >= ?1 GROUP BY name ORDER BY n DESC LIMIT 15", since),
    all("SELECT name || CASE WHEN detail IS NOT NULL THEN ' · ' || substr(detail, 1, 60) ELSE '' END AS label, COUNT(*) AS n FROM event_log WHERE kind = 'security' AND ts >= ?1 GROUP BY name, substr(detail, 1, 60) ORDER BY n DESC LIMIT 12", since),
    all("SELECT actor AS label, COUNT(*) AS n FROM event_log WHERE actor IS NOT NULL AND ts >= ?1 GROUP BY actor ORDER BY n DESC LIMIT 10", since),
    all(`SELECT ${day} AS d, COUNT(*) AS n FROM event_log WHERE kind = 'auth' AND name = 'signin' AND ts >= ?1 GROUP BY d ORDER BY d`, since),
    all("SELECT name || ' · ' || COALESCE(substr(detail, 1, 80), '') AS label, COUNT(*) AS n FROM event_log WHERE kind IN ('error','clienterror') AND ts >= ?1 GROUP BY name, substr(detail, 1, 80) ORDER BY n DESC LIMIT 10", since),
    all("SELECT name AS label, CAST(AVG(ms) AS INTEGER) AS ms, COUNT(*) AS n FROM event_log WHERE ms IS NOT NULL AND method IS NOT NULL AND ts >= ?1 GROUP BY name HAVING n >= 3 ORDER BY ms DESC LIMIT 8", since),
    one(
      `SELECT
         (SELECT COUNT(*) FROM users) AS users,
         (SELECT COUNT(*) FROM users WHERE created_at >= ?1) AS newUsers,
         (SELECT COUNT(*) FROM users WHERE risk_level != 'low') AS flagged,
         (SELECT COUNT(*) FROM users WHERE status != 'active') AS restricted,
         (SELECT COUNT(*) FROM campaigns) AS campaigns,
         (SELECT COUNT(*) FROM campaigns WHERE status = 'live') AS liveCampaigns,
         (SELECT COUNT(*) FROM submissions WHERE created_at >= ?1) AS clips,
         (SELECT COUNT(*) FROM submissions WHERE status = 'pending') AS pendingClips,
         (SELECT COALESCE(SUM(views_verified), 0) FROM submissions) AS verifiedViews,
         (SELECT COUNT(*) FROM favorites) AS favourites,
         (SELECT COUNT(*) FROM badges_unlocked) AS badges,
         (SELECT COUNT(*) FROM profiles) AS profiles,
         (SELECT COUNT(*) FROM notifications WHERE created_at >= ?1) AS notifications`,
      since,
    ),
    one(
      `SELECT
         (SELECT COALESCE(SUM(amount_cents), 0) FROM topups WHERE status = 'paid' AND paid_at >= ?1) AS paidIn,
         (SELECT COALESCE(SUM(stripe_fee_cents), 0) FROM topups WHERE status = 'paid' AND paid_at >= ?1) AS stripeCosts,
         (SELECT COALESCE(SUM(fee_cents), 0) FROM earnings WHERE created_at >= ?1) AS fees,
         (SELECT COALESCE(SUM(gross_cents), 0) FROM earnings WHERE created_at >= ?1) AS gross,
         (SELECT COALESCE(SUM(net_cents), 0) FROM earnings WHERE created_at >= ?1) AS earned,
         (SELECT COALESCE(SUM(amount_cents), 0) FROM payouts WHERE status = 'sent' AND created_at >= ?1) AS paidOut,
         (SELECT COUNT(*) FROM payouts WHERE created_at >= ?1) AS payouts,
         (SELECT COALESCE(SUM(amount_cents), 0) FROM payouts WHERE status = 'review') AS inReview`,
      since,
    ),
  ])
  return { totals, series, pages, refs, countries, devices, routes, security, people, signins, errors, slow, business, money }
}

export type EventFilters = { since: number; kind?: string; q?: string; status?: string; actor?: string }

export function eventWhere(f: EventFilters) {
  const where = ['ts >= ?1']
  const args: unknown[] = [f.since]
  const add = (sql: string, v: unknown) => {
    args.push(v)
    where.push(sql.replace('?', `?${args.length}`))
  }
  if (f.kind) add('kind = ?', f.kind)
  if (f.status === 'bad') where.push('status >= 400')
  else if (f.status && /^\d{3}$/.test(f.status)) add('status = ?', Number(f.status))
  if (f.actor) add('actor LIKE ?', `%${f.actor.replace(/[%_]/g, '')}%`)
  if (f.q) {
    args.push(`%${f.q.replace(/[%_]/g, '')}%`)
    const n = args.length
    where.push(`(name LIKE ?${n} OR path LIKE ?${n} OR detail LIKE ?${n} OR actor LIKE ?${n})`)
  }
  return { sql: where.join(' AND '), args }
}

export async function events(f: EventFilters, page: number, size = 100) {
  const { sql, args } = eventWhere(f)
  const [rows, count] = await Promise.all([
    all(`SELECT * FROM event_log WHERE ${sql} ORDER BY id DESC LIMIT ${size} OFFSET ${page * size}`, ...args),
    one(`SELECT COUNT(*) AS n FROM event_log WHERE ${sql}`, ...args),
  ])
  return { rows, total: Number(count.n ?? 0) }
}
