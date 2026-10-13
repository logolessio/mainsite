import { BADGES, BADGE_BY_ID } from './badges-defs'
import { db, nowSec } from './db'
import { notify } from './notify'

type Facts = {
  clips: number
  approved: number
  views: number
  earned: number
  favs: number
  launched: number
  joined: number
  rank: number
  badges: number
  hasBio: number
  hasLink: number
  equipped: number
  banner_changed: number
  dots_changed: number
  accent_changed: number
  font_changed: number
}

const RULES: Record<string, (f: Facts) => boolean> = {
  'first-clip': (f) => f.clips >= 1,
  'clip-10': (f) => f.clips >= 10,
  'clip-50': (f) => f.clips >= 50,
  'clip-250': (f) => f.clips >= 250,
  'first-approved': (f) => f.approved >= 1,
  'approved-25': (f) => f.approved >= 25,
  'views-1k': (f) => f.views >= 1_000,
  'views-100k': (f) => f.views >= 100_000,
  'views-1m': (f) => f.views >= 1_000_000,
  'first-earn': (f) => f.earned > 0,
  'earn-1k': (f) => f.earned >= 100_000,
  banner: (f) => f.banner_changed >= 1,
  palette: (f) => f.dots_changed >= 1,
  accent: (f) => f.accent_changed >= 1,
  typeface: (f) => f.font_changed >= 1,
  bio: (f) => f.hasBio >= 1,
  linked: (f) => f.hasLink >= 1,
  collector: (f) => f.favs >= 5,
  showcase: (f) => f.equipped >= 5,
  week: (f) => nowSec() - f.joined >= 7 * 86400,
  month: (f) => nowSec() - f.joined >= 30 * 86400,
  founding: (f) => f.rank <= 100,
  launched: (f) => f.launched >= 1,
  completionist: (f) => f.badges >= 10,
}

/** Counts an action, such as "banner_changed". Used for badges that depend on something you did once. */
export async function bump(userId: string, event: string) {
  const d = await db()
  await d
    .prepare('INSERT INTO user_events (user_id, event, count) VALUES (?1, ?2, 1) ON CONFLICT(user_id, event) DO UPDATE SET count = count + 1')
    .bind(userId, event)
    .run()
}

async function facts(userId: string): Promise<Facts> {
  const d = await db()
  const [f, events] = await Promise.all([
    d
      .prepare(
        `SELECT
           (SELECT COUNT(*) FROM submissions WHERE user_id = ?1) AS clips,
           (SELECT COUNT(*) FROM submissions WHERE user_id = ?1 AND status = 'approved') AS approved,
           (SELECT COALESCE(SUM(views_verified), 0) FROM submissions WHERE user_id = ?1) AS views,
           (SELECT COALESCE(SUM(amount_cents), 0) FROM ledger WHERE user_id = ?1 AND account = 'clipper' AND kind = 'earning') AS earned,
           (SELECT COUNT(*) FROM favorites WHERE user_id = ?1) AS favs,
           (SELECT COUNT(*) FROM campaigns WHERE brand_user_id = ?1 AND status IN ('live', 'paused', 'ended')) AS launched,
           (SELECT created_at FROM users WHERE id = ?1) AS joined,
           (SELECT COUNT(*) FROM users WHERE created_at <= (SELECT created_at FROM users WHERE id = ?1)) AS rank,
           (SELECT COUNT(*) FROM badges_unlocked WHERE user_id = ?1 AND badge_id != 'completionist') AS badges,
           (SELECT CASE WHEN LENGTH(bio) > 0 THEN 1 ELSE 0 END FROM profiles WHERE user_id = ?1) AS hasBio,
           (SELECT CASE WHEN links_json != '[]' THEN 1 ELSE 0 END FROM profiles WHERE user_id = ?1) AS hasLink,
           (SELECT json_array_length(badges_json) FROM profiles WHERE user_id = ?1) AS equipped`,
      )
      .bind(userId)
      .first<Facts>(),
    d.prepare('SELECT event, count FROM user_events WHERE user_id = ?1').bind(userId).all<{ event: string; count: number }>(),
  ])
  const ev = Object.fromEntries(events.results.map((r) => [r.event, r.count]))
  return {
    ...(f as Facts),
    banner_changed: ev.banner_changed ?? 0,
    dots_changed: ev.dots_changed ?? 0,
    accent_changed: ev.accent_changed ?? 0,
    font_changed: ev.font_changed ?? 0,
  }
}

/** Unlocks anything newly earned and tells the person. Safe to call as often as you like. */
export async function evaluateBadges(userId: string) {
  const d = await db()
  const f = await facts(userId)
  const have = new Set((await d.prepare('SELECT badge_id FROM badges_unlocked WHERE user_id = ?1').bind(userId).all<{ badge_id: string }>()).results.map((r) => r.badge_id))
  const fresh: string[] = []
  // Two passes so "unlock 10 badges" can count ones earned in this same run.
  for (let pass = 0; pass < 2; pass++) {
    for (const b of BADGES) {
      if (have.has(b.id) || !RULES[b.id]?.(f)) continue
      const res = await d
        .prepare('INSERT OR IGNORE INTO badges_unlocked (user_id, badge_id, unlocked_at) VALUES (?1, ?2, ?3)')
        .bind(userId, b.id, nowSec())
        .run()
      have.add(b.id)
      if (res.meta.changes === 1) {
        fresh.push(b.id)
        if (b.id !== 'completionist') f.badges++
      }
    }
  }
  for (const id of fresh) {
    const b = BADGE_BY_ID[id]
    await notify(userId, { kind: 'badge', title: `Badge unlocked: ${b.name}`, body: b.how, href: '/dashboard/achievements', dedupe: `badge:${id}` })
  }
  return fresh
}

export async function unlockedBadges(userId: string) {
  const d = await db()
  return (await d.prepare('SELECT badge_id, unlocked_at FROM badges_unlocked WHERE user_id = ?1').bind(userId).all<{ badge_id: string; unlocked_at: number }>()).results
}
