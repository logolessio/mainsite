import type { Metadata } from 'next'
import { SectionTabs } from '@/components/app/section-tabs'
import { Bars, Ranked } from '@/components/admin/charts'
import { CleanupLogs } from '@/components/admin/log-tools'
import { Badge } from '@/components/app/table'
import { Card, PageHeader } from '@/components/app/ui'
import { EXPORTS } from '@/lib/export-sets'
import { money } from '@/lib/format'
import { events, overview, RANGES, sinceFor, type Range } from '@/lib/log-stats'
import { pageAdmin } from '@/lib/user'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Logs | logoless', robots: { index: false } }

const KINDS = ['pageview', 'api', 'auth', 'security', 'error', 'clienterror', 'money', 'admin']
const TONE: Record<string, 'good' | 'neutral' | 'warn' | 'bad'> = { pageview: 'neutral', api: 'neutral', auth: 'good', security: 'warn', error: 'bad', clienterror: 'bad', money: 'good', admin: 'warn' }

type SP = { tab?: string; range?: string; kind?: string; q?: string; status?: string; actor?: string; p?: string }

const href = (sp: SP, over: Partial<SP>) => {
  const merged = { ...sp, ...over }
  const qs = new URLSearchParams(Object.entries(merged).filter(([, v]) => v) as [string, string][])
  return `/admin/logs?${qs}`
}

const n = (v: unknown) => Number(v ?? 0)
const when = (t: number) => new Date(t * 1000).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })

export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  await pageAdmin()
  const sp = await searchParams
  const tab = sp.tab === 'events' || sp.tab === 'export' ? sp.tab : 'overview'
  const range = (RANGES.some((r) => r.id === sp.range) ? sp.range : '7d') as Range
  const since = sinceFor(range)

  return (
    <>
      <SectionTabs group="system" />
      <PageHeader title="Logs" sub="Every request, page view, sign-in, security event and money movement on the site. Visitors are counted by a salted hash, never a raw address." />
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {(['overview', 'events', 'export'] as const).map((t) => (
          <a key={t} href={href(sp, { tab: t, p: undefined })} className={cn('inline-flex h-10 items-center rounded-full border px-5 text-sm capitalize', tab === t ? 'border-paper bg-paper text-ink' : 'border-line-strong text-mute hover:text-paper')}>
            {t === 'overview' ? 'Stats' : t}
          </a>
        ))}
        <span className="mx-2 hidden h-5 w-px bg-line-strong sm:block" />
        {RANGES.map((r) => (
          <a key={r.id} href={href(sp, { range: r.id, p: undefined })} className={cn('inline-flex h-9 items-center rounded-full border px-4 text-xs', range === r.id ? 'border-paper bg-paper/10' : 'border-line text-mute hover:text-paper')}>
            {r.label}
          </a>
        ))}
      </div>

      {tab === 'overview' && <Overview since={since} />}
      {tab === 'events' && <Events sp={sp} since={since} />}
      {tab === 'export' && <ExportTab sp={sp} range={range} />}
    </>
  )
}

async function Overview({ since }: { since: number }) {
  const o = await overview(since)
  const t = o.totals
  const b = o.business
  const m = o.money
  const tiles: [string, string | number, string?][] = [
    ['Page views', n(t.pageviews).toLocaleString()],
    ['Visitors', n(t.visitors).toLocaleString(), 'distinct networks'],
    ['Signed-in people', n(t.signedInPeople).toLocaleString()],
    ['Sign-ins', n(t.signins).toLocaleString()],
    ['API calls', n(t.api).toLocaleString()],
    ['Errors', n(t.errors).toLocaleString()],
    ['Security events', n(t.security).toLocaleString(), 'blocked or refused'],
    ['Money events', n(t.money).toLocaleString()],
    ['Admin actions', n(t.admin).toLocaleString()],
    ['Bots seen', n(t.bots).toLocaleString()],
    ['All events', n(t.events).toLocaleString()],
  ]
  return (
    <div className="grid gap-8">
      <section>
        <h2 className="mb-3 font-display text-3xl">Traffic and activity</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {tiles.map(([k, v, note]) => (
            <div key={k} className="rounded-[22px] border border-line bg-surface/70 p-4">
              <p className="font-mono text-[11px] text-mute">{k}</p>
              <p className="mt-2 font-display text-4xl leading-none">{v}</p>
              {note && <p className="mt-1.5 text-[11px] text-mute">{note}</p>}
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          <Bars data={o.series as never} field="views" label="Page views per day" />
          <Bars data={o.series as never} field="visitors" label="Visitors per day" color="#8fb8ff" />
          <Bars data={o.series as never} field="signins" label="Sign-ins per day" color="#7be0a0" />
          <Bars data={o.series as never} field="api" label="API calls per day" />
          <Bars data={o.series as never} field="errors" label="Errors per day" color="#ff6b6b" />
          <Bars data={o.series as never} field="security" label="Security events per day" color="#ffcf70" />
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        <Ranked title="Top pages" rows={o.pages as never} extra={(r) => `${n(r.u)} visitors`} />
        <Ranked title="Where visitors come from" rows={o.refs as never} />
        <Ranked title="Countries (visitors)" rows={o.countries as never} />
        <Ranked title="Browsers and devices" rows={o.devices as never} />
        <Ranked title="Busiest API routes" rows={o.routes as never} extra={(r) => `${n(r.ms)}ms · ${n(r.bad)} failed`} />
        <Ranked title="Slowest routes (average ms)" rows={(o.slow as { label: string; ms: number; n: number }[]).map((r) => ({ label: r.label, n: r.ms }))} unit="ms" />
        <Ranked title="Security events" rows={o.security as never} />
        <Ranked title="Errors" rows={o.errors as never} />
        <Ranked title="Most active people" rows={o.people as never} />
      </section>

      <section>
        <h2 className="mb-3 font-display text-3xl">The business</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
          {(
            [
              ['Members', n(b.users).toLocaleString(), `${n(b.newUsers)} new in range`],
              ['Profiles', n(b.profiles).toLocaleString()],
              ['Flagged accounts', n(b.flagged).toLocaleString()],
              ['Restricted', n(b.restricted).toLocaleString()],
              ['Campaigns', n(b.campaigns).toLocaleString(), `${n(b.liveCampaigns)} live`],
              ['Clips submitted', n(b.clips).toLocaleString(), `${n(b.pendingClips)} waiting`],
              ['Verified views', n(b.verifiedViews).toLocaleString()],
              ['Favourites', n(b.favourites).toLocaleString()],
              ['Badges unlocked', n(b.badges).toLocaleString()],
              ['Notifications sent', n(b.notifications).toLocaleString()],
              ['Paid in', money(n(m.paidIn))],
              ['Stripe costs', money(n(m.stripeCosts))],
              ['Gross to clippers', money(n(m.gross))],
              ['Site fees', money(n(m.fees))],
              ['Clippers earned', money(n(m.earned))],
              ['Paid out', money(n(m.paidOut)), `${n(m.payouts)} withdrawals`],
              ['Waiting for review', money(n(m.inReview))],
            ] as [string, string, string?][]
          ).map(([k, v, note]) => (
            <div key={k} className="rounded-[22px] border border-line bg-surface/70 p-4">
              <p className="font-mono text-[11px] text-mute">{k}</p>
              <p className="mt-2 font-display text-3xl leading-none">{v}</p>
              {note && <p className="mt-1.5 text-[11px] text-mute">{note}</p>}
            </div>
          ))}
        </div>
      </section>

      <Card title="Housekeeping">
        <CleanupLogs />
      </Card>
    </div>
  )
}

async function Events({ sp, since }: { sp: SP; since: number }) {
  const page = Math.max(0, Number(sp.p ?? 0) || 0)
  const { rows, total } = await events({ since, kind: KINDS.includes(sp.kind ?? '') ? sp.kind : undefined, q: sp.q?.slice(0, 80), status: sp.status, actor: sp.actor?.slice(0, 80) }, page)
  const pages = Math.max(1, Math.ceil(total / 100))
  return (
    <div>
      <form action="/admin/logs" className="mb-4 flex flex-wrap items-center gap-2">
        <input type="hidden" name="tab" value="events" />
        <input type="hidden" name="range" value={sp.range ?? '7d'} />
        <input name="q" defaultValue={sp.q} placeholder="Search path, name, detail" className="h-10 w-64 rounded-full border border-line-strong bg-ink/80 px-4 text-sm focus:outline-none" />
        <input name="actor" defaultValue={sp.actor} placeholder="Person (email)" className="h-10 w-52 rounded-full border border-line-strong bg-ink/80 px-4 text-sm focus:outline-none" />
        <select name="kind" defaultValue={sp.kind ?? ''} className="h-10 rounded-full border border-line-strong bg-ink/80 px-4 text-sm">
          <option value="">All kinds</option>
          {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
        <select name="status" defaultValue={sp.status ?? ''} className="h-10 rounded-full border border-line-strong bg-ink/80 px-4 text-sm">
          <option value="">Any status</option>
          <option value="bad">Failed (400+)</option>
          <option value="200">200</option>
          <option value="401">401</option>
          <option value="403">403</option>
          <option value="500">500</option>
        </select>
        <button className="h-10 rounded-full bg-paper px-5 text-sm font-medium text-ink">Filter</button>
        <a href={href({ ...sp, tab: 'export' }, { tab: 'export' })} className="text-sm text-mute underline underline-offset-4 hover:text-paper">Export this view</a>
      </form>
      <p className="mb-3 text-xs text-mute">{total.toLocaleString()} events match.</p>
      <div className="overflow-x-auto rounded-[22px] border border-line">
        <table className="w-full min-w-[1000px] text-left text-xs">
          <thead className="bg-surface text-mute">
            <tr>
              {['When', 'Kind', 'What', 'Status', 'ms', 'Person', 'Country', 'Device', 'From', 'Detail'].map((h) => <th key={h} className="px-3 py-2.5 font-mono font-normal">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={String(r.id)} className="border-t border-line align-top hover:bg-paper/[0.03]">
                <td className="px-3 py-2 whitespace-nowrap text-mute">{when(n(r.ts))}</td>
                <td className="px-3 py-2"><Badge tone={TONE[String(r.kind)] ?? 'neutral'}>{String(r.kind)}</Badge></td>
                <td className="max-w-[18rem] truncate px-3 py-2" title={String(r.path ?? r.name)}>{String(r.name)}{r.path && !String(r.name).includes(String(r.path)) ? <span className="text-mute"> {String(r.path)}</span> : null}</td>
                <td className={cn('px-3 py-2', n(r.status) >= 400 && 'text-signal')}>{r.status ?? ''}</td>
                <td className="px-3 py-2 text-mute">{r.ms ?? ''}</td>
                <td className="max-w-[12rem] truncate px-3 py-2">{String(r.actor ?? '')}</td>
                <td className="px-3 py-2 text-mute">{String(r.country ?? '')}</td>
                <td className="px-3 py-2 whitespace-nowrap text-mute">{String(r.ua ?? '')}</td>
                <td className="px-3 py-2 text-mute">{String(r.ref ?? '')}</td>
                <td className="max-w-[26rem] px-3 py-2 break-words text-mute">{String(r.detail ?? '')}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="p-8 text-center text-sm text-mute">Nothing matches.</p>}
      </div>
      <div className="mt-4 flex items-center justify-between text-sm">
        {page > 0 ? <a className="underline underline-offset-4" href={href(sp, { tab: 'events', p: String(page - 1) })}>← Newer</a> : <span />}
        <span className="text-mute">Page {page + 1} of {pages}</span>
        {page + 1 < pages ? <a className="underline underline-offset-4" href={href(sp, { tab: 'events', p: String(page + 1) })}>Older →</a> : <span />}
      </div>
    </div>
  )
}

function ExportTab({ sp, range }: { sp: SP; range: Range }) {
  const qs = (extra: Record<string, string>) => new URLSearchParams({ ...(sp.kind ? { kind: sp.kind } : {}), ...(sp.q ? { q: sp.q } : {}), ...(sp.status ? { status: sp.status } : {}), ...(sp.actor ? { actor: sp.actor } : {}), range, ...extra }).toString()
  return (
    <div className="grid gap-6">
      <Card title="Everything">
        <p className="text-sm text-mute">One JSON file with every table below (up to 250,000 rows each). People’s emails are inside, so keep it somewhere safe. Each export is written to the audit log.</p>
        <a href={`/api/admin/export?${qs({ dataset: 'all', format: 'json' })}`} className="mt-4 inline-flex h-11 items-center rounded-full bg-paper px-6 text-sm font-medium text-ink hover:bg-paper/85">Download everything (JSON)</a>
      </Card>
      <Card title="One table at a time">
        <ul className="divide-y divide-line">
          {EXPORTS.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="text-sm">{e.label}</p>
                <p className="text-xs text-mute">{e.note ?? e.cols.split(',').slice(0, 6).join(', ').replace(/\s+/g, ' ') + '…'}</p>
              </div>
              <div className="flex gap-2">
                <a href={`/api/admin/export?${qs({ dataset: e.id, format: 'csv' })}`} className="inline-flex h-9 items-center rounded-full border border-line-strong px-4 text-xs hover:bg-paper/10">CSV</a>
                <a href={`/api/admin/export?${qs({ dataset: e.id, format: 'json' })}`} className="inline-flex h-9 items-center rounded-full border border-line-strong px-4 text-xs hover:bg-paper/10">JSON</a>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-mute">The activity log export uses the time range above and the filters from the Events tab.</p>
      </Card>
    </div>
  )
}
