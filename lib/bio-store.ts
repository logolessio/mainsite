import { db, nowSec } from './db'
import { HttpError } from './http'
import { type BioConfig, DEFAULT_BIO, allBlocks, isMediaUrl, normalizeBio, parseBio, starterBlocks } from './bio'

/**
 * Where the link-in-bio pages are kept. A page is one JSON value in the settings table (`bio:<user id>`), so it needs no migration. The counters are
 * rows of their own, bumped in one statement each, so they are exact however many people open a page at once:
 *   biov:<user id>:<yyyymmdd>      views that day
 *   bioc:<user id>:<block id>      clicks on one link, all time
 *   biocd:<user id>:<yyyymmdd>     clicks that day
 */
const keyFor = (userId: string) => `bio:${userId}`
const UPLOAD = /^[0-9a-f-]{36}$/

export async function getBio(userId: string): Promise<BioConfig | null> {
  const row = await (await db()).prepare('SELECT value FROM settings WHERE key = ?1').bind(keyFor(userId)).first<{ value: string }>()
  return row ? parseBio(row.value) : null
}

/** The page a person has, or the starting page (not saved until they press Save). */
export async function bioOrStarter(userId: string): Promise<{ config: BioConfig; saved: boolean }> {
  const found = await getBio(userId)
  return found ? { config: found, saved: true } : { config: { ...DEFAULT_BIO, blocks: starterBlocks() }, saved: false }
}

/** Is this upload this person's, and of this kind? */
async function owns(userId: string, id: string, kinds: string[]) {
  if (!id || isMediaUrl(id)) return true // a link to a file kept elsewhere is not ours to check
  if (!UPLOAD.test(id)) return false
  const row = await (await db()).prepare('SELECT kind FROM uploads WHERE id = ?1 AND user_id = ?2').bind(id, userId).first<{ kind: string }>()
  return Boolean(row && kinds.includes(row.kind))
}

/** Saves a page. Everything is cleaned first, and a picture, video or cursor must be one the person uploaded. */
export async function saveBio(userId: string, input: unknown): Promise<BioConfig> {
  const current = (await getBio(userId)) ?? DEFAULT_BIO
  const next = normalizeBio(input, current)
  if (!(await owns(userId, next.bg.image, ['background', 'banner']))) throw new HttpError(400, 'Upload the background picture first.')
  if (!(await owns(userId, next.bg.video, ['bgvideo']))) throw new HttpError(400, 'Upload the background video first.')
  if (!(await owns(userId, next.cursor.image, ['cursor']))) throw new HttpError(400, 'Upload the cursor first.')
  if (!(await owns(userId, next.audio.id, ['audio']))) throw new HttpError(400, 'Upload the music first.')
  if (!(await owns(userId, next.audio.cover, ['background', 'banner']))) throw new HttpError(400, 'Upload the cover first.')
  for (const b of allBlocks(next)) {
    if (b.t === 'music' && !(await owns(userId, b.url, ['audio']))) throw new HttpError(400, 'Upload the song first.')
    if (b.t === 'music' && !(await owns(userId, b.cover ?? '', ['background', 'banner']))) throw new HttpError(400, 'Upload the cover first.')
    if (b.t === 'image' && !(await owns(userId, b.src, ['background', 'banner']))) throw new HttpError(400, 'Upload the picture first.')
  }
  const json = JSON.stringify(next)
  if (json.length > 200_000) throw new HttpError(413, 'That site is too big. Remove some links or text.')
  await (await db())
    .prepare('INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at')
    .bind(keyFor(userId), json, nowSec())
    .run()
  return next
}

/** The upload ids a page uses, so clearing out old uploads never takes one away from a live page. */
export function bioUploadIds(json: string | null | undefined): string[] {
  const cfg = parseBio(json)
  const blocks = allBlocks(cfg).flatMap((b) => (b.t === 'music' ? [b.url, b.cover ?? ''] : b.t === 'image' ? [b.src] : []))
  return [cfg.bg.image, cfg.bg.video, cfg.cursor.image, cfg.audio.id, cfg.audio.cover, cfg.card.banner, ...blocks].filter((x) => UPLOAD.test(x))
}

/* ------------------------------------------------------------------ counting */

const day = (t = nowSec()) => new Date(t * 1000).toISOString().slice(0, 10).replace(/-/g, '')
const bump = async (key: string) =>
  void (await (await db())
    .prepare("INSERT INTO settings (key, value, updated_at) VALUES (?1, '1', ?2) ON CONFLICT(key) DO UPDATE SET value = CAST(value AS INTEGER) + 1, updated_at = excluded.updated_at")
    .bind(key, nowSec())
    .run())

export const countView = (userId: string) => bump(`biov:${userId}:${day()}`)
export async function countClick(userId: string, blockId: string) {
  await bump(`bioc:${userId}:${blockId}`)
  await bump(`biocd:${userId}:${day()}`)
}

export type BioStats = { views: number; clicks: number; days: { day: string; views: number; clicks: number }[]; links: Record<string, number> }

/** Views and clicks: the last 30 days one by one, the totals, and the clicks on each link. */
export async function bioStats(userId: string): Promise<BioStats> {
  const d = await db()
  const [v, c, l] = await Promise.all([
    d.prepare("SELECT key, value FROM settings WHERE key LIKE ?1").bind(`biov:${userId}:%`).all<{ key: string; value: string }>(),
    d.prepare("SELECT key, value FROM settings WHERE key LIKE ?1").bind(`biocd:${userId}:%`).all<{ key: string; value: string }>(),
    d.prepare("SELECT key, value FROM settings WHERE key LIKE ?1").bind(`bioc:${userId}:%`).all<{ key: string; value: string }>(),
  ])
  const views = new Map(v.results.map((r) => [r.key.split(':')[2], Number(r.value)]))
  const clicks = new Map(c.results.map((r) => [r.key.split(':')[2], Number(r.value)]))
  const days: BioStats['days'] = []
  for (let i = 29; i >= 0; i--) {
    const k = day(nowSec() - i * 86400)
    days.push({ day: k, views: views.get(k) ?? 0, clicks: clicks.get(k) ?? 0 })
  }
  const links: Record<string, number> = {}
  for (const r of l.results) links[r.key.split(':')[2]] = Number(r.value)
  return { views: [...views.values()].reduce((a, b) => a + b, 0), clicks: [...clicks.values()].reduce((a, b) => a + b, 0), days, links }
}

/** All-time views, for a page that chooses to show its counter. */
export async function totalViews(userId: string) {
  const r = await (await db()).prepare("SELECT COALESCE(SUM(CAST(value AS INTEGER)), 0) AS n FROM settings WHERE key LIKE ?1").bind(`biov:${userId}:%`).first<{ n: number }>()
  return r?.n ?? 0
}
