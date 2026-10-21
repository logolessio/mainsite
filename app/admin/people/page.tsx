import type { Metadata } from 'next'
import { PersonCard, type PersonPreview } from '@/components/admin/person-card'
import { PurgeDeletions } from '@/components/admin/purge-deletions'
import { Badge } from '@/components/app/table'
import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { money, when } from '@/lib/format'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/app/ui'
import { db, nowSec } from '@/lib/db'
import { ownerEmails, roleHolders } from '@/lib/roles'
import { sharedIpUserIds } from '@/lib/ip-limit'
import { pageAdmin } from '@/lib/user'
import { avatarSrc } from '@/lib/looks'

export const metadata: Metadata = { title: 'People | logoless', robots: { index: false } }

type Row = { id: string; email: string; role: string; status: string; risk_level: string; risk_reasons: string | null; created_at: number; last_seen_at: number | null; handle: string | null; display_name: string | null; avatar_key: string | null; banner_kind: string | null; banner_value: string | null; badges_json: string | null; owed: number; clips: number }

const FILTERS = [
  { id: '', label: 'Everyone' },
  { id: 'live', label: 'Online now' },
  { id: 'new', label: 'New this week' },
  { id: 'team', label: 'Team' },
  { id: 'risk', label: 'Extra checks' },
  { id: 'restricted', label: 'Restricted' },
  { id: 'ip', label: 'Shared network' },
]

/** Everyone on logoless, as a short list. Open a person for the whole profile and every action: roles, messages, checks, balance, removal. */
export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string; f?: string; v?: string; risk?: string }> }) {
  await pageAdmin()
  const sp = await searchParams
  const q = (sp.q ?? '').trim().slice(0, 60)
  const f = sp.risk ? 'risk' : (sp.f ?? '')
  const view = sp.v === 'cards' ? 'cards' : 'list'
  const t = nowSec()
  const [holders, owners] = await Promise.all([roleHolders(), ownerEmails()])
  const where: string[] = ["u.email NOT LIKE 'deleted-%@deleted.invalid'"]
  const args: unknown[] = []
  if (q) {
    where.push('(u.email LIKE ?1 OR p.handle LIKE ?1 OR p.display_name LIKE ?1)')
    args.push(`%${q.replace(/[%_]/g, '')}%`)
  }
  if (f === 'live') where.push(`u.last_seen_at > ${t - 300}`)
  if (f === 'new') where.push(`u.created_at > ${t - 7 * 86400}`)
  if (f === 'risk') where.push("u.risk_level != 'low'")
  if (f === 'restricted') where.push("u.status != 'active'")
  if (f === 'ip') {
    const ids = await sharedIpUserIds()
    where.push(ids.length ? `u.id IN (${ids.map((x) => `'${x.replace(/[^\w-]/g, '')}'`).join(',')})` : '0')
  }
  const d = await db()
  const rows = (
    await d
      .prepare(
        `SELECT u.id, u.email, u.role, u.status, u.risk_level, u.risk_reasons, u.created_at, u.last_seen_at, p.handle, p.display_name, p.avatar_key, p.banner_kind, p.banner_value, p.badges_json,
           COALESCE((SELECT SUM(amount_cents) FROM ledger WHERE user_id = u.id AND account = 'clipper'), 0) AS owed,
           (SELECT COUNT(*) FROM submissions WHERE user_id = u.id) AS clips
         FROM users u LEFT JOIN profiles p ON p.user_id = u.id WHERE ${where.join(' AND ')} ORDER BY u.last_seen_at DESC, u.created_at DESC LIMIT 200`,
      )
      .bind(...args)
      .all<Row>()
  ).results
  const people: PersonPreview[] = rows
    .map((r) => {
      let badges: string[] = []
      try {
        badges = r.badges_json ? (JSON.parse(r.badges_json) as string[]) : []
      } catch {
        /* skip */
      }
      const kind = (r.banner_kind ?? 'preset') as PersonPreview['bannerKind']
      return {
        id: r.id,
        handle: r.handle,
        name: r.display_name ?? r.email.split('@')[0],
        avatar: avatarSrc(r.avatar_key, r.display_name ?? r.email.split('@')[0], r.handle ?? ''),
        bannerKind: kind,
        banner: kind === 'image' ? `/api/img/${r.banner_value}` : (r.banner_value ?? 'noir'),
        badges,
        roles: holders[r.id] ?? [],
        owner: owners.includes(r.email.toLowerCase()),
        status: r.status,
        online: Boolean(r.last_seen_at && r.last_seen_at > t - 300),
      }
    })
    .filter((p) => f !== 'team' || p.owner || p.roles.length > 0)

  const waiting = (await d.prepare("SELECT value FROM settings WHERE key LIKE 'deletion:%'").all<{ value: string }>()).results.map((r) => {
    try {
      return (JSON.parse(r.value) as { at: number }).at
    } catch {
      return t
    }
  })
  const link = (patch: Record<string, string>) => `/admin/people?${new URLSearchParams({ ...(q ? { q } : {}), ...(f ? { f } : {}), ...(view === 'cards' ? { v: 'cards' } : {}), ...patch })}`
  const byId = new Map(rows.map((r) => [r.id, r]))

  return (
    <>
      <PageHeader title="People" sub="Everyone on logoless. Open a person for their whole profile and every action: roles, messages, extra checks, balance and removal." />
      <PurgeDeletions waiting={waiting.length} due={waiting.filter((a) => a <= t - 30 * 86400).length} />
      <form action="/admin/people" className="mb-4 flex flex-wrap items-center gap-2">
        <input name="q" defaultValue={q} placeholder="Search name, handle or email" aria-label="Search people" className="h-11 w-full rounded-pill border border-line-strong bg-ink/80 px-5 text-sm focus:outline-none sm:w-80" />
        {f && <input type="hidden" name="f" value={f} />}
        {view === 'cards' && <input type="hidden" name="v" value="cards" />}
        <button className="h-11 rounded-pill bg-paper px-6 text-sm font-medium text-ink">Search</button>
      </form>
      <div className="mb-6 flex flex-wrap items-center gap-1.5">
        {FILTERS.map((x) => (
          <a key={x.id} href={link({ f: x.id })} aria-current={f === x.id ? 'true' : undefined} className={cn('inline-flex h-9 items-center rounded-pill border px-4 text-sm transition-colors duration-300', f === x.id ? 'border-white/[0.14] bg-white/[0.08] text-paper' : 'border-transparent text-paper/55 hover:text-paper')}>
            {x.label}
          </a>
        ))}
        <span className="ml-auto inline-flex rounded-pill border border-line p-0.5 text-sm">
          {(['list', 'cards'] as const).map((v) => (
            <a key={v} href={link({ v: v === 'cards' ? 'cards' : '' })} aria-current={view === v ? 'true' : undefined} className={cn('inline-flex h-8 items-center rounded-pill px-4 capitalize transition-colors duration-300', view === v ? 'bg-white/[0.1] text-paper' : 'text-paper/55 hover:text-paper')}>
              {v === 'cards' ? 'Profiles' : 'List'}
            </a>
          ))}
        </span>
      </div>
      {people.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-line-strong px-6 py-16 text-center text-mute">Nobody matches.</p>
      ) : view === 'cards' ? (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {people.map((p) => (
            <li key={p.id}>
              <PersonCard p={p} />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="overflow-hidden rounded-3xl border border-line bg-black/45">
          {people.map((p) => {
            const u = byId.get(p.id)
            if (!u) return null
            return (
              <li key={p.id} data-kb-row className="border-b border-line last:border-0">
                <Link data-kb-focus href={`/admin/people/${p.id}`} className="group flex items-center gap-4 px-5 py-4 transition-colors duration-300 hover:bg-white/[0.04]">
                  {p.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.avatar} alt="" className="size-11 shrink-0 rounded-pill object-cover" />
                  ) : (
                    <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-pill bg-white/[0.06] text-sm">{p.name.slice(0, 1).toUpperCase()}</span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="truncate text-[16px]">{p.name}</span>
                      {u.handle && <span className="text-sm text-mute">@{u.handle}</span>}
                      {p.online && <Badge tone="good">online</Badge>}
                      {(p.owner || p.roles.length > 0) && <Badge>{p.owner ? 'owner' : p.roles.join(', ')}</Badge>}
                      {u.status !== 'active' && <Badge tone="bad">{u.status}</Badge>}
                      {u.risk_level !== 'low' && <Badge tone="warn">extra checks</Badge>}
                    </span>
                    <span className="mt-0.5 block truncate text-[13px] text-mute">
                      {u.email} · joined {when(u.created_at)} · seen {when(u.last_seen_at)} · {u.clips} {u.clips === 1 ? 'clip' : 'clips'}
                      {u.owed > 0 ? ` · owed ${money(u.owed)}` : ''}
                    </span>
                    {u.risk_reasons && <span className="mt-0.5 block truncate text-xs text-amber-300/90">{u.risk_reasons}</span>}
                  </span>
                  <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-paper/30 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-paper/70" />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
      <p className="mt-6 text-xs text-mute">Showing up to 200 people, most recently active first.</p>
    </>
  )
}
