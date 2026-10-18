import { db } from './db'

export type Activity = { at: number; text: string; href: string }

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`

/** The latest happenings across the site, newest first: who joined, what was submitted, what was withdrawn, which campaigns arrived. Reads only. */
export async function recentActivity(limit = 10): Promise<Activity[]> {
  try {
    const d = await db()
    const [users, subs, pays, camps] = await Promise.all([
      d.prepare('SELECT id, name, email, created_at FROM users ORDER BY created_at DESC LIMIT 8').all<{ id: string; name: string | null; email: string; created_at: number }>(),
      d
        .prepare('SELECT s.created_at, s.status, s.platform, c.title FROM submissions s JOIN campaigns c ON c.id = s.campaign_id ORDER BY s.created_at DESC LIMIT 8')
        .all<{ created_at: number; status: string; platform: string; title: string }>(),
      d.prepare('SELECT amount_cents, status, created_at FROM payouts ORDER BY created_at DESC LIMIT 8').all<{ amount_cents: number; status: string; created_at: number }>(),
      d.prepare('SELECT id, title, status, created_at FROM campaigns WHERE status != \'live\' OR created_at > unixepoch() - 86400 * 14 ORDER BY created_at DESC LIMIT 6').all<{ id: string; title: string; status: string; created_at: number }>(),
    ])
    const out: Activity[] = []
    for (const u of users.results) out.push({ at: u.created_at, text: `${u.name?.trim() || u.email.split('@')[0]} joined`, href: `/admin/people/${u.id}` })
    for (const s of subs.results) out.push({ at: s.created_at, text: `New ${s.platform} submission on ${s.title}${s.status === 'pending' ? ', waiting for a look' : ` (${s.status})`}`, href: '/admin/submissions' })
    for (const p of pays.results) out.push({ at: p.created_at, text: `Withdrawal of ${money(p.amount_cents)} ${p.status === 'review' ? 'is being checked' : p.status}`, href: '/admin/payouts' })
    for (const c of camps.results) out.push({ at: c.created_at, text: `${c.title}: ${c.status === 'requested' ? 'new campaign request' : c.status.replace('_', ' ')}`, href: '/admin/campaigns' })
    return out.sort((a, b) => b.at - a.at).slice(0, limit)
  } catch {
    return []
  }
}
