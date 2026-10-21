import { BAYES, thumbFor } from './clip-feed'
import { postId } from './clip-embed'
import { db, nowSec } from './db'
import { avatarSrc } from './looks'

/**
 * Everything on /stats: the totals and the leaderboards, for this week, this month or all time. A person is only ever listed by a number
 * they chose to make public on their profile (views, earnings, submissions made), and clips only from people who let the feed show them.
 * Campaigns and artists are public already, so they are ranked by everyone's clips added together.
 */
export type StatsRange = 'week' | 'month' | 'all'
export const STATS_RANGES: { id: StatsRange; label: string; days: number | null }[] = [
  { id: 'week', label: 'This week', days: 7 },
  { id: 'month', label: 'This month', days: 30 },
  { id: 'all', label: 'All time', days: null },
]
export const isRange = (r: unknown): r is StatsRange => STATS_RANGES.some((x) => x.id === r)

export type Person = { handle: string; name: string; avatar: string | null; value: number; clips: number }
export type ClipStat = { id: string; platform: string; thumb: string | null; title: string | null; views: number; avg: number; ratings: number; campaign: string; by: { handle: string; name: string; avatar: string | null } }
export type CampaignStat = { id: string; title: string; creator: string; cover: string; views: number; clips: number; clippers: number; status: string }
export type ArtistStat = { name: string; cover: string; views: number; campaigns: number; clips: number }

export type Board = {
  range: StatsRange
  totals: { views: number; clips: number; clippers: number; campaigns: number; paidCents: number; ratings: number; liveCampaigns: number }
  views: Person[]
  earners: Person[]
  clippers: Person[]
  clips: ClipStat[]
  rated: ClipStat[]
  campaigns: CampaignStat[]
  artists: ArtistStat[]
}

/** "Has this person made that number public?" `def` is what applies when they never chose (views and earnings start hidden, submissions shown). */
const shows = (key: string, def: 0 | 1) => `(CASE WHEN json_valid(p.show_json) THEN COALESCE(json_extract(p.show_json, '$.${key}'), ${def}) ELSE ${def} END) = 1`

const BASE = `FROM submissions s JOIN users u ON u.id = s.user_id JOIN profiles p ON p.user_id = s.user_id JOIN campaigns c ON c.id = s.campaign_id
  LEFT JOIN clip_meta m ON m.submission_id = s.id`
const APPROVED = "s.status = 'approved' AND u.status = 'active'"
const VIEWS = 'MAX(s.views_verified, COALESCE(m.views, 0))'

type PersonRow = { handle: string; display_name: string; avatar_key: string | null; value: number; clips: number }
type ClipRow = { id: string; platform: string; url: string; thumb: string | null; fetched_at: number | null; embed_id: string | null; title: string | null; views: number; n: number | null; total: number | null; c_title: string; handle: string; display_name: string; avatar_key: string | null }

const person = (r: PersonRow): Person => ({ handle: r.handle, name: r.display_name, avatar: avatarSrc(r.avatar_key, r.display_name, r.handle), value: r.value ?? 0, clips: r.clips ?? 0 })
const clip = (r: ClipRow): ClipStat => {
  const yt = r.platform === 'youtube' ? (r.embed_id ?? postId('youtube', r.url)) : null
  const n = r.n ?? 0
  return {
    id: r.id,
    platform: r.platform,
    thumb: thumbFor(r.platform, r.id, r.thumb, r.fetched_at) ?? (yt ? `https://i.ytimg.com/vi/${yt}/hqdefault.jpg` : null),
    title: r.title,
    views: r.views ?? 0,
    avg: n ? Math.round(((r.total ?? 0) / n) * 10) / 10 : 0,
    ratings: n,
    campaign: r.c_title,
    by: { handle: r.handle, name: r.display_name, avatar: avatarSrc(r.avatar_key, r.display_name, r.handle) },
  }
}

// The board for each range is worked out at most once a minute per server, however many people are looking.
const memo = new Map<string, { at: number; board: Board }>()

export async function statsBoard(range: StatsRange): Promise<Board> {
  const key = range
  const hit = memo.get(key)
  if (hit && Date.now() - hit.at < 60_000) return hit.board

  const days = STATS_RANGES.find((r) => r.id === range)?.days ?? null
  const since = days ? nowSec() - days * 86400 : 0
  const notMock = "AND c.id NOT LIKE 'mock-%' AND COALESCE(c.admin_note, '') != 'sample'"
  const inRange = 's.created_at >= ?1'
  const feed = `${shows('feed', 1)} AND COALESCE(m.gone, 0) = 0`
  const d = await db()
  const q = <T>(sql: string) => d.prepare(sql).bind(since).all<T>().then((r) => r.results)
  const PERSON = 'SELECT p.handle, p.display_name, p.avatar_key'
  const CLIP = `SELECT s.id, s.platform, s.url, m.thumb, m.fetched_at, m.embed_id, m.title, ${VIEWS} AS views, r.n, r.total, c.title AS c_title, p.handle, p.display_name, p.avatar_key`
  const RATINGS = 'LEFT JOIN (SELECT submission_id, COUNT(*) AS n, SUM(stars) AS total FROM clip_ratings GROUP BY submission_id) r ON r.submission_id = s.id'

  const [totals, live, paid, ratings, views, earners, clippers, clips, rated, campaigns, artists] = await Promise.all([
    d
      .prepare(`SELECT COALESCE(SUM(${VIEWS}), 0) AS views, COUNT(*) AS clips, COUNT(DISTINCT s.user_id) AS clippers, COUNT(DISTINCT s.campaign_id) AS campaigns ${BASE} WHERE ${APPROVED} AND ${inRange} ${notMock}`)
      .bind(since)
      .first<{ views: number; clips: number; clippers: number; campaigns: number }>(),
    d.prepare(`SELECT COUNT(*) AS n FROM campaigns c WHERE c.status = 'live' ${notMock}`).first<{ n: number }>(),
    d.prepare("SELECT COALESCE(SUM(amount_cents), 0) AS n FROM ledger WHERE account = 'clipper' AND kind = 'earning' AND created_at >= ?1").bind(since).first<{ n: number }>(),
    d.prepare('SELECT COUNT(*) AS n FROM clip_ratings WHERE updated_at >= ?1').bind(since).first<{ n: number }>(),
    q<PersonRow>(`${PERSON}, SUM(${VIEWS}) AS value, COUNT(*) AS clips ${BASE} WHERE ${APPROVED} AND ${inRange} ${notMock} AND ${shows('views', 0)}
      GROUP BY s.user_id HAVING value > 0 ORDER BY value DESC LIMIT 10`),
    q<PersonRow>(`${PERSON}, SUM(l.amount_cents) AS value, 0 AS clips FROM ledger l JOIN users u ON u.id = l.user_id JOIN profiles p ON p.user_id = l.user_id
      WHERE l.account = 'clipper' AND l.kind = 'earning' AND l.created_at >= ?1 AND u.status = 'active' AND ${shows('earnings', 0)}
      GROUP BY l.user_id HAVING value > 0 ORDER BY value DESC LIMIT 10`),
    q<PersonRow>(`${PERSON}, COUNT(*) AS value, COUNT(*) AS clips ${BASE} WHERE ${APPROVED} AND ${inRange} ${notMock} AND ${shows('clips', 1)}
      GROUP BY s.user_id ORDER BY value DESC, MAX(s.created_at) DESC LIMIT 10`),
    q<ClipRow>(`${CLIP} ${BASE} ${RATINGS} WHERE ${APPROVED} AND ${inRange} ${notMock} AND ${feed} AND ${shows('views', 0)}
      AND ${VIEWS} > 0 ORDER BY views DESC LIMIT 8`),
    q<ClipRow>(`${CLIP} ${BASE} JOIN (SELECT submission_id, COUNT(*) AS n, SUM(stars) AS total FROM clip_ratings GROUP BY submission_id) r ON r.submission_id = s.id
      WHERE ${APPROVED} AND ${inRange} ${notMock} AND ${feed} ORDER BY ${BAYES} DESC, r.n DESC LIMIT 8`),
    q<CampaignStat & { cover_url: string }>(`SELECT c.id, c.title, c.creator, c.cover_url, c.status, SUM(${VIEWS}) AS views, COUNT(*) AS clips, COUNT(DISTINCT s.user_id) AS clippers ${BASE}
      WHERE ${APPROVED} AND ${inRange} ${notMock} GROUP BY c.id ORDER BY views DESC, clips DESC LIMIT 8`),
    q<ArtistStat & { cover_url: string }>(`SELECT c.creator AS name, MAX(c.cover_url) AS cover_url, SUM(${VIEWS}) AS views, COUNT(DISTINCT c.id) AS campaigns, COUNT(*) AS clips ${BASE}
      WHERE ${APPROVED} AND ${inRange} ${notMock} GROUP BY c.creator ORDER BY views DESC, clips DESC LIMIT 8`),
  ])

  const board: Board = {
    range,
    totals: {
      views: totals?.views ?? 0,
      clips: totals?.clips ?? 0,
      clippers: totals?.clippers ?? 0,
      campaigns: totals?.campaigns ?? 0,
      paidCents: paid?.n ?? 0,
      ratings: ratings?.n ?? 0,
      liveCampaigns: live?.n ?? 0,
    },
    views: views.map(person),
    earners: earners.map(person),
    clippers: clippers.map(person),
    clips: clips.map(clip),
    rated: rated.map(clip),
    campaigns: campaigns.map((c) => ({ id: c.id, title: c.title, creator: c.creator, cover: c.cover_url, views: c.views ?? 0, clips: c.clips, clippers: c.clippers, status: c.status })),
    artists: artists.map((a) => ({ name: a.name, cover: a.cover_url, views: a.views ?? 0, campaigns: a.campaigns, clips: a.clips })),
  }
  memo.set(key, { at: Date.now(), board })
  return board
}
