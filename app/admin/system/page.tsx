import type { Metadata } from 'next'
import { Bars, Ranked } from '@/components/admin/charts'
import { ActionLink } from '@/components/app/action-link'
import { Badge } from '@/components/app/table'
import { Card, PageHeader, StatCard } from '@/components/app/ui'
import { counts, funds, health } from '@/lib/admin-stats'
import { integrity, recentErrors } from '@/lib/dev-stats'
import { FEATURES } from '@/lib/feature-defs'
import { readLive, requestHost } from '@/lib/features'
import { money } from '@/lib/format'
import { overview, sinceFor } from '@/lib/log-stats'
import { pageAdmin } from '@/lib/user'

export const metadata: Metadata = { title: 'System | logoless', robots: { index: false } }

const when = (ts: number) => new Date(ts * 1000).toISOString().replace('T', ' ').slice(5, 16)

/** Everything vital on one screen: is the site healthy, is the money consistent, what is breaking, what is slow. */
export default async function Page() {
  await pageAdmin()
  const [h, c, f, checks, errors, o, live, host] = await Promise.all([health(), counts(), funds(), integrity(), recentErrors(), overview(sinceFor('7d')), readLive(), requestHost()])
  const t = o.totals as Record<string, number>
  const waiting = FEATURES.filter((x) => live[x.id] !== true).length
  const bad = [...h.filter((x) => x.state !== 'ok').map((x) => x.label), ...checks.filter((x) => !x.ok).map((x) => x.label)]
  return (
    <>
      <PageHeader
        title="System health"
        sub={bad.length ? `${bad.length} thing${bad.length > 1 ? 's' : ''} to look at: ${bad.join(', ')}.` : 'Everything is healthy.'}
        actions={
          <div className="flex flex-wrap gap-2">
            <ActionLink href="/?site=1">Open the site</ActionLink>
            <ActionLink href="/admin/design">Design</ActionLink>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active now" value={String(c.activeNow ?? 0)} note="Signed in, last 5 minutes" />
        <StatCard label="Page views, 7 days" value={String(t.pageviews ?? 0)} note={`${t.visitors ?? 0} visitors`} />
        <StatCard label="Errors, 7 days" value={String(t.errors ?? 0)} note={`${t.security ?? 0} security events`} />
        <StatCard label="Features not live" value={String(waiting)} note={`${FEATURES.length - waiting} of ${FEATURES.length} pushed`} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Bars data={o.series as never} field="views" label="Page views per day" />
        <Bars data={o.series as never} field="errors" label="Errors per day" color="#ff6b5e" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Services">
          <ul className="divide-y divide-line">
            {h.map((x) => (
              <li key={x.key} className="flex items-center justify-between gap-4 py-2.5 text-sm">
                <span>{x.label}</span>
                <span className="flex items-center gap-3 text-right text-mute">
                  <span className="hidden sm:inline">{x.detail}</span>
                  <Badge tone={x.state === 'ok' ? 'good' : x.state === 'bad' ? 'bad' : 'warn'}>{x.state === 'ok' ? 'OK' : x.state === 'bad' ? 'Fix' : 'Check'}</Badge>
                </span>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Money checks">
          <ul className="divide-y divide-line">
            {checks.map((x) => (
              <li key={x.key} className="flex items-center justify-between gap-4 py-2.5 text-sm">
                <span>{x.label}</span>
                <span className="flex items-center gap-3 text-mute">
                  {x.detail}
                  <Badge tone={x.ok ? 'good' : 'bad'}>{x.ok ? 'OK' : 'Look'}</Badge>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-mute">
            Held for campaigns {money(f.heldForCampaigns)} · brand balances {money(f.brandBalances)} · owed to clippers {money(f.owedToClippers)} · site fees {money(f.fees)} · PayPal costs {money(f.paypalCosts)}.
          </p>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Ranked title="Slowest routes (ms)" rows={(o.slow as { label: string; ms: number }[]).map((r) => ({ label: r.label, n: r.ms }))} unit="ms" />
        <Ranked title="Busiest routes" rows={o.routes as never} />
      </div>

      <Card title="Latest errors" className="mt-6">
        {errors.length === 0 ? (
          <p className="text-sm text-mute">No errors logged. Nice.</p>
        ) : (
          <ul className="divide-y divide-line">
            {errors.map((e) => (
              <li key={e.id} className="grid gap-1 py-2.5 text-sm sm:grid-cols-[110px_1fr]">
                <span className="font-mono text-xs text-mute">{when(e.ts)}</span>
                <span className="min-w-0">
                  <span className="font-medium">{e.name}</span> <span className="text-mute">{e.path ?? ''}</span>
                  {e.detail && <span className="block truncate text-xs text-mute">{e.detail}</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
        <ActionLink href="/admin/logs" className="mt-4">All logs</ActionLink>
      </Card>

      <p className="mt-6 px-1 font-mono text-[11px] text-mute">host {host || 'unknown'} · {process.env.SITE_ENV ?? process.env.NODE_ENV}</p>
    </>
  )
}
