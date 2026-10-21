import { embedSrc, isTall, postId } from './clip-embed'
import { fetchClipMeta, type ClipMeta, type MetaKeys } from './clip-meta'
import { db, nowSec, setting } from './db'
import { avatarSrc } from './looks'
import { mockVisible } from './mock-campaigns'
import { getSession } from './session'

/**
 * The public submissions feed (/submissions). Every approved clip, from people who have not hidden their clips from it (the "Clips
 * on the public feed" switch in profile privacy, on unless they turn it off), from accounts in good standing. Clips the platform
 * says are deleted or private drop out on their own.
 */
export type FeedSort = 'new' | 'top' | 'views'
export const FEED_SORTS: { id: FeedSort; label: string }[] = [
  { id: 'new', label: 'New' },
  { id: 'top', label: 'Top rated' },
  { id: 'views', label: 'Most viewed' },
]
export const PAGE_SIZE = 18

export type FeedClip = {
  id: string
  platform: string
  url: string
  embed: string | null
  tall: boolean
  thumb: string | null
  title: string | null
  author: string | null
  views: number
  likes: number | null
  comments: number | null
  postedAt: number | null
  submittedAt: number
  campaign: { id: string; title: string; creator: string; cover: string }
  by: { handle: string; name: string; avatar: string | null }
  rating: { avg: number; count: number; mine: number | null }
  /** True when the platform's numbers are missing or old: the page asks for fresh ones once it is showing. */
  stale: boolean
}

export type FeedQuery = { sort: FeedSort; campaign?: string | null; platform?: string | null; offset?: number; viewerId?: string | null }

/** Fresh enough: platform numbers are re-read after six hours, a platform that did not answer is asked again after one. */
const FRESH_OK = 6 * 3600
const FRESH_FAIL = 3600

/** Public: the person said yes (or never said), the account is in good standing and the clip is approved. */
const PUBLIC = `s.status = 'approved' AND u.status = 'active'
  AND (CASE WHEN json_valid(p.show_json) THEN COALESCE(json_extract(p.show_json, '$.feed'), 1) ELSE 1 END) = 1`
/** Shown on the feed: public, and the platform has not told us the post is gone. */
export const FEED_VISIBLE = `${PUBLIC} AND COALESCE(m.gone, 0) = 0`

const FROM = `FROM submissions s
  JOIN campaigns c ON c.id = s.campaign_id
  JOIN users u ON u.id = s.user_id
  JOIN profiles p ON p.user_id = s.user_id
  LEFT JOIN clip_meta m ON m.submission_id = s.id`

const notMock = async () => ((await mockVisible()) ? '' : "AND c.id NOT LIKE 'mock-%'")

/** A star average that does not let one 5-star vote beat fifty 4-star ones: every clip starts with three made-up 3-star votes. */
export const BAYES = '((COALESCE(r.total, 0) + 9.0) / (COALESCE(r.n, 0) + 3))'

const ORDER: Record<FeedSort, string> = {
  new: 's.created_at DESC, s.id',
  top: `${BAYES} DESC, COALESCE(r.n, 0) DESC, s.created_at DESC, s.id`,
  views: 'MAX(s.views_verified, COALESCE(m.views, 0)) DESC, s.created_at DESC, s.id',
}

type Row = {
  id: string
  platform: string
  url: string
  views_verified: number
  created_at: number
  campaign_id: string
  c_title: string
  c_creator: string
  c_cover: string
  handle: string
  display_name: string
  avatar_key: string | null
  ok: number | null
  embed_id: string | null
  thumb: string | null
  title: string | null
  author: string | null
  views: number | null
  likes: number | null
  comments: number | null
  posted_at: number | null
  fetched_at: number | null
  n: number | null
  total: number | null
  mine: number | null
}

const SELECT = `SELECT s.id, s.platform, s.url, s.views_verified, s.created_at, s.campaign_id,
  c.title AS c_title, c.creator AS c_creator, c.cover_url AS c_cover,
  p.handle, p.display_name, p.avatar_key,
  m.ok, m.embed_id, m.thumb, m.title, m.author, m.views, m.likes, m.comments, m.posted_at, m.fetched_at,
  r.n, r.total`

const RATINGS = 'LEFT JOIN (SELECT submission_id, COUNT(*) AS n, SUM(stars) AS total FROM clip_ratings GROUP BY submission_id) r ON r.submission_id = s.id'

/** Our own address for a platform's picture (TikTok, Instagram and X pictures cannot be shown straight from their sites). YouTube's can. */
export const thumbFor = (platform: string, id: string, thumb: string | null, fetchedAt: number | null) =>
  !thumb ? null : platform === 'youtube' && thumb.startsWith('https://i.ytimg.com/') ? thumb : `/clip-thumb/${encodeURIComponent(id)}?v=${fetchedAt ?? 0}`

export function toClip(r: Row, t = nowSec()): FeedClip {
  const embedId = r.embed_id ?? postId(r.platform, r.url)
  const ytThumb = r.platform === 'youtube' && embedId ? `https://i.ytimg.com/vi/${embedId}/hqdefault.jpg` : null
  const n = r.n ?? 0
  return {
    id: r.id,
    platform: r.platform,
    url: r.url,
    embed: embedSrc(r.platform, embedId, r.url),
    tall: isTall(r.platform, r.url),
    thumb: thumbFor(r.platform, r.id, r.thumb, r.fetched_at) ?? ytThumb,
    title: r.title,
    author: r.author,
    views: Math.max(r.views_verified ?? 0, r.views ?? 0),
    likes: r.likes,
    comments: r.comments,
    postedAt: r.posted_at,
    submittedAt: r.created_at,
    campaign: { id: r.campaign_id, title: r.c_title, creator: r.c_creator, cover: r.c_cover },
    by: { handle: r.handle, name: r.display_name, avatar: avatarSrc(r.avatar_key, r.display_name, r.handle) },
    rating: { avg: n ? Math.round(((r.total ?? 0) / n) * 10) / 10 : 0, count: n, mine: r.mine ?? null },
    stale: r.fetched_at === null || t - r.fetched_at > (r.ok ? FRESH_OK : FRESH_FAIL),
  }
}

export async function feedPage(q: FeedQuery): Promise<{ clips: FeedClip[]; next: number | null }> {
  const d = await db()
  const where: string[] = []
  const args: unknown[] = [q.viewerId ?? '']
  if (q.campaign) (args.push(q.campaign), where.push(`AND s.campaign_id = ?${args.length}`))
  if (q.platform) (args.push(q.platform), where.push(`AND s.platform = ?${args.length}`))
  const offset = Math.max(0, Math.min(5000, Math.floor(q.offset ?? 0)))
  args.push(PAGE_SIZE + 1, offset)
  const rows = (
    await d
      .prepare(
        `${SELECT}, mine.stars AS mine ${FROM} ${RATINGS}
         LEFT JOIN clip_ratings mine ON mine.submission_id = s.id AND mine.user_id = ?1
         WHERE ${FEED_VISIBLE} ${await notMock()} ${where.join(' ')}
         ORDER BY ${ORDER[q.sort] ?? ORDER.new} LIMIT ?${args.length - 1} OFFSET ?${args.length}`,
      )
      .bind(...args)
      .all<Row>()
  ).results
  const t = nowSec()
  return { clips: rows.slice(0, PAGE_SIZE).map((r) => toClip(r, t)), next: rows.length > PAGE_SIZE ? offset + PAGE_SIZE : null }
}

/** The campaigns that have clips on the feed, busiest first, for the filter. */
export async function feedCampaigns(): Promise<{ id: string; title: string; creator: string; clips: number }[]> {
  const d = await db()
  return (
    await d
      .prepare(`SELECT c.id, c.title, c.creator, COUNT(*) AS clips ${FROM} WHERE ${FEED_VISIBLE} ${await notMock()} GROUP BY c.id ORDER BY clips DESC, c.title LIMIT 60`)
      .all<{ id: string; title: string; creator: string; clips: number }>()
  ).results
}

export async function metaKeys(): Promise<MetaKeys> {
  const [youtube, metaAppId, metaClientToken, xBearer] = await Promise.all([setting('YOUTUBE_API_KEY'), setting('META_APP_ID'), setting('META_CLIENT_TOKEN'), setting('X_BEARER_TOKEN')])
  return { youtube, metaAppId, metaClientToken, xBearer }
}

async function save(id: string, m: ClipMeta) {
  const d = await db()
  await d
    .prepare(
      `INSERT INTO clip_meta (submission_id, ok, gone, embed_id, thumb, title, author, views, likes, comments, posted_at, fetched_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)
       ON CONFLICT(submission_id) DO UPDATE SET ok = excluded.ok, gone = excluded.gone,
         embed_id = COALESCE(excluded.embed_id, clip_meta.embed_id), thumb = COALESCE(excluded.thumb, clip_meta.thumb),
         title = COALESCE(excluded.title, clip_meta.title), author = COALESCE(excluded.author, clip_meta.author),
         views = COALESCE(excluded.views, clip_meta.views), likes = COALESCE(excluded.likes, clip_meta.likes),
         comments = COALESCE(excluded.comments, clip_meta.comments), posted_at = COALESCE(excluded.posted_at, clip_meta.posted_at),
         fetched_at = excluded.fetched_at`,
    )
    .bind(id, m.ok ? 1 : 0, m.gone ? 1 : 0, m.embedId, m.thumb?.slice(0, 1500) ?? null, m.title, m.author, m.views, m.likes, m.comments, m.postedAt, nowSec())
    .run()
}

/**
 * Asks the platforms about these clips (only ones on the public feed), stores what they said and gives back the updated clips.
 * Clips that turned out to be deleted come back in `gone`. `force` re-reads even fresh ones (used when a picture link has expired).
 */
export async function refreshClips(ids: string[], viewerId: string | null, force = false): Promise<{ clips: FeedClip[]; gone: string[] }> {
  const unique = [...new Set(ids)].filter((x) => /^[\w-]{6,64}$/.test(x)).slice(0, 12)
  if (!unique.length) return { clips: [], gone: [] }
  const d = await db()
  const marks = unique.map((_, i) => `?${i + 2}`).join(',')
  const read = async () =>
    (
      await d
        .prepare(
          `${SELECT}, m.gone, mine.stars AS mine ${FROM} ${RATINGS}
           LEFT JOIN clip_ratings mine ON mine.submission_id = s.id AND mine.user_id = ?1
           WHERE ${PUBLIC} ${await notMock()} AND s.id IN (${marks})`,
        )
        .bind(viewerId ?? '', ...unique)
        .all<Row & { gone: number | null }>()
    ).results
  let rows = await read()
  const t = nowSec()
  const todo = rows.filter((r) => force || toClip(r, t).stale)
  if (todo.length) {
    const keys = await metaKeys()
    await Promise.all(todo.map(async (r) => save(r.id, await fetchClipMeta(r.platform, r.url, keys)).catch(() => undefined)))
    rows = await read()
  }
  return { clips: rows.filter((r) => !r.gone).map((r) => ({ ...toClip(r), stale: false })), gone: rows.filter((r) => r.gone).map((r) => r.id) }
}

/** The signed-in visitor's account id, or null. Never creates an account. */
export async function viewerId(): Promise<string | null> {
  try {
    const email = (await getSession())?.user?.email
    if (!email) return null
    const d = await db()
    const u = await d.prepare("SELECT id FROM users WHERE email = ?1 AND status = 'active'").bind(email.toLowerCase()).first<{ id: string }>()
    return u?.id ?? null
  } catch {
    return null
  }
}
