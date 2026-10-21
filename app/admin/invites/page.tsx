import type { Metadata } from 'next'
import { AdminButton } from '@/components/admin/ui'
import { CopyButton } from '@/components/admin/copy-button'
import { InviteForm } from '@/components/admin/invite-form'
import { Badge } from '@/components/app/table'
import { Card, PageHeader, StatCard } from '@/components/app/ui'
import { CAMPAIGN_STATUS } from '@/lib/campaign-status'
import { db } from '@/lib/db'
import { when } from '@/lib/format'
import { clientUrl } from '@/lib/client-host'
import { featureOn } from '@/lib/features'
import { dmText, inviteUrl, REACH, stepsFor } from '@/lib/invite-shared'
import { parseData } from '@/lib/invites'
import type { InviteRow } from '@/lib/invites'
import { pageAdmin } from '@/lib/user'

export const metadata: Metadata = { title: 'Artist links | logoless', robots: { index: false } }

type Row = InviteRow & { owner_email: string | null; owner_handle: string | null; camp_title: string | null; camp_status: string | null }

export default async function Page() {
  await pageAdmin()
  // with client links on, every link is also its own address (name.logoless.io) and runs the fuller client package
  const pkg = await featureOn('client-links')
  const LAST = stepsFor(pkg).length - 1
  const d = await db()
  const rows = (
    await d
      .prepare(
        `SELECT i.*, u.email AS owner_email, p.handle AS owner_handle, c.title AS camp_title, c.status AS camp_status
         FROM artist_invites i LEFT JOIN users u ON u.id = i.user_id LEFT JOIN profiles p ON p.user_id = i.user_id LEFT JOIN campaigns c ON c.id = i.campaign_id
         ORDER BY i.created_at DESC LIMIT 200`,
      )
      .all<Row>()
  ).results
  const opened = rows.filter((r) => r.opened_at).length
  const claimed = rows.filter((r) => r.user_id).length
  const withCampaign = rows.filter((r) => r.campaign_id).length
  const paid = rows.filter((r) => r.camp_status && ['paid', 'live', 'paused', 'ended'].includes(r.camp_status)).length

  return (
    <>
      <PageHeader title={pkg ? 'Client links' : 'Artist links'} sub={pkg ? 'Make a private address for an artist or client, like their-name.logoless.io. They sign in, set up their page, choose how to be reached, add funds and build their first campaign step by step, then get a tour of their dashboard.' : 'Make a private page for an artist you have spoken to. They sign in, set up their artist page, launch a campaign and fund it, all from logoless.io/their-name.'} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Links sent" value={String(rows.length)} />
        <StatCard label="Opened" value={String(opened)} note={rows.length ? `${Math.round((opened / rows.length) * 100)}% of links` : undefined} />
        <StatCard label="Claimed" value={String(claimed)} note="Signed in and started" />
        <StatCard label="Funded campaigns" value={String(paid)} note={`${withCampaign} campaign${withCampaign === 1 ? '' : 's'} created`} />
      </div>

      <div className="mt-6">
        <Card title="Make a new link" sub="Pick the name. The address is made from it, and you can change it before saving.">
          <InviteForm />
        </Card>
      </div>

      <h2 className="mt-10 mb-4 font-display text-3xl">
        All links <span className="text-mute">{rows.length}</span>
      </h2>
      <div className="grid gap-3">
        {rows.length === 0 && (
          <Card>
            <p className="text-sm text-mute">Nothing yet. Make the first link above.</p>
          </Card>
        )}
        {rows.map((r) => {
          const url = pkg ? clientUrl(r.slug) : inviteUrl(r.slug)
          const x = parseData(r.data_json)
          const reach = x.reachBy ? `${REACH.find((m) => m.id === x.reachBy)?.label ?? x.reachBy}${x.reachAt ? `: ${x.reachAt}` : ''}` : null
          const pct = Math.round((Math.min(r.step, LAST) / LAST) * 100)
          return (
            <Card key={r.id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-lg">
                    {r.artist_name}
                    {r.status === 'revoked' ? (
                      <Badge tone="bad">switched off</Badge>
                    ) : r.camp_status ? (
                      <Badge tone={CAMPAIGN_STATUS[r.camp_status]?.tone}>{CAMPAIGN_STATUS[r.camp_status]?.admin}</Badge>
                    ) : r.user_id ? (
                      <Badge tone="warn">
                        setting up · step {Math.min(r.step, LAST)} of {LAST}
                      </Badge>
                    ) : r.opened_at ? (
                      <Badge>opened, not claimed</Badge>
                    ) : (
                      <Badge>not opened</Badge>
                    )}
                    {r.email_lock ? <Badge>locked to email</Badge> : null}
                  </p>
                  <a href={`/${r.slug}`} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-sm text-paper/80 underline underline-offset-4 hover:text-paper">
                    {pkg ? `${r.slug}.logoless.io` : `logoless.io/${r.slug}`}
                  </a>
                  {pkg && <span className="ml-2 text-xs text-mute">also logoless.io/{r.slug}</span>}
                  {reach && <p className="mt-1 text-xs text-paper/80">Best way to reach them: {reach}</p>}
                  <p className="mt-1.5 text-xs text-mute">
                    Made {when(r.created_at)} · {r.channel}
                    {r.contact_handle ? ` · @${r.contact_handle}` : ''}
                    {r.contact_email ? ` · ${r.contact_email}` : ''} · opened {r.opens} time{r.opens === 1 ? '' : 's'}
                    {r.emailed_at ? ` · emailed ${when(r.emailed_at)}` : ''}
                  </p>
                  {r.user_id && (
                    <p className="mt-1 text-xs text-mute">
                      Claimed by {r.owner_handle ? `@${r.owner_handle} · ` : ''}
                      {r.owner_email} on {when(r.claimed_at)} · last active {when(r.last_active_at)}
                      {r.camp_title ? ` · campaign “${r.camp_title}”` : ''}
                    </p>
                  )}
                  {r.note && <p className="mt-1 text-xs text-amber-300/90">Note: {r.note}</p>}
                  {r.user_id && !r.campaign_id && (
                    <div className="mt-3 h-1.5 w-full max-w-sm overflow-hidden rounded-pill bg-white/10" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                      <div className="h-full rounded-pill bg-paper" style={{ width: `${pct}%` }} />
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-start justify-end gap-2">
                  <CopyButton text={url} label="Copy link" />
                  <CopyButton text={dmText(r.artist_name, url)} label="Copy message" />
                  {r.contact_email && r.status !== 'revoked' && (
                    <AdminButton url={`/api/admin/invites/${r.id}`} data={{ action: 'email' }} confirm={`Email the link to ${r.contact_email}?`}>
                      {r.emailed_at ? 'Email again' : 'Email it'}
                    </AdminButton>
                  )}
                  {r.status === 'revoked' ? (
                    <AdminButton variant="solid" url={`/api/admin/invites/${r.id}`} data={{ action: 'restore' }}>
                      Switch back on
                    </AdminButton>
                  ) : (
                    <AdminButton url={`/api/admin/invites/${r.id}`} data={{ action: 'revoke' }} confirm="Switch this link off? It stops working straight away.">
                      Switch off
                    </AdminButton>
                  )}
                  {r.user_id && !r.campaign_id && (
                    <AdminButton url={`/api/admin/invites/${r.id}`} data={{ action: 'unclaim' }} confirm="Hand this link back? The current person loses it and their answers are cleared.">
                      Hand back
                    </AdminButton>
                  )}
                  {!r.user_id && !r.campaign_id && (
                    <AdminButton variant="danger" url={`/api/admin/invites/${r.id}`} data={{ action: 'delete' }} confirm={`Delete the link for ${r.artist_name}?`} summary={['The link stops working and its answers are removed.']} typed="DELETE">
                      Delete
                    </AdminButton>
                  )}
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </>
  )
}
