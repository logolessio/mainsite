import type { Metadata } from 'next'
import { SectionTabs } from '@/components/app/section-tabs'
import { AdminButton } from '@/components/admin/ui'
import { money, when } from '@/lib/format'
import { CampaignEditor } from '@/components/admin/campaign-editor'
import { RemoveSamples } from '@/components/admin/remove-samples'
import { Badge } from '@/components/app/table'
import { Card, PageHeader } from '@/components/app/ui'
import { CAMPAIGN_STATUS } from '@/lib/campaign-status'
import { type CampaignRow } from '@/lib/campaigns-db'
import { db } from '@/lib/db'
import { pageAdmin } from '@/lib/user'

export const metadata: Metadata = { title: 'Campaigns | logoless', robots: { index: false } }

type Row = CampaignRow & { owner: string | null; pool: number; clips: number }

const ORDER = ['requested', 'paid', 'awaiting_payment', 'live', 'paused', 'ended', 'rejected']
const TITLES: Record<string, string> = {
  requested: 'New requests',
  paid: 'Paid: ready to launch',
  awaiting_payment: 'Approved: waiting for the artist to pay',
  live: 'Live',
  paused: 'Paused',
  ended: 'Ended',
  rejected: 'Rejected',
}

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
  const groups = ORDER.map((s) => ({ s, items: rows.filter((r) => r.status === s) })).filter((g) => g.items.length)

  return (
    <>
      <SectionTabs group="campaigns" />
      <PageHeader title="Campaigns" sub="Accept a request, wait for the artist to pay, then launch. Nothing goes live until it is paid." actions={<RemoveSamples count={rows.filter((r) => r.admin_note === 'sample').length} />} />
      {groups.length === 0 && <p className="text-mute">No campaigns yet.</p>}
      <div className="grid gap-8">
        {groups.map((g) => (
          <section key={g.s}>
            <h2 className="mb-3 font-display text-3xl">
              {TITLES[g.s]} <span className="text-mute">{g.items.length}</span>
            </h2>
            <div className="grid gap-3">
              {g.items.map((c) => (
                <Card key={c.id}>
                  <div className="flex flex-wrap items-start gap-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.cover_url} alt="" className="size-20 shrink-0 rounded-xl object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 text-lg">
                        {c.title} <span className="text-sm text-mute">by {c.creator}</span>
                        <Badge tone={CAMPAIGN_STATUS[c.status]?.tone}>{CAMPAIGN_STATUS[c.status]?.admin ?? c.status}</Badge>
                        {c.admin_note === 'sample' && <Badge>sample</Badge>}
                      </p>
                      <p className="mt-1 text-xs text-mute">
                        {c.owner ? `Requested by ${c.owner}` : 'No owner'} · {money(c.budget_cents)} budget · ${(c.rate_cents / 100).toFixed(2)} per 1,000 views · {c.clips} clips · pool {money(c.pool)} · updated {when(c.updated_at)}
                      </p>
                      <p className="mt-2 line-clamp-2 text-sm text-paper/80">{c.summary}</p>
                      {c.admin_note && c.admin_note !== 'sample' && <p className="mt-1 text-xs text-mute">Note: {c.admin_note}</p>}
                    </div>
                    <div className="flex flex-wrap items-start justify-end gap-2">
                      {c.status === 'requested' && (
                        <>
                          <AdminButton variant="solid" url={`/api/admin/campaigns/${c.id}`} data={{ action: 'accept' }} confirm={`Accept "${c.title}"? The artist will be asked to pay ${money(c.budget_cents)}.`}>
                            Accept: we will launch it
                          </AdminButton>
                          <AdminButton variant="danger" url={`/api/admin/campaigns/${c.id}`} data={{ action: 'reject' }} ask={{ label: 'Why? (the artist sees this)', required: true }}>
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
                        <AdminButton variant="solid" url={`/api/admin/campaigns/${c.id}`} data={{ action: 'launch' }} confirm={`Launch "${c.title}" now? It becomes visible to everyone.`}>
                          Launch
                        </AdminButton>
                      )}
                      {c.status === 'live' && (
                        <>
                          <AdminButton url={`/api/admin/campaigns/${c.id}`} data={{ action: 'pause' }} ask={{ label: 'Reason (optional)' }}>Pause</AdminButton>
                          <AdminButton variant="danger" url={`/api/admin/campaigns/${c.id}`} data={{ action: 'end' }} confirm="End this campaign? It stops taking clips.">End</AdminButton>
                        </>
                      )}
                      {c.status === 'paused' && (
                        <>
                          <AdminButton variant="solid" url={`/api/admin/campaigns/${c.id}`} data={{ action: 'resume' }}>Resume</AdminButton>
                          <AdminButton variant="danger" url={`/api/admin/campaigns/${c.id}`} data={{ action: 'end' }} confirm="End this campaign?">End</AdminButton>
                        </>
                      )}
                      {c.clips === 0 && c.pool === 0 && (
                        <AdminButton variant="danger" url={`/api/admin/campaigns/${c.id}`} data={{ action: 'delete' }} confirm={`Delete "${c.title}" for good?`}>Delete</AdminButton>
                      )}
                    </div>
                  </div>
                  <CampaignEditor c={{ id: c.id, title: c.title, creator: c.creator, summary: c.summary, rate: c.rate_cents / 100, endsOn: c.ends_on ?? '', cover: c.cover_url, previewUrl: c.preview_url ?? '' }} />
                </Card>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  )
}
