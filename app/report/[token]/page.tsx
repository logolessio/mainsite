import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { ViewsChart, type Day } from '@/components/brand/views-chart'
import { campaignRow } from '@/lib/campaigns-db'
import { feedPage } from '@/lib/clip-feed'
import { db } from '@/lib/db'
import { featureOn } from '@/lib/features'
import { CONTAINER } from '@/lib/layout'

export const metadata: Metadata = { title: 'Campaign report | logoless', robots: { index: false, follow: false } }

const compact = (n: number) => n.toLocaleString('en-US', { notation: 'compact', maximumFractionDigits: 1 })
const usd = (c: number) => `$${(c / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}`

/**
 * A read-only report on one campaign, for whoever the brand shares the link with (a label, a manager, a client). It carries totals and the
 * best public clips, no names beyond what those clips already show, and it stops working the moment the brand stops sharing.
 */
export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  await connection()
  if (!(await featureOn('share-report'))) notFound()
  const { token } = await params
  if (!/^[a-z0-9]{10,40}$/.test(token)) notFound()
  const d = await db()
  const link = await d.prepare('SELECT value FROM settings WHERE key = ?1').bind(`report:${token}`).first<{ value: string }>()
  if (!link) notFound()
  const { campaignId } = JSON.parse(link.value) as { campaignId: string }
  const c = await campaignRow(campaignId)
  if (!c) notFound()
  const [t, series, clips] = await Promise.all([
    d
      .prepare(
        `SELECT COALESCE((SELECT SUM(views_verified) FROM submissions WHERE campaign_id = ?1), 0) AS views,
           (SELECT COUNT(*) FROM submissions WHERE campaign_id = ?1 AND status = 'approved') AS clips,
           (SELECT COUNT(DISTINCT user_id) FROM submissions WHERE campaign_id = ?1 AND status = 'approved') AS creators,
           COALESCE((SELECT SUM(gross_cents) FROM earnings WHERE campaign_id = ?1), 0) AS spent`,
      )
      .bind(campaignId)
      .first<{ views: number; clips: number; creators: number; spent: number }>(),
    d
      .prepare(
        `SELECT strftime('%Y-%m-%d', e.created_at, 'unixepoch') AS d, CAST(SUM(e.net_cents * 1000.0 / NULLIF(?2, 0)) AS INTEGER) AS views, SUM(e.gross_cents) AS spent
         FROM earnings e WHERE e.campaign_id = ?1 GROUP BY d ORDER BY d`,
      )
      .bind(campaignId, c.rate_cents)
      .all<Day>(),
    feedPage({ sort: 'views', campaign: campaignId, viewerId: null }).catch(() => ({ clips: [] })),
  ])
  const today = new Date().toISOString().slice(0, 10)
  const per1k = t && t.views > 0 ? t.spent / (t.views / 1000) : 0
  return (
    <main className={`${CONTAINER} pt-20 pb-32`}>
      <p className="text-sm text-mute">Campaign report · live numbers</p>
      <div className="mt-6 flex flex-wrap items-center gap-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={c.cover_url} alt="" className="size-20 rounded-card object-cover" />
        <div>
          <h1 className="font-display text-5xl leading-tight tracking-[-0.03em] md:text-6xl">{c.title}</h1>
          <p className="text-mute">by {c.creator}</p>
        </div>
      </div>
      <dl className="mt-12 grid gap-x-10 gap-y-8 border-t border-line pt-8 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Verified views', compact(t?.views ?? 0)],
          ['Approved clips', String(t?.clips ?? 0)],
          ['Creators', String(t?.creators ?? 0)],
          ['Paid out', usd(t?.spent ?? 0)],
        ].map(([k, v]) => (
          <div key={k}>
            <dt className="text-sm text-mute">{k}</dt>
            <dd className="mt-2 font-display text-5xl leading-none tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
      {per1k > 0 && <p className="mt-6 text-sm text-mute">That is about {usd(Math.round(per1k))} for every 1,000 verified views, fee included.</p>}
      {series.results.length > 0 && (
        <section className="mt-12 rounded-card border border-line p-6">
          <h2 className="mb-4 font-display text-2xl">Views by day</h2>
          <ViewsChart series={series.results} today={today} />
        </section>
      )}
      {clips.clips.length > 0 && (
        <section className="mt-12">
          <h2 className="border-b border-line pb-3 font-display text-2xl">Best clips</h2>
          <ul>
            {clips.clips.slice(0, 5).map((k) => (
              <li key={k.id} className="border-b border-line">
                <a href={k.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 py-4 transition-colors hover:bg-white/[0.02]">
                  <span className="min-w-0 flex-1 truncate text-[17px]">{k.title || `A clip by ${k.by.name}`}</span>
                  <span className="text-sm text-mute capitalize">{k.platform}</span>
                  <span className="w-24 text-right text-sm text-mute tabular-nums">{compact(k.views)} views</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
      <p className="mt-12 max-w-xl text-xs leading-relaxed text-mute">Numbers are verified by logoless from the platforms and updated as they change. This link was shared by the campaign&apos;s owner and can be switched off by them at any time.</p>
    </main>
  )
}
