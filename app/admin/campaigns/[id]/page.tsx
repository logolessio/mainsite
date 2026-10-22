import { ArrowLeft, Check, CircleAlert, CircleX, ExternalLink } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ReviewDecision } from '@/components/admin/review-decision'
import { Badge } from '@/components/app/table'
import { Card } from '@/components/app/ui'
import { CampaignBackdrop, CampaignExtrasBlock } from '@/components/campaign/campaign-extras'
import { CampaignSheet } from '@/components/campaign/campaign-sheet'
import { CAMPAIGN_STATUS } from '@/lib/campaign-status'
import { reviewData, type Check as CheckT } from '@/lib/campaign-review'
import { toCampaign } from '@/lib/campaigns-db'
import { money, when } from '@/lib/format'
import { campaignIsFeeFree } from '@/lib/fee-free'
import { startNeeded } from '@/lib/ledger-math'
import { pageAdmin } from '@/lib/user'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Review a campaign | logoless', robots: { index: false } }

const MARK = {
  pass: { Icon: Check, cls: 'bg-white/10 text-paper', label: 'Passes' },
  warn: { Icon: CircleAlert, cls: 'bg-amber-400/15 text-amber-300', label: 'Look at this' },
  fail: { Icon: CircleX, cls: 'bg-signal/15 text-signal', label: 'Blocks it' },
} as const

const VERDICT = {
  ready: 'border-white/20 bg-white/[0.04]',
  look: 'border-white/25 bg-white/[0.04]',
  hold: 'border-signal/40 bg-signal/[0.06]',
} as const

/**
 * Reviewing a requested campaign, in full: how creators will see it (the real campaign sheet, over the background it asked for), what the
 * site checked by itself, who the brand is, anything that looks like a copy, and the decision with the reasons that go back to the artist.
 */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await pageAdmin()
  const { id } = await params
  const r = await reviewData(id)
  if (!r) notFound()
  const { row, extras, checks, verdict, owner, history, lookalikes, trail } = r
  const groups = [...new Set(checks.map((c) => c.group))]
  const status = CAMPAIGN_STATUS[row.status]
  const campaign = toCampaign(row)

  return (
    <div className="pb-10">
      <Link href="/admin/campaigns" className="inline-flex items-center gap-1.5 text-sm text-mute transition-colors hover:text-paper">
        <ArrowLeft aria-hidden="true" className="size-4" /> All campaigns
      </Link>
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <h1 className="font-display text-4xl leading-tight">{row.title}</h1>
        <Badge tone={status?.tone}>{status?.admin ?? row.status}</Badge>
      </div>
      <p className="mt-1 text-sm text-mute">
        by {row.creator} · asked for {when(row.created_at)} · {money(row.budget_cents)} budget · ${(row.rate_cents / 100).toFixed(2)} per 1,000 views
      </p>

      <div className={cn('mt-6 rounded-card border px-5 py-4', VERDICT[verdict.level])}>
        <p className="text-[15px]">{verdict.headline}</p>
        <p className="mt-0.5 text-xs text-mute">
          {checks.filter((c) => c.status === 'pass').length} pass · {checks.filter((c) => c.status === 'warn').length} to look at · {checks.filter((c) => c.status === 'fail').length} block it. The checks point you at things; they never decide for you.
        </p>
      </div>

      <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_26rem]">
        <div className="grid min-w-0 content-start gap-8">
          <section>
            <h2 className="mb-3 text-lg">How creators will see it</h2>
            <div className="relative isolate overflow-hidden rounded-card border border-line bg-ink">
              {extras.background && <CampaignBackdrop id={extras.background} />}
              <div className="px-3 py-8 sm:px-6">
                <CampaignSheet campaign={campaign} inline preview="approved" extra={<CampaignExtrasBlock x={extras} />} />
              </div>
            </div>
            <p className="mt-2 text-xs text-mute">This is the real page. The submit button runs a practice, nothing is sent.</p>
          </section>

          <Card title="Everything they entered" sub="Open every link before you accept.">
            <dl className="grid gap-x-8 gap-y-4 p-6 pt-4 text-sm sm:grid-cols-2">
              <Item k="Type">{row.type}</Item>
              <Item k="Platforms">{(JSON.parse(row.platforms_json || '[]') as string[]).join(', ') || '-'}</Item>
              <Item k="Ends">{row.ends_on || 'No end date'}</Item>
              <Item k="Budget and rate">
                {money(row.budget_cents)} at ${(row.rate_cents / 100).toFixed(2)} per 1,000 views
              </Item>
              <Item k="What to make" wide>
                <List v={row.clip_this_json} />
              </Item>
              <Item k="Off limits" wide>
                <List v={row.off_limits_json} />
              </Item>
              {extras.audioNote && <Item k="Which part of the audio" wide>{extras.audioNote}</Item>}
              {extras.bio && <Item k="About the artist" wide>{extras.bio}</Item>}
              <Item k="Links" wide>
                <ul className="grid gap-1.5">
                  {[...extras.sounds.map((u) => ['Official sound', u]), ...extras.spotify.map((u) => ['Spotify', u]), ...(extras.example ? [['Example edit', extras.example]] : []), ...(extras.assets ? [['Footage to use', extras.assets]] : [])].map(([k, u]) => (
                    <li key={u}>
                      <a href={u} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 break-all text-paper underline underline-offset-4">
                        {k}: {u} <ExternalLink aria-hidden="true" className="size-3 shrink-0" />
                      </a>
                    </li>
                  ))}
                  {!extras.sounds.length && !extras.spotify.length && !extras.example && !extras.assets && <li className="text-mute">None.</li>}
                </ul>
              </Item>
            </dl>
          </Card>
        </div>

        <aside className="grid min-w-0 content-start gap-6 xl:sticky xl:top-24 xl:self-start">
          <Card title="Decide">
            <div className="p-6 pt-4">
              <ReviewDecision id={row.id} title={row.title} status={row.status} level={verdict.level} budget={money(row.budget_cents)} startNeeded={money(startNeeded(row.budget_cents, await campaignIsFeeFree(row.id)))} />
            </div>
          </Card>

          <Card title="What the site checked">
            <div className="grid gap-5 p-6 pt-4">
              {groups.map((g) => (
                <div key={g}>
                  <p className="mb-2 text-xs text-mute">{g}</p>
                  <ul className="grid gap-2.5">
                    {checks.filter((c) => c.group === g).map((c) => (
                      <CheckRow key={c.id} c={c} />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Card>

          <Card title="The brand">
            <div className="grid gap-3 p-6 pt-4 text-sm">
              {owner ? (
                <>
                  <p>
                    <span className="text-mute">Account </span>
                    <Link href={`/admin/people/${owner.id}`} className="underline underline-offset-4">
                      {owner.email}
                    </Link>
                    {owner.handle ? <span className="text-mute"> · @{owner.handle}</span> : null}
                  </p>
                  <p className="text-mute">Joined {when(owner.since)} · balance {money(owner.balanceCents)}</p>
                </>
              ) : (
                <p className="text-mute">No account is attached.</p>
              )}
              {history.length > 0 && (
                <ul className="mt-1 grid gap-1.5 border-t border-line pt-3">
                  {history.map((h) => (
                    <li key={h.id} className="flex items-center justify-between gap-3">
                      <Link href={`/admin/campaigns/${h.id}`} className="truncate underline-offset-4 hover:underline">
                        {h.title}
                      </Link>
                      <Badge tone={CAMPAIGN_STATUS[h.status]?.tone}>{CAMPAIGN_STATUS[h.status]?.admin ?? h.status}</Badge>
                    </li>
                  ))}
                </ul>
              )}
              {lookalikes.length > 0 && (
                <div className="border-t border-line pt-3">
                  <p className="mb-1.5 text-xs text-mute">Looks like</p>
                  <ul className="grid gap-1.5">
                    {lookalikes.map((l) => (
                      <li key={l.id} className="flex items-center justify-between gap-3">
                        <Link href={`/admin/campaigns/${l.id}`} className="truncate underline-offset-4 hover:underline">
                          {l.title} <span className="text-mute">({l.why})</span>
                        </Link>
                        <Badge tone={CAMPAIGN_STATUS[l.status]?.tone}>{CAMPAIGN_STATUS[l.status]?.admin ?? l.status}</Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Card>

          {trail.length > 0 && (
            <Card title="What the team has done">
              <ul className="grid gap-3 p-6 pt-4 text-sm">
                {[...trail].reverse().map((t, i) => (
                  <li key={i}>
                    <p className="text-xs text-mute">
                      {t.kind === 'accept' ? 'Accepted' : t.kind === 'reject' ? 'Rejected' : t.kind === 'changes' ? 'Asked for changes' : t.kind === 'resubmit' ? 'Artist sent it back' : 'Note'} · {t.by.replace(/@.*/, '')} · {when(t.at)}
                    </p>
                    {t.text && <p className="mt-0.5 text-paper/85">{t.text}</p>}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </aside>
      </div>
    </div>
  )
}

function Item({ k, children, wide }: { k: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? 'sm:col-span-2' : undefined}>
      <dt className="mb-1 text-xs text-mute">{k}</dt>
      <dd className="text-paper/90">{children}</dd>
    </div>
  )
}

function List({ v }: { v: string }) {
  let items: string[] = []
  try {
    const p = JSON.parse(v || '[]')
    items = Array.isArray(p) ? p.map(String) : []
  } catch {
    items = []
  }
  return items.length ? (
    <ul className="grid gap-1">
      {items.map((x) => (
        <li key={x} className="flex gap-2">
          <span aria-hidden="true" className="text-mute">
            •
          </span>
          {x}
        </li>
      ))}
    </ul>
  ) : (
    <span className="text-mute">Nothing listed.</span>
  )
}

function CheckRow({ c }: { c: CheckT }) {
  const m = MARK[c.status]
  return (
    <li className="flex items-start gap-3">
      <span title={m.label} className={cn('mt-0.5 grid size-5 shrink-0 place-items-center rounded-pill', m.cls)}>
        <m.Icon aria-hidden="true" className="size-3" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm">{c.label}</span>
        <span className="block text-xs leading-snug text-mute">{c.detail}</span>
      </span>
    </li>
  )
}
