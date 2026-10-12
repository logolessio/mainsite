import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { Leaderboard, type Entry } from '@/components/marketing/leaderboard'
import { db, nowSec } from '@/lib/db'
import { featureOn } from '@/lib/features'
import { CONTAINER } from '@/lib/layout'

export const metadata: Metadata = { title: 'Leaderboard | logoless', description: 'The clippers bringing in the most verified views.' }

export default async function Page({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  await connection()
  if (!(await featureOn('leaderboard'))) notFound()
  const { p } = await searchParams
  const period = p === 'all' ? 'all' : '30'
  const since = period === 'all' ? 0 : nowSec() - 30 * 86400
  const d = await db()
  const rows = (
    await d
      .prepare(
        `SELECT p.handle, p.display_name, p.avatar_key, p.accent, p.show_json, SUM(s.views_verified) AS views, COUNT(*) AS clips
         FROM submissions s JOIN profiles p ON p.user_id = s.user_id JOIN users u ON u.id = s.user_id
         WHERE s.status = 'approved' AND s.views_verified > 0 AND s.created_at >= ?1 AND u.status = 'active'
         GROUP BY s.user_id ORDER BY views DESC LIMIT 60`,
      )
      .bind(since)
      .all<{ handle: string; display_name: string; avatar_key: string | null; accent: string; show_json: string; views: number; clips: number }>()
  ).results
  // only people who chose to show their views are listed
  const shown: Entry[] = rows
    .filter((r) => {
      try {
        return JSON.parse(r.show_json).views === true
      } catch {
        return false
      }
    })
    .slice(0, 25)
    .map((r) => ({ handle: r.handle, name: r.display_name, avatar: r.avatar_key ? `/api/img/${r.avatar_key}` : null, accent: r.accent, views: r.views, clips: r.clips }))
  return (
    <main className={`${CONTAINER} pt-32 pb-40 md:pt-44`}>
      <Leaderboard entries={shown} period={period} />
    </main>
  )
}
