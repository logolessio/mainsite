import type { Metadata } from 'next'
import Link from 'next/link'
import { AdminButton } from '@/components/admin/ui'
import { More } from '@/components/admin/more'
import { Tabbed, type TabbedItem } from '@/components/admin/tabbed'
import { money, when } from '@/lib/format'
import { CampaignEditor } from '@/components/admin/campaign-editor'
import { RemoveSamples } from '@/components/admin/remove-samples'
import { Badge } from '@/components/app/table'
import { Card, PageHeader } from '@/components/app/ui'
import { CAMPAIGN_STATUS } from '@/lib/campaign-status'
import { type CampaignRow } from '@/lib/campaigns-db'
import { db } from '@/lib/db'
import { pinnedIds } from '@/lib/settings'
import { pageAdmin } from '@/lib/user'

export const metadata: Metadata = { title: 'Campaigns | logoless', robots: { index: false } }

type Row = CampaignRow & { owner: string | null; pool: number; clips: number }

/** The views of this page. "Needs you" is what only a person can move forward, so it comes first. */
const VIEWS: { id: string; label: string; statuses: string[]; hot?: boolean; empty: string }[] = [
  { id: 'now', label: 'Needs you', statuses: ['requested', 'paid'], hot: true, empty: 'Nothing is waiting on you. New requests and paid campaigns appear here.' },
  { id: 'pay', label: 'Waiting for payment', statuses: ['awaiting_payment'], empty: 'No approved campaign is waiting for its artist to pay.' },
  { id: 'live', label: 'Live', statuses: ['live'], empty: 'No campaign is live right now.' },
  { id: 'paused', label: 'Paused', statuses: ['paused'], empty: 'Nothing is paused.' },
  { id: 'ended', label: 'Ended', statuses: ['ended'], empty: 'No campaign has ended yet.' },
  { id: 'rejected', label: 'Rejected', statuses: ['rejected'], empty: 'Nothing has been rejected.' },
]

export default async function Page() {
  await pageAdmin()
  const d = await db()
  const rows = (
    await d
      .prepare(
        `SELECT c.*, u.email AS owner,
           COALESCE((SELECT SUM(amount_cents) FROM ledger WHERE account = 'campaign' AND campaign_id = c.id), 0) AS pool,
           (SELECT COUNT(*) FROM submissions WHERE campaign_id = c.id) AS clips
         FROM campaigns c LEFT JOIN users u ON u.id = c.brand_user_id ORDER BY c.updated_at DESC`,
      )
      .all<Row>()
  ).results
  const pins = new Set(await pinnedIds())
  const samples = rows.filter((r) => r.admin_note === 'sample').length
  const fakes = rows.filter((r) => r.admin_note === 'sample' || r.id.startsWith('mock-')).length

  const tabs: TabbedItem[] = VIEWS.map((v) => {
    const items = rows.filter((r) => v.statuses.includes(r.status))
    return {
      id: v.id,
      label: v.label,
      count: items.length,
      hot: v.hot,
      node:
        items.length === 0 ? (
          <p className="rounded-card border border-dashed border-line-strong px-6 py-14 text-center text-mute">{v.empty}</p>
        ) : (
          <ul className="grid gap-3">
            {items.map((c) => (
              <li key={c.id} data-kb-row>
                <Card>
                  <div className="flex flex-wrap items-center gap-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.cover_url} alt="" className="size-14 shrink-0 rounded-panel object-cover" />
                    <div className="min-w-0 flex-1 basis-64">
                      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-lg leading-tight">
                        {c.title} <span className="text-sm text-mute">by {c.creator}</span>
                        <Badge tone={CAMPAIGN_STATUS[c.status]?.tone}>{CAMPAIGN_STATUS[c.status]?.admin ?? c.status}</Badge>
                        {(c.admin_note === 'sample' || c.id.startsWith('mock-')) && <Badge>made up, hidden</Badge>}
                      </p>
                      <p className="mt-1.5 text-[13px] text-mute">
                        {money(c.budget_cents)} budget · ${(c.rate_cents / 100).toFixed(2)} per 1,000 views · {c.clips} {c.clips === 1 ? 'clip' : 'clips'} · {c.owner ?? 'no owner'}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <Link href={`/admin/campaigns/${c.id}`} className={c.status === 'requested' ? 'inline-flex h-10 items-center rounded-pill bg-paper px-5 text-sm font-medium text-ink transition-colors hover:bg-paper/85' : 'inline-flex h-10 items-center rounded-pill border border-line-strong px-4 text-sm transition-colors hover:bg-white/[0.06]'}>
                        {c.status === 'requested' ? 'Review in full' : 'Open'}
                      </Link>
                      {c.status === 'requested' && (
                        <>
                          <AdminButton variant="solid" url={`/api/admin/campaigns/${c.id}`} data={{ action: 'accept' }} hotkey="a" confirm={`Accept "${c.title}"? The artist will be asked to pay ${money(c.budget_cents)}.`}>
                            Accept
                          </AdminButton>
                          <AdminButton variant="danger" url={`/api/admin/campaigns/${c.id}`} data={{ action: 'reject' }} hotkey="r" ask={{ label: 'Why? (the artist sees this)', required: true }}>
                            Reject
                          </AdminButton>
                        </>
                      )}
                      {c.status === 'awaiting_payment' && (
                        <AdminButton variant="danger" url={`/api/admin/campaigns/${c.id}`} data={{ action: 'reject' }} ask={{ label: 'Why?', required: true }}>
                          Cancel request
                        </AdminButton>
                      )}
                      {c.status === 'paid' && (
                        <AdminButton variant="solid" url={`/api/admin/campaigns/${c.id}`} data={{ action: 'launch' }} hotkey="l" confirm={`Launch "${c.title}" now? It becomes visible to everyone.`}>
                          Launch
                        </AdminButton>
                      )}
                      {c.status === 'live' && (
                        <>
                          <AdminButton url={`/api/admin/campaigns/${c.id}`} data={{ action: pins.has(c.id) ? 'unpin' : 'pin' }} hotkey="t">{pins.has(c.id) ? 'Unpin' : 'Pin to top'}</AdminButton>
                          <AdminButton url={`/api/admin/campaigns/${c.id}`} data={{ action: 'pause' }} hotkey="p" ask={{ label: 'Reason (optional)' }}>Pause</AdminButton>
                          <AdminButton variant="danger" url={`/api/admin/campaigns/${c.id}`} data={{ action: 'end' }} confirm={`End "${c.title}"?`} summary={['It stops taking clips straight away.', 'What is left of the pool goes back to the brand balance.', 'An ended campaign cannot be started again.']} typed="END">End</AdminButton>
                        </>
                      )}
                      {c.status === 'paused' && (
                        <>
                          <AdminButton variant="solid" url={`/api/admin/campaigns/${c.id}`} data={{ action: 'resume' }} hotkey="s">Resume</AdminButton>
                          <AdminButton variant="danger" url={`/api/admin/campaigns/${c.id}`} data={{ action: 'end' }} confirm={`End "${c.title}"?`} summary={['What is left of the pool goes back to the brand balance.', 'An ended campaign cannot be started again.']} typed="END">End</AdminButton>
                        </>
                      )}
                    </div>
                  </div>
                  <More label="Brief, edit and more" className="mt-3 -mb-1">
                    <p className="text-sm text-paper/80">{c.summary}</p>
                    <p className="mt-2 text-xs text-mute">
                      Pool {money(c.pool)} · updated {when(c.updated_at)}
                      {c.admin_note && c.admin_note !== 'sample' ? ` · Note: ${c.admin_note}` : ''}
                    </p>
                    <div className="mt-3 flex flex-wrap items-start gap-2">
                      <CampaignEditor c={{ id: c.id, title: c.title, creator: c.creator, summary: c.summary, rate: c.rate_cents / 100, endsOn: c.ends_on ?? '', cover: c.cover_url, previewUrl: c.preview_url ?? '' }} />
                      {c.clips === 0 && c.pool === 0 && (
                        <AdminButton variant="danger" url={`/api/admin/campaigns/${c.id}`} data={{ action: 'delete' }} confirm={`Delete "${c.title}" for good?`} summary={['The campaign and its page are removed.']} typed="DELETE">Delete</AdminButton>
                      )}
                    </div>
                  </More>
                </Card>
              </li>
            ))}
          </ul>
        ),
    }
  })
  const first = tabs[0].count ? tabs[0].id : tabs.find((t) => t.id === 'live')?.id

  return (
    <>
      <PageHeader title="Campaigns" sub="Open a request to review it in full: how it will look, what the site checked, who is behind it. Then accept, send it back, or reject it." />
      <Tabbed tabs={tabs} initial={first} />
      {fakes > 0 && (
        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
          <p className="max-w-xl text-sm text-mute">
            {fakes} made-up {fakes === 1 ? 'campaign is' : 'campaigns are'} still in the database. The public site already hides them. Remove them all with scripts/remove-fake-campaigns.sql, or the sample ones with the button.
          </p>
          <RemoveSamples count={samples} />
        </div>
      )}
    </>
  )
}
