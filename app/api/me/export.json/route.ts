import { db } from '@/lib/db'
import { featureOn } from '@/lib/features'
import { protect } from '@/lib/guard'
import { HttpError, route } from '@/lib/http'
import { requireUser } from '@/lib/user'

/**
 * "Download my data": everything logoless keeps about you that is yours to take, as one JSON file. Profile, submissions, earnings, withdrawals,
 * notifications, saved campaigns and badges. No passwords or codes, and nothing about other people.
 */
export const GET = route(async (req: Request) => {
  if (!(await featureOn('data-download'))) throw new HttpError(404, 'Not found.')
  const user = await requireUser()
  await protect(req, { name: 'data-download', max: 5, windowSec: 3600, userId: user.id })
  const d = await db()
  const all = async <T>(sql: string) => (await d.prepare(sql).bind(user.id).all<T>()).results
  const [profile, submissions, earnings, payouts, notifications, favorites, badges] = await Promise.all([
    d.prepare('SELECT handle, display_name, bio, pronouns, country, accent, accent2, font, name_effect, card_effect, show_json, links_json, badges_json, created_at, updated_at FROM profiles WHERE user_id = ?1').bind(user.id).first(),
    all("SELECT s.id, s.campaign_id, c.title AS campaign, s.platform, s.url, s.status, s.reject_reason, s.views_verified, s.earned_cents, s.created_at FROM submissions s JOIN campaigns c ON c.id = s.campaign_id WHERE s.user_id = ?1 ORDER BY s.created_at"),
    all('SELECT id, campaign, gross_cents, fee_cents, net_cents, note, created_at FROM earnings WHERE clipper_user_id = ?1 ORDER BY created_at'),
    all('SELECT id, amount_cents, status, created_at FROM payouts WHERE user_id = ?1 ORDER BY created_at'),
    all('SELECT kind, title, body, href, read_at, created_at FROM notifications WHERE user_id = ?1 ORDER BY created_at DESC LIMIT 500'),
    all('SELECT campaign_id, created_at FROM favorites WHERE user_id = ?1'),
    all('SELECT badge_id, unlocked_at FROM badges_unlocked WHERE user_id = ?1').catch(() => []),
  ])
  const out = { exportedAt: new Date().toISOString(), account: { email: user.email, name: user.name, createdAt: user.created_at }, profile, submissions, earnings, withdrawals: payouts, notifications, savedCampaigns: favorites, badges }
  return new Response(JSON.stringify(out, null, 2), { headers: { 'content-type': 'application/json; charset=utf-8', 'content-disposition': 'attachment; filename="logoless-my-data.json"', 'cache-control': 'no-store' } })
})
