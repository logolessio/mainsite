import type { Metadata } from 'next'
import Link from 'next/link'
import { ActionLink } from '@/components/app/action-link'
import { Badge, EmptyState } from '@/components/app/table'
import { Card, PageHeader } from '@/components/app/ui'
import { SetupBanner } from '@/components/app/setup-banner'
import { ViewsChart, type Day } from '@/components/brand/views-chart'
import { CAMPAIGN_STATUS } from '@/lib/campaign-status'
import { db } from '@/lib/db'
import { money } from '@/lib/format'
import { featureOn } from '@/lib/features'
import { balances } from '@/lib/ledger'
import { brandSetup } from '@/lib/setup-steps'
import { pageUser } from '@/lib/user'

export const metadata: Metadata = { title: 'Overview | logoless', robots: { index: false } }

type TopCreator = { uid: string; name: string; handle: string | null; paid: number; views: number }
type Camp = { id: string; title: string; status: string; budget_cents: number; cover_url: string; views: number; spent: number }

/** The brand's home: what the money bought, how it is going, the campaigns, and the balance they all draw from. */
export default async function Page() {
  const user = await pageUser()
  const d = await db()
  const today = new Date().toISOString().slice(0, 10)
  const [b, series, camps, totals, steps] = await Promise.all([
    balances(user.id),
    d
      .prepare(
        `SELECT strftime('%Y-%m-%d', e.created_at, 'unixepoch') AS d,
           CAST(SUM(e.net_cents * 1000.0 / NULLIF(c.rate_cents, 0)) AS INTEGER) AS views, SUM(e.gross_cents) AS spent
         FROM earnings e JOIN campaigns c ON c.id = e.campaign_id WHERE e.brand_user_id = ?1 GROUP BY d ORDER BY d`,
      )
      .bind(user.id)
      .all<Day>(),
    d
      .prepare(
        `SELECT c.id, c.title, c.status, c.budget_cents, c.cover_url,
           COALESCE((SELECT SUM(views_verified) FROM submissions WHERE campaign_id = c.id), 0) AS views,
           COALESCE((SELECT SUM(net_cents) FROM earnings WHERE campaign_id = c.id), 0) AS spent
         FROM campaigns c WHERE c.brand_user_id = ?1 ORDER BY CASE c.status WHEN 'live' THEN 0 WHEN 'paused' THEN 1 ELSE 2 END, c.created_at DESC LIMIT 8`,
      )
      .bind(user.id)
      .all<Camp>(),
    d
      .prepare(
        `SELECT COALESCE(SUM(gross_cents), 0) AS spent,
           (SELECT COALESCE(SUM(views_verified), 0) FROM submissions WHERE campaign_id IN (SELECT id FROM campaigns WHERE brand_user_id = ?1)) AS views,
           (SELECT COUNT(*) FROM campaigns WHERE brand_user_id = ?1 AND status = 'live') AS live
         FROM earnings WHERE brand_user_id = ?1`,
      )
      .bind(user.id)
      .first<{ spent: number; views: number; live: number }>(),
    brandSetup(user),
  ])
  const topOn = await featureOn('top-creators')
  const top = topOn
    ? (
        await d
          .prepare(
            `SELECT e.clipper_user_id AS uid, COALESCE(NULLIF(p.display_name, ''), p.handle, 'Creator') AS name, p.handle AS handle, SUM(e.gross_cents) AS paid,
               (SELECT COALESCE(SUM(views_verified), 0) FROM submissions s WHERE s.user_id = e.clipper_user_id AND s.campaign_id IN (SELECT id FROM campaigns WHERE brand_user_id = ?1)) AS views
             FROM earnings e LEFT JOIN profiles p ON p.user_id = e.clipper_user_id
             WHERE e.brand_user_id = ?1 GROUP BY e.clipper_user_id ORDER BY paid DESC LIMIT 5`,
          )
          .bind(user.id)
          .all<TopCreator>()
      ).results
    : []
  const per1k = totals && totals.views > 0 ? totals.spent / (totals.views / 1000) : 0

  return (
    <>
      <PageHeader title="Overview" sub="What your money bought, and how your campaigns are doing." />

      <SetupBanner steps={steps} guide="/brand/setup" />

      <Card>
        <ViewsChart series={series.results} today={today} />
        <dl className="mt-6 grid grid-cols-2 gap-6 border-t border-line pt-5 sm:grid-cols-4">
          {[
            ['Verified views', (totals?.views ?? 0).toLocaleString()],
            ['Spent', money(totals?.spent ?? 0)],
            ['Per 1,000 views', per1k > 0 ? money(Math.round(per1k)) : '-'],
            ['Live campaigns', String(totals?.live ?? 0)],
          ].map(([k, v]) => (
            <div key={k}>
              <dd className="font-display text-2xl leading-none tabular-nums">{v}</dd>
              <dt className="mt-1.5 text-[13px] text-mute">{k}</dt>
            </div>
          ))}
        </dl>
      </Card>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card title="Campaigns" action={<Link href="/brand/campaigns" className="text-sm text-mute underline underline-offset-4 hover:text-paper">See all</Link>}>
          {camps.results.length === 0 ? (
            <EmptyState icon="Megaphone" title="No campaigns yet" body="Write a short brief, set a rate and a budget, and creators start posting." action={<ActionLink href="/brand/campaigns/new">New campaign</ActionLink>} />
          ) : (
            <ul className="divide-y divide-line">
              {camps.results.map((c) => {
                const pct = c.budget_cents > 0 ? Math.min(100, Math.round((c.spent / c.budget_cents) * 100)) : 0
                return (
                  <li key={c.id} className="flex items-center gap-4 py-3.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.cover_url} alt="" className="size-12 shrink-0 rounded-xl object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px]">{c.title}</p>
                      <div className="mt-1.5 h-1 max-w-[12rem] overflow-hidden rounded-pill bg-white/10">
                        <div className="h-full rounded-pill bg-paper" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <span className="hidden text-sm text-mute tabular-nums sm:block">{c.views.toLocaleString()} views</span>
                    <Badge tone={CAMPAIGN_STATUS[c.status]?.tone ?? 'neutral'}>{CAMPAIGN_STATUS[c.status]?.brand ?? c.status}</Badge>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        <Card title="Balance">
          <p className="font-display text-5xl leading-none tracking-[-0.04em] tabular-nums">{money(b.brand)}</p>
          <p className="mt-3 text-sm leading-relaxed text-mute">One balance for every campaign. Creators are paid out of it as they earn. We cover PayPal&apos;s fees.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <ActionLink href="/brand/balance#add-funds">Add funds</ActionLink>
            <ActionLink href="/brand/balance" variant="ghost">History</ActionLink>
          </div>
        </Card>
      </div>

      {top.length > 0 && (
        <Card title="Top creators" sub="Who your money has gone to the most." className="mt-6">
          <ul className="divide-y divide-line">
            {top.map((t, i) => (
              <li key={t.uid} className="flex items-center gap-4 py-3.5 text-[15px]">
                <span className="w-5 text-mute tabular-nums">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate">{t.handle ? <Link href={`/@${t.handle}`} className="hover:underline">{t.name}</Link> : t.name}</span>
                <span className="hidden text-mute tabular-nums sm:block">{t.views.toLocaleString()} views</span>
                <span className="w-24 text-right tabular-nums">{money(t.paid)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  )
}
