import { db, nowSec } from './db'
import { parseEnds } from './ends'

export type Health = {
  id: string
  title: string
  cover: string
  state: 'good' | 'slow' | 'fast' | 'look'
  headline: string
  tips: string[]
  burnPct: number
  timePct: number | null
  pending: number
  last7Cents: number
}

/**
 * How each live campaign is going, in plain words: how much of the budget is used against how much of the time has passed, how fast it is
 * spending right now, and how many clips are waiting. It only reads what exists and suggests; it never changes a campaign.
 */
export async function campaignHealth(userId: string): Promise<Health[]> {
  const d = await db()
  const t = nowSec()
  const rows = (
    await d
      .prepare(
        `SELECT c.id, c.title, c.cover_url, c.budget_cents, c.rate_cents, c.ends_on, COALESCE(c.launched_at, c.created_at) AS start,
           COALESCE((SELECT SUM(net_cents) FROM earnings WHERE campaign_id = c.id), 0) AS spent,
           COALESCE((SELECT SUM(net_cents) FROM earnings WHERE campaign_id = c.id AND created_at > ?2), 0) AS last7,
           (SELECT COUNT(*) FROM submissions WHERE campaign_id = c.id AND status = 'pending') AS pending,
           (SELECT COUNT(*) FROM submissions WHERE campaign_id = c.id) AS clips
         FROM campaigns c WHERE c.brand_user_id = ?1 AND c.status = 'live' ORDER BY c.created_at DESC LIMIT 8`,
      )
      .bind(userId, t - 7 * 86400)
      .all<{ id: string; title: string; cover_url: string; budget_cents: number; rate_cents: number; ends_on: string | null; start: number; spent: number; last7: number; pending: number; clips: number }>()
  ).results
  return rows.map((r) => {
    const burn = r.budget_cents > 0 ? Math.round((r.spent / r.budget_cents) * 100) : 0
    const end = parseEnds(r.ends_on)
    const timePct = end && end > r.start ? Math.max(0, Math.min(100, Math.round(((t - r.start) / (end - r.start)) * 100))) : null
    const age = Math.max(1, (t - r.start) / 86400)
    const tips: string[] = []
    let state: Health['state'] = 'good'
    let headline = 'On track.'
    const left = Math.max(0, r.budget_cents - r.spent)
    const daysToEmpty = r.last7 > 0 ? left / (r.last7 / 7) : null
    if (r.clips === 0 && age >= 3) {
      state = 'look'
      headline = 'No clips yet.'
      tips.push('Add an example edit and the official sound, so creators know what to make.', 'Raising the rate attracts creators fastest.')
    } else if (timePct !== null && burn + 15 < timePct) {
      state = 'slow'
      headline = `${burn}% of the budget is used and ${timePct}% of the time has passed.`
      tips.push('A higher rate or an example edit usually speeds things up.', 'Invite creators from the directory.')
    } else if (timePct !== null && burn > timePct + 20) {
      state = 'fast'
      headline = `${burn}% used and only ${timePct}% of the time gone: it will finish early.`
      tips.push('Add to your balance and raise the budget if you want it to last to the end date.')
    } else if (daysToEmpty !== null && daysToEmpty < 5 && burn < 95) {
      state = 'fast'
      headline = `At this pace the budget lasts about ${Math.max(1, Math.round(daysToEmpty))} more ${Math.round(daysToEmpty) === 1 ? 'day' : 'days'}.`
      tips.push('Raise the budget if you want it to keep going.')
    } else if (r.last7 === 0 && r.clips > 0 && age >= 7) {
      state = 'slow'
      headline = 'Nothing earned in the last 7 days.'
      tips.push('A fresh example edit, or a higher rate, wakes a quiet campaign.')
    }
    if (r.pending > 0) tips.unshift(`${r.pending} ${r.pending === 1 ? 'clip is' : 'clips are'} waiting for review.`)
    return { id: r.id, title: r.title, cover: r.cover_url, state, headline, tips: tips.slice(0, 3), burnPct: burn, timePct, pending: r.pending, last7Cents: r.last7 }
  })
}
