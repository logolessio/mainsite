import type { Metadata } from 'next'
import { PurgeDeletions } from '@/components/admin/purge-deletions'
import { DeleteAccountButton } from '@/components/admin/delete-account-button'
import { AdminButton } from '@/components/admin/ui'
import { money, when } from '@/lib/format'
import { Badge } from '@/components/app/table'
import { Card, PageHeader } from '@/components/app/ui'
import { db, nowSec } from '@/lib/db'
import { pageAdmin } from '@/lib/user'
import { SectionTabs } from '@/components/app/section-tabs'

export const metadata: Metadata = { title: 'Users | logoless', robots: { index: false } }

type Row = {
  id: string
  email: string
  role: string
  status: string
  risk_level: string
  risk_reasons: string | null
  last_seen_at: number | null
  created_at: number
  signup_country: string | null
  handle: string | null
  owed: number
  clips: number
}

const FILTERS = [
  { id: '', label: 'Everyone' },
  { id: 'live', label: 'Active now' },
  { id: 'risk', label: 'Extra checks' },
  { id: 'restricted', label: 'Restricted' },
  { id: 'new', label: 'New today' },
]

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string; f?: string; risk?: string }> }) {
  await pageAdmin()
  const sp = await searchParams
  const filter = sp.risk ? 'risk' : (sp.f ?? '')
  const q = (sp.q ?? '').trim().slice(0, 60)
  const t = nowSec()
  const d = await db()
  const waiting = (await d.prepare("SELECT value FROM settings WHERE key LIKE 'deletion:%'").all<{ value: string }>()).results.map((r) => { try { return (JSON.parse(r.value) as { at: number }).at } catch { return t } })
  const where: string[] = ["u.email NOT LIKE 'deleted-%@deleted.invalid'"] // accounts already deleted are not listed
  const args: unknown[] = []
  if (q) {
    where.push("(u.email LIKE ?1 OR p.handle LIKE ?1 OR p.display_name LIKE ?1)")
    args.push(`%${q.replace(/[%_]/g, '')}%`)
  }
  if (filter === 'live') where.push(`u.last_seen_at > ${t - 300}`)
  if (filter === 'risk') where.push("u.risk_level != 'low'")
  if (filter === 'restricted') where.push("u.status != 'active'")
  if (filter === 'new') where.push(`u.created_at > ${t - 86400}`)
  const rows = (
    await d
      .prepare(
        `SELECT u.id, u.email, u.role, u.status, u.risk_level, u.risk_reasons, u.last_seen_at, u.created_at, u.signup_country, p.handle,
           COALESCE((SELECT SUM(amount_cents) FROM ledger WHERE user_id = u.id AND account = 'clipper'), 0) AS owed,
           (SELECT COUNT(*) FROM submissions WHERE user_id = u.id) AS clips
         FROM users u LEFT JOIN profiles p ON p.user_id = u.id
         ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
         ORDER BY COALESCE(u.last_seen_at, 0) DESC, u.created_at DESC LIMIT 100`,
      )
      .bind(...args)
      .all<Row>()
  ).results

  return (
    <>
      <SectionTabs group="people" />
      <PageHeader title="Users" sub="Who is here, who is new, and who needs a closer look." />
      <PurgeDeletions waiting={waiting.length} due={waiting.filter((a) => a <= t - 30 * 86400).length} />
      <form className="mb-4 flex flex-wrap items-center gap-2" action="/admin/users">
        <input name="q" defaultValue={q} placeholder="Search email, username or name" className="h-10 w-72 rounded-full border border-line-strong bg-ink/80 px-4 text-sm focus:outline-none" />
        {filter && <input type="hidden" name="f" value={filter} />}
        <button className="h-10 rounded-full bg-paper px-5 text-sm font-medium text-ink">Search</button>
        <span className="mx-2 hidden h-5 w-px bg-line-strong sm:block" />
        {FILTERS.map((f) => (
          <a key={f.id} href={`/admin/users?${new URLSearchParams({ ...(f.id ? { f: f.id } : {}), ...(q ? { q } : {}) })}`} className={`inline-flex h-9 items-center rounded-full border px-4 text-xs ${filter === f.id ? 'border-paper bg-paper/10' : 'border-line-strong text-mute hover:text-paper'}`}>
            {f.label}
          </a>
        ))}
      </form>
      <div className="grid gap-3">
        {rows.length === 0 && <Card><p className="text-sm text-mute">No one matches.</p></Card>}
        {rows.map((u) => {
          const live = u.last_seen_at && u.last_seen_at > t - 300
          return (
            <Card key={u.id}>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2">
                    {u.handle ? <a href={`/@${u.handle}`} className="hover:underline">@{u.handle}</a> : <span className="text-mute">no profile yet</span>}
                    <span className="text-sm text-mute">{u.email}</span>
                    {live && <Badge tone="good">online</Badge>}
                    {u.role === 'admin' && <Badge>admin</Badge>}
                    {u.status !== 'active' && <Badge tone="bad">{u.status}</Badge>}
                    {u.risk_level !== 'low' && <Badge tone="warn">extra checks</Badge>}
                  </p>
                  <p className="mt-1 text-xs text-mute">
                    Joined {when(u.created_at)} · last seen {when(u.last_seen_at)} · {u.signup_country ?? '??'} · {u.clips} clips · owed {money(u.owed)}
                  </p>
                  {u.risk_reasons && <p className="mt-1 text-xs text-amber-300/90">{u.risk_reasons}</p>}
                </div>
                {u.role !== 'admin' && (
                  <div className="flex flex-wrap gap-2">
                    {u.status === 'active' ? (
                      <>
                        <AdminButton url={`/api/admin/users/${u.id}`} data={{ action: 'suspend' }} ask={{ label: 'Reason', required: true }}>Suspend</AdminButton>
                        <AdminButton variant="danger" url={`/api/admin/users/${u.id}`} data={{ action: 'ban' }} ask={{ label: 'Reason', required: true }}>Ban</AdminButton>
                      </>
                    ) : (
                      <AdminButton variant="solid" url={`/api/admin/users/${u.id}`} data={{ action: 'reinstate' }}>Reinstate</AdminButton>
                    )}
                    {u.risk_level === 'low' ? (
                      <AdminButton url={`/api/admin/users/${u.id}`} data={{ action: 'flag' }} ask={{ label: 'Why? (optional)' }}>Add checks</AdminButton>
                    ) : (
                      <AdminButton url={`/api/admin/users/${u.id}`} data={{ action: 'unflag' }}>Clear checks</AdminButton>
                    )}
                    <DeleteAccountButton id={u.id} email={u.email} />
                  </div>
                )}
              </div>
            </Card>
          )
        })}
      </div>
    </>
  )
}
