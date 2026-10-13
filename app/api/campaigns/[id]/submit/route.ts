import { evaluateBadges } from '@/lib/badges'
import { db, nowSec, uid } from '@/lib/db'
import { checkClip } from '@/lib/clip-check'
import { protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { notify, notifyAdmins } from '@/lib/notify'
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
  const c = await d.prepare('SELECT title, creator, status, platforms_json, brand_user_id FROM campaigns WHERE id = ?1').bind(id).first<{ title: string; creator: string; status: string; platforms_json: string; brand_user_id: string | null }>()
  if (!c || c.status !== 'live') throw new HttpError(404, 'This campaign is not taking clips.')
  if (!(JSON.parse(c.platforms_json) as string[]).includes(platform)) throw new HttpError(400, 'This campaign does not count that platform.')
  if (c.brand_user_id === user.id) throw new HttpError(403, 'You cannot clip your own campaign.')
  const pending = await d.prepare("SELECT COUNT(*) AS n FROM submissions WHERE user_id = ?1 AND status = 'pending'").bind(user.id).first<{ n: number }>()
  if ((pending?.n ?? 0) >= 40) throw new HttpError(429, 'You have a lot of clips waiting for review. Please wait for those first.')

  const subId = uid()
  try {
    await d
      .prepare('INSERT INTO submissions (id, campaign_id, user_id, platform, url, status, created_at) VALUES (?1,?2,?3,?4,?5,\'pending\',?6)')
      .bind(subId, id, user.id, platform, u.toString().slice(0, 300), nowSec())
      .run()
  } catch (e) {
    if (/UNIQUE/i.test(e instanceof Error ? e.message : '')) throw new HttpError(409, 'That clip has already been submitted to this campaign.')
    throw e
  }
  await evaluateBadges(user.id)

  // A first look at the link. Clear passes are approved, a dead link is declined with the reason, everything else waits for a person.
  const profile = await d.prepare('SELECT links_json FROM profiles WHERE user_id = ?1').bind(user.id).first<{ links_json: string }>()
  let linked: { platform: string; url: string }[] = []
  try {
    linked = JSON.parse(profile?.links_json ?? '[]')
  } catch {
    /* no accounts added yet */
  }
  const result = await checkClip({ platform, url: u.toString(), campaignTitle: c.title, creator: c.creator, linked })
  const t = nowSec()
  if (result.verdict === 'approved') {
    await d.prepare("UPDATE submissions SET status = 'approved', reviewed_by = 'auto', reviewed_at = ?2 WHERE id = ?1").bind(subId, t).run()
    await notify(user.id, { kind: 'submission', title: `Clip approved (${c.title})`, body: 'Our team confirms the views before you are paid.', href: '/dashboard/submissions', dedupe: `sub-approved:${subId}` })
  } else if (result.verdict === 'declined') {
    await d.prepare("UPDATE submissions SET status = 'rejected', reject_reason = ?2, reviewed_by = 'auto', reviewed_at = ?3 WHERE id = ?1").bind(subId, result.reason ?? 'The link did not lead to a video.', t).run()
    await notify(user.id, { kind: 'submission', title: `A clip was not approved (${c.title})`, body: result.reason, href: '/dashboard/submissions', dedupe: `sub-rejected:${subId}` })
  } else {
    await notifyAdmins({ title: `Clip to review: ${c.title}`, body: `${platform} · ${user.email}`, href: '/admin/submissions', dedupe: `sub-review:${subId}` })
  }
  return json({ ok: true, id: subId, status: result.verdict, checks: result.checks, reason: result.reason ?? null })
})
