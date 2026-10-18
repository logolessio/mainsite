import Link from 'next/link'
import { Card } from '@/components/app/ui'
import { db } from '@/lib/db'
import { money } from '@/lib/format'
import { AdminButton } from './ui'

type Req = { id: string; title: string; creator: string; budget_cents: number; rate_cents: number; email: string | null }
type Clip = { id: string; title: string; url: string; platform: string; handle: string | null; email: string }
type Pay = { id: string; amount_cents: number; email: string; review_reason: string | null }

/** What needs a decision right now, with the buttons to make it. No need to open another page for the usual ones. */
export async function OverviewQueue() {
  const d = await db()
  const [reqs, clips, pays, trusted] = await Promise.all([
    d
      .prepare("SELECT c.id, c.title, c.creator, c.budget_cents, c.rate_cents, u.email FROM campaigns c LEFT JOIN users u ON u.id = c.brand_user_id WHERE c.status = 'requested' ORDER BY c.created_at LIMIT 5")
      .all<Req>(),
    d
      .prepare("SELECT s.id, c.title, s.url, s.platform, p.handle, u.email FROM submissions s JOIN campaigns c ON c.id = s.campaign_id JOIN users u ON u.id = s.user_id LEFT JOIN profiles p ON p.user_id = u.id WHERE s.status = 'pending' ORDER BY s.created_at LIMIT 6")
      .all<Clip>(),
    d
      .prepare("SELECT p.id, p.amount_cents, u.email, p.review_reason FROM payouts p JOIN users u ON u.id = p.user_id WHERE p.status = 'review' ORDER BY p.created_at LIMIT 5")
      .all<Pay>(),
    d
      .prepare("SELECT COUNT(*) AS n FROM submissions s JOIN users u ON u.id = s.user_id JOIN campaigns c ON c.id = s.campaign_id WHERE s.status = 'pending' AND u.status = 'active' AND u.risk_level = 'low' AND c.status = 'live'")
      .first<{ n: number }>(),
  ])

  // A queue with nothing in it takes no room: only what needs a decision is drawn big, and the empty ones are named in one quiet line.
  const quiet = [reqs.results.length === 0 && 'campaign requests', clips.results.length === 0 && 'submissions', pays.results.length === 0 && 'withdrawals'].filter(Boolean) as string[]
  const nothing = quiet.length === 3

  return (
    <div className="mt-6">
      {quiet.length > 0 && (
        <p className="mb-5 flex items-center gap-2.5 rounded-2xl border border-line px-5 py-4 text-[15px] text-mute">
          <span aria-hidden="true" className="size-2 shrink-0 rounded-pill bg-emerald-400" />
          {nothing ? 'All clear. Nothing needs a decision right now.' : `Nothing waiting in ${quiet.join(', ').replace(/, ([^,]*)$/, ' or $1')}.`}
        </p>
      )}
      <div className="grid gap-6 xl:grid-cols-2">
      {reqs.results.length > 0 && <Card title="Campaign requests" sub="Accept it and, if the brand's balance covers the start, it goes live straight away.">
        {(
          <ul className="divide-y divide-line">
            {reqs.results.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <Link href="/admin/campaigns" className="block truncate text-sm hover:underline">{r.title}</Link>
                  <p className="truncate text-xs text-mute">{r.creator} · {money(r.budget_cents)} cap · {money(r.rate_cents)} per 1k{r.email ? ` · ${r.email}` : ''}</p>
                </div>
                <div className="flex gap-2">
                  <AdminButton variant="solid" url={`/api/admin/campaigns/${r.id}`} data={{ action: 'accept' }}>Accept</AdminButton>
                  <AdminButton variant="danger" url={`/api/admin/campaigns/${r.id}`} data={{ action: 'reject' }} ask={{ label: 'Why not? (they will see it)', required: true }}>Decline</AdminButton>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>}

      {clips.results.length > 0 && <Card
        title="Submissions to review"
        sub="Approve or decline. Setting views (and so paying) is done one by one on the Submissions page."
        action={
          (trusted?.n ?? 0) > 0 ? (
            <AdminButton url="/api/admin/submissions/bulk" data={{ action: 'approve_trusted' }} confirm={`Approve all ${trusted?.n} waiting clips from people with no extra checks, on live campaigns?`}>
              Approve {trusted?.n} trusted
            </AdminButton>
          ) : undefined
        }
      >
        {(
          <ul className="divide-y divide-line">
            {clips.results.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <a href={c.url} target="_blank" rel="noreferrer" className="block truncate text-sm hover:underline">{c.title}</a>
                  <p className="truncate text-xs text-mute">{c.platform} · {c.handle ? `@${c.handle}` : c.email}</p>
                </div>
                <div className="flex gap-2">
                  <AdminButton variant="solid" url={`/api/admin/submissions/${c.id}`} data={{ action: 'approve' }}>Approve</AdminButton>
                  <AdminButton variant="danger" url={`/api/admin/submissions/${c.id}`} data={{ action: 'reject' }} ask={{ key: 'reason', label: 'Reason (they will see it)', required: true }}>Decline</AdminButton>
                </div>
              </li>
            ))}
          </ul>
        )}
        <Link href="/admin/submissions" className="mt-3 inline-block text-sm text-mute underline underline-offset-4 hover:text-paper">All submissions</Link>
      </Card>}

      {pays.results.length > 0 && <Card title="Withdrawals being checked" sub="Sending one moves real money, so it asks for your admin password.">
        {(
          <ul className="divide-y divide-line">
            {pays.results.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-sm tabular-nums">{money(p.amount_cents)}</p>
                  <p className="truncate text-xs text-mute">{p.email}{p.review_reason ? ` · ${p.review_reason}` : ''}</p>
                </div>
                <div className="flex gap-2">
                  <AdminButton variant="solid" url={`/api/admin/payouts/${p.id}`} data={{ action: 'approve' }} secret={`Sending ${money(p.amount_cents)} to ${p.email}.`}>Send</AdminButton>
                  <AdminButton variant="danger" url={`/api/admin/payouts/${p.id}`} data={{ action: 'reject' }} ask={{ label: 'Why? (they will see it)', required: true }}>Decline</AdminButton>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>}
      </div>
    </div>
  )
}
