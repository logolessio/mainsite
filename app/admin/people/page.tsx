import type { Metadata } from 'next'
import { PersonCard, type PersonPreview } from '@/components/admin/person-card'
import { PageHeader } from '@/components/app/ui'
import { db, nowSec } from '@/lib/db'
import { ownerEmails, roleHolders } from '@/lib/roles'
import { pageAdmin } from '@/lib/user'

export const metadata: Metadata = { title: 'People | logoless', robots: { index: false } }

type Row = { id: string; email: string; status: string; last_seen_at: number | null; handle: string | null; display_name: string | null; avatar_key: string | null; banner_kind: string | null; banner_value: string | null; badges_json: string | null }

const FILTERS = [
  { id: '', label: 'Everyone' },
  { id: 'team', label: 'Team' },
  { id: 'live', label: 'Online now' },
  { id: 'new', label: 'New this week' },
]

/** Every member as a small profile preview. Open one to see the whole profile and give them a role. */
export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string; f?: string }> }) {
  await pageAdmin()
  const sp = await searchParams
  const q = (sp.q ?? '').trim().slice(0, 60)
  const f = sp.f ?? ''
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
  const d = await db()
  const rows = (
    await d
      .prepare(
        `SELECT u.id, u.email, u.status, u.last_seen_at, p.handle, p.display_name, p.avatar_key, p.banner_kind, p.banner_value, p.badges_json
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
        avatar: r.avatar_key ? `/api/img/${r.avatar_key}` : null,
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

  return (
    <>
      <PageHeader title="People" sub="Everyone on logoless. Open a profile to see all of it and to give someone a role." />
      <form action="/admin/people" className="mb-6 flex flex-wrap items-center gap-2">
        <input name="q" defaultValue={q} placeholder="Search name, handle or email" className="h-10 w-72 rounded-full border border-line-strong bg-ink/80 px-4 text-sm focus:outline-none" />
        <select name="f" defaultValue={f} className="h-10 rounded-full border border-line-strong bg-ink/80 px-4 text-sm">
          {FILTERS.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
        </select>
        <button className="h-10 rounded-full bg-paper px-5 text-sm font-medium text-ink">Search</button>
      </form>
      {people.length === 0 ? (
        <p className="py-16 text-center text-sm text-mute">Nobody matches.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {people.map((p) => (
            <li key={p.id}>
              <PersonCard p={p} />
            </li>
          ))}
        </ul>
      )}
      <p className="mt-6 text-xs text-mute">Showing up to 200 people, most recently active first.</p>
    </>
  )
}
