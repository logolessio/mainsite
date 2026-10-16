import { campaignRow } from './campaigns-db'
import { db, nowSec } from './db'
import { notify, notifyFavoriters } from './notify'
import { reach } from './reach'

const usd = (c: number) => `$${(c / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`

type Submitter = { user_id: string; n: number; views: number; earned: number }
async function submitters(campaignId: string) {
  const d = await db()
  return (await d.prepare('SELECT user_id, COUNT(*) AS n, COALESCE(SUM(views_verified), 0) AS views, COALESCE(SUM(earned_cents), 0) AS earned FROM submissions WHERE campaign_id = ?1 GROUP BY user_id').bind(campaignId).all<Submitter>()).results
}

/** When a campaign closed. Kept in the settings table, so an old campaign can say how long ago it ended. */
export async function markEnded(campaignId: string, at = nowSec()) {
  const d = await db()
  await d
    .prepare('INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at')
    .bind(`ended-at:${campaignId}`, String(at), at)
    .run()
}

/**
 * A campaign is over (it ran out of budget, or the team ended it). It is taken off the front page, the time is remembered, and
 * everyone who sent a submission gets a summary of what they earned, the way they chose to be contacted. Safe to call twice.
 */
export async function finishCampaign(campaignId: string, reason: 'budget' | 'team') {
  const d = await db()
  const c = await campaignRow(campaignId)
  if (!c) return
  const t = nowSec()
  await d.prepare("UPDATE campaigns SET status = 'ended', updated_at = ?2 WHERE id = ?1 AND status IN ('live', 'paused')").bind(campaignId, t).run()
  await markEnded(campaignId, t)

  for (const s of await submitters(campaignId)) {
    const earned = s.earned > 0
    await reach(s.user_id, {
      kind: 'campaign',
      title: `${c.title} has ended`,
      body: earned
        ? `You earned ${usd(s.earned)} from ${plural(s.n, 'submission')} and ${plural(s.views, 'verified view')}. Thank you for being part of it.`
        : `You sent ${plural(s.n, 'submission')}, and none of them earned anything before it ${reason === 'budget' ? 'ran out of budget' : 'ended'}. There are more campaigns to try.`,
      href: '/dashboard/submissions',
      dedupe: `camp-summary:${campaignId}`,
    })
  }
  await notifyFavoriters(campaignId, { title: `${c.title} has ended`, body: reason === 'budget' ? 'It ran out of budget, so it is no longer taking submissions.' : 'It is no longer taking submissions.', dedupe: `camp-ended:${campaignId}` })
  if (c.brand_user_id && reason === 'budget') {
    await notify(c.brand_user_id, { kind: 'campaign', title: `${c.title} used its whole budget`, body: 'It has ended. Raise its budget to run it again.', href: '/brand/campaigns', dedupe: `camp-ended-owner:${campaignId}` })
  }
}

/** A campaign is nearly out of budget: tell everyone who has sent something, so they can send the last ones in time. Sent once. */
export async function warnEnding(campaignId: string, leftPct: number) {
  const c = await campaignRow(campaignId)
  if (!c) return
  for (const s of await submitters(campaignId)) {
    await reach(s.user_id, {
      kind: 'campaign',
      title: `${c.title} is about to end`,
      body: `Only ${Math.max(1, Math.round(leftPct))}% of the budget is left. Send any last submissions soon: once it runs out, the campaign closes.`,
      href: `/campaign/${campaignId}`,
      dedupe: `camp-ending:${campaignId}`,
    })
  }
}
