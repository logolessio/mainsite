import { evaluateBadges } from '@/lib/badges'
import { db, nowSec, uid } from '@/lib/db'
import { protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { getSetting } from '@/lib/settings'
import { requireUser } from '@/lib/user'

const HOSTS: Record<string, RegExp> = {
  tiktok: /(^|\.)tiktok\.com$/,
  youtube: /(^|\.)(youtube\.com|youtu\.be)$/,
  instagram: /(^|\.)instagram\.com$/,
}

/** A clipper submits the link to a clip they posted. It waits for an admin to approve it. */
export const POST = route(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser()
  await protect(req, { name: 'submit', max: 20, windowSec: 600, userId: user.id })
  if ((await getSetting('submissions_paused')) === '1') throw new HttpError(503, 'Submissions are paused for a moment. Please try again soon.')
  const { id } = await params
  const { platform, url } = await body<{ platform?: string; url?: string }>(req, 4 * 1024)
  if (!platform || !(platform in HOSTS)) throw new HttpError(400, 'Pick a platform.')
  let u: URL
  try {
    u = new URL(String(url ?? '').trim())
  } catch {
    throw new HttpError(400, 'Paste the full link to your post, starting with https://')
  }
  if (u.protocol !== 'https:' || u.username || u.password || !HOSTS[platform].test(u.hostname)) throw new HttpError(400, `That does not look like a ${platform} link.`)
  u.hash = ''

  const d = await db()
  const c = await d.prepare('SELECT status, platforms_json, brand_user_id FROM campaigns WHERE id = ?1').bind(id).first<{ status: string; platforms_json: string; brand_user_id: string | null }>()
  if (!c || c.status !== 'live') throw new HttpError(404, 'This campaign is not taking clips.')
  if (!(JSON.parse(c.platforms_json) as string[]).includes(platform)) throw new HttpError(400, 'This campaign does not count that platform.')
  if (c.brand_user_id === user.id) throw new HttpError(403, 'You cannot clip your own campaign.')
  const pending = await d.prepare("SELECT COUNT(*) AS n FROM submissions WHERE user_id = ?1 AND status = 'pending'").bind(user.id).first<{ n: number }>()
  if ((pending?.n ?? 0) >= 40) throw new HttpError(429, 'You have a lot of clips waiting for review. Please wait for those first.')

  try {
    await d
      .prepare('INSERT INTO submissions (id, campaign_id, user_id, platform, url, status, created_at) VALUES (?1,?2,?3,?4,?5,\'pending\',?6)')
      .bind(uid(), id, user.id, platform, u.toString().slice(0, 300), nowSec())
      .run()
  } catch (e) {
    if (/UNIQUE/i.test(e instanceof Error ? e.message : '')) throw new HttpError(409, 'That clip has already been submitted to this campaign.')
    throw e
  }
  await evaluateBadges(user.id)
  return json({ ok: true })
})
