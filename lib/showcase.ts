import { db, nowSec } from './db'
import { isTrusted, levelFor } from './growth-shared'
import { avatarSrc } from './looks'
import { toView } from './profile'
import { CLIPPING_PLATFORMS, type ProfileView } from './profile-style'

/**
 * Creators as brands see them: the directory and the media kit. Only people whose page is public, only the numbers they chose to show, and
 * only clips that are approved. Nothing here shows more than the person's own profile page already does.
 */
export type Creator = {
  userId: string
  handle: string
  name: string
  avatar: string
  bio: string
  accent: string
  platforms: string[]
  views: number | null
  clips: number | null
  earnedCents: number | null
  approved: number
  level: string | null
  trusted: boolean
  joinedAt: number
  view: ProfileView
}

type Agg = { user_id: string; views: number; approved: number; rejected: number; earned: number }

async function aggregates(ids: string[]): Promise<Map<string, Agg>> {
  const out = new Map<string, Agg>()
  if (!ids.length) return out
  const d = await db()
  const marks = ids.map((_, i) => `?${i + 1}`).join(',')
  const rows = (
    await d
      .prepare(
        `SELECT user_id, COALESCE(SUM(views_verified), 0) AS views,
           COUNT(CASE WHEN status = 'approved' THEN 1 END) AS approved,
           COUNT(CASE WHEN status = 'rejected' THEN 1 END) AS rejected,
           COALESCE(SUM(earned_cents), 0) AS earned
         FROM submissions WHERE user_id IN (${marks}) GROUP BY user_id`,
      )
      .bind(...ids)
      .all<Agg>()
  ).results
  for (const r of rows) out.set(r.user_id, r)
  return out
}

function shape(v: ProfileView, userId: string, a: Agg | undefined): Creator {
  const show = v.show
  const hidden = v.extras.privacy.hiddenLinks
  const platforms = show.links ? [...new Set(v.links.filter((l) => CLIPPING_PLATFORMS.includes(l.platform) && !hidden.includes(l.platform)).map((l) => l.platform))] : []
  const views = a?.views ?? 0
  return {
    userId,
    handle: v.handle,
    name: v.displayName,
    avatar: v.avatar ?? avatarSrc(null, v.displayName, v.handle),
    bio: v.bio,
    accent: v.accent,
    platforms,
    views: show.views ? views : null,
    clips: show.clips ? (a?.approved ?? 0) : null,
    earnedCents: show.earnings ? (a?.earned ?? 0) : null,
    approved: a?.approved ?? 0,
    level: show.views ? levelFor(views).level.name : null,
    trusted: isTrusted({ approved: a?.approved ?? 0, rejected: a?.rejected ?? 0 }),
    joinedAt: v.joinedAt,
    view: v,
  }
}

/** One creator by handle, or null when the page is not public, the account is not in good standing, or there is nothing approved yet. */
export async function publicCreator(handle: string): Promise<Creator | null> {
  const d = await db()
  const row = await d
    .prepare('SELECT p.*, u.role AS role, u.status AS status FROM profiles p JOIN users u ON u.id = p.user_id WHERE p.handle = ?1')
    .bind(handle.toLowerCase())
    .first<Record<string, unknown> & { user_id: string; role: string; status: string }>()
  if (!row || row.status !== 'active') return null
  const v = toView(row as never, row.role === 'admin')
  if (v.extras.privacy.profile !== 'public') return null
  const a = (await aggregates([row.user_id])).get(row.user_id)
  return shape(v, row.user_id, a)
}

export type DirectoryQuery = { platform?: string | null; sort?: 'views' | 'new' | 'trusted'; q?: string | null }

/** The directory: public creators with at least one approved clip. Up to 60, sorted as asked. */
export async function directory(q: DirectoryQuery): Promise<Creator[]> {
  const d = await db()
  const rows = (
    await d
      .prepare(
        `SELECT p.*, u.role AS role FROM profiles p JOIN users u ON u.id = p.user_id
         WHERE u.status = 'active' AND u.email NOT LIKE 'deleted-%@deleted.invalid'
           AND EXISTS (SELECT 1 FROM submissions s WHERE s.user_id = p.user_id AND s.status = 'approved')
         ORDER BY u.last_seen_at DESC LIMIT 240`,
      )
      .all<Record<string, unknown> & { user_id: string; role: string }>()
  ).results
  const views = rows.map((r) => toView(r as never, r.role === 'admin')).map((v, i) => ({ v, id: rows[i].user_id })).filter((x) => x.v.extras.privacy.profile === 'public')
  const agg = await aggregates(views.map((x) => x.id))
  let list = views.map((x) => shape(x.v, x.id, agg.get(x.id)))
  if (q.platform) list = list.filter((c) => c.platforms.includes(q.platform as string))
  const needle = (q.q ?? '').trim().toLowerCase()
  if (needle) list = list.filter((c) => `${c.name} ${c.handle} ${c.bio}`.toLowerCase().includes(needle))
  list.sort((a, b) => (q.sort === 'new' ? b.joinedAt - a.joinedAt : q.sort === 'trusted' ? Number(b.trusted) - Number(a.trusted) || b.approved - a.approved : (b.views ?? -1) - (a.views ?? -1) || b.approved - a.approved))
  return list.slice(0, 60)
}

export type TopClip = { id: string; url: string; platform: string; views: number; campaign: string; at: number }

/** A creator's best approved clips by verified views, for the media kit. */
export async function topClipsOf(userId: string, limit = 4): Promise<TopClip[]> {
  const d = await db()
  return (
    await d
      .prepare("SELECT s.id, s.url, s.platform, s.views_verified AS views, c.title AS campaign, s.created_at AS at FROM submissions s JOIN campaigns c ON c.id = s.campaign_id WHERE s.user_id = ?1 AND s.status = 'approved' ORDER BY s.views_verified DESC LIMIT ?2")
      .bind(userId, limit)
      .all<TopClip>()
  ).results
}

/** What was paid out in the last day, with no names: for the live ticker on the home page. Amounts are rounded down to whole dollars. */
export async function recentPaid(limit = 12): Promise<{ dollars: number; campaign: string; at: number }[]> {
  const d = await db()
  return (
    await d
      .prepare(
        `SELECT CAST(e.net_cents / 100 AS INTEGER) AS dollars, COALESCE(c.title, e.campaign, 'a campaign') AS campaign, e.created_at AS at
         FROM earnings e LEFT JOIN campaigns c ON c.id = e.campaign_id
         WHERE e.created_at > ?1 AND e.net_cents >= 100 AND COALESCE(c.admin_note, '') != 'sample' AND COALESCE(c.id, '') NOT LIKE 'mock-%'
         ORDER BY e.created_at DESC LIMIT ?2`,
      )
      .bind(nowSec() - 86400, limit)
      .all<{ dollars: number; campaign: string; at: number }>()
  ).results
}
