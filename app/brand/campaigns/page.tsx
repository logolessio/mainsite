import type { Metadata } from 'next'
import { ActionLink } from '@/components/app/action-link'
import { Badge, EmptyState } from '@/components/app/table'
import { PageHeader } from '@/components/app/ui'
import { CampaignActions, MoveBudget } from '@/components/brand/campaign-actions'
import { CampaignJourney } from '@/components/brand/campaign-journey'
import { ShareReportButton } from '@/components/extras/share-report-button'
import { pendingAsks } from '@/lib/campaign-review'
import { ClientTour } from '@/components/brand/client-tour'
import { allCaps } from '@/lib/campaign-caps'
import { CAMPAIGN_STATUS } from '@/lib/campaign-status'
import { db } from '@/lib/db'
import { featureOn } from '@/lib/features'
import { pageUser } from '@/lib/user'
import { applyWording } from '@/lib/wording'

export const metadata: Metadata = { title: 'Campaigns | logoless', robots: { index: false } }

type Row = {
  id: string
  title: string
  status: string
  budget_cents: number
  admin_note: string | null
  cover_url: string
  spent: number
  paid: number
  clips: number
  views: number
  pool: number
  paused_by: string | null
}

const usd = (c: number) => `$${(c / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`

export default async function Page({ searchParams }: { searchParams: Promise<{ requested?: string; cancelled?: string; resent?: string }> }) {
  const user = await pageUser()
  const q = await searchParams
  const d = await db()
  const rows = (
    await d
      .prepare(
        `SELECT c.id, c.title, c.status, c.budget_cents, c.admin_note, c.cover_url,
           COALESCE((SELECT SUM(net_cents) FROM earnings WHERE campaign_id = c.id), 0) AS spent,
           COALESCE((SELECT SUM(gross_cents) FROM earnings WHERE campaign_id = c.id), 0) AS paid,
           (SELECT COUNT(*) FROM submissions WHERE campaign_id = c.id) AS clips,
           COALESCE((SELECT SUM(views_verified) FROM submissions WHERE campaign_id = c.id), 0) AS views,
           COALESCE((SELECT SUM(amount_cents) FROM ledger WHERE campaign_id = c.id AND account = 'campaign'), 0) AS pool,
           (SELECT value FROM settings WHERE key = 'paused-by:' || c.id) AS paused_by
         FROM campaigns c WHERE c.brand_user_id = ?1 ORDER BY CASE c.status WHEN 'live' THEN 0 WHEN 'paused' THEN 1 WHEN 'awaiting_payment' THEN 2 WHEN 'requested' THEN 3 ELSE 4 END, c.created_at DESC`,
      )
      .bind(user.id)
      .all<Row>()
  ).results
  const caps = await allCaps()
  const dup = await featureOn('campaign-duplicate')
  const asks = await pendingAsks(rows.filter((r) => r.status === 'requested').map((r) => r.id))
  const movable = rows.filter((r) => ['live', 'paused', 'awaiting_payment', 'paid'].includes(r.status)).map((r) => ({ id: r.id, title: r.title, free: Math.max(0, r.budget_cents - r.spent) / 100 }))

  return (
    <>
      <PageHeader title="Campaigns" sub="Every campaign draws from your one balance as creators earn. Pause, start or change a budget any time." actions={<ActionLink href="/brand/campaigns/new">New campaign</ActionLink>} />
      {q.resent && <p role="status" className="mb-4 rounded-2xl border border-line-strong px-4 py-3 text-sm">Sent back. The team will read it again and tell you what they decide.</p>}
      {q.requested && <p role="status" className="mb-4 rounded-2xl border border-line-strong px-4 py-3 text-sm">Sent. We read every new campaign. Once it is approved it goes live as soon as your balance covers the start.</p>}
      <MoveBudget campaigns={movable} />
      <ClientTour />
      {rows.length === 0 ? (
        <div data-tour="campaigns-empty">
        <EmptyState icon="Megaphone" title="No campaigns yet" body="Write a short brief, set a rate and a budget, and we do the rest." action={<ActionLink href="/brand/campaigns/new">New campaign</ActionLink>} />
        </div>
      ) : (
        <ul className="grid gap-3">
          {rows.map((r, n) => {
            const pct = r.budget_cents > 0 ? Math.min(100, Math.round((r.spent / r.budget_cents) * 100)) : 0
            return (
              <li key={r.id} data-tour={n === 0 ? 'campaign' : undefined} className="flex flex-wrap items-center gap-x-6 gap-y-4 rounded-card border border-line bg-white/[0.02] p-4 pr-6 sm:flex-nowrap">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={r.cover_url} alt="" className="size-20 shrink-0 rounded-2xl object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-lg">
                    <span className="truncate">{r.title}</span>
                    <Badge tone={CAMPAIGN_STATUS[r.status]?.tone ?? 'neutral'}>{CAMPAIGN_STATUS[r.status]?.brand ?? r.status}</Badge>
                  </p>
                  {r.admin_note && r.admin_note !== 'sample' && !['live', 'paused'].includes(r.status) && <p className="mt-0.5 text-xs text-mute">{r.admin_note}</p>}
                  {asks[r.id] && (
                    <div className="mt-3 max-w-xl rounded-panel border border-paper/25 bg-white/[0.04] p-4">
                      <p className="text-xs text-mute">The team asked for changes</p>
                      <p className="mt-1 text-sm leading-relaxed">{asks[r.id]}</p>
                      <ActionLink href={`/brand/campaigns/${r.id}/edit`}>Fix it and send it back</ActionLink>
                    </div>
                  )}
                  <CampaignJourney status={r.status} className="mt-3" />
                  <div className="mt-3 h-1.5 max-w-md overflow-hidden rounded-pill bg-white/10" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Share of the budget paid out">
                    <div className="h-full rounded-pill bg-paper" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-2 text-sm text-mute tabular-nums">
                    {applyWording(`${usd(r.spent)} of ${usd(r.budget_cents)} paid to creators · ${r.views.toLocaleString()} views · ${r.clips} ${r.clips === 1 ? 'clip' : 'clips'}`)}
                  </p>
                </div>
                <div data-tour={n === 0 ? 'campaign-actions' : undefined} className="flex flex-wrap items-center gap-2">
                {['live', 'paused', 'ended'].includes(r.status) && <ShareReportButton id={r.id} />}
                {dup && <a href={`/brand/campaigns/new?from=${r.id}`} className="inline-flex h-9 items-center rounded-pill border border-line-strong px-3.5 text-sm transition-colors hover:bg-white/[0.06]">Duplicate</a>}
                <CampaignActions c={{ id: r.id, title: r.title, status: r.status, budget: Math.round(r.budget_cents / 100), spent: r.spent, poolCents: r.pool, adminPaused: r.paused_by === 'admin', capPerPost: (caps[r.id]?.perPostCents ?? 0) / 100, capPerUser: (caps[r.id]?.perUserCents ?? 0) / 100 }} />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
