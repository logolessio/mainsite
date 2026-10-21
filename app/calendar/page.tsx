import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { Breadcrumbs } from '@/components/marketing/breadcrumbs'
import { TransitionLink } from '@/components/shell/transition-link'
import { liveCampaigns } from '@/lib/campaigns-db'
import { parseEnds } from '@/lib/ends'
import { featureOn } from '@/lib/features'
import { CONTAINER } from '@/lib/layout'

export const metadata: Metadata = { title: 'Campaign calendar | logoless', description: 'When every live campaign ends, soonest first.' }

const day = (t: number) => new Date(t * 1000).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })

/** The live campaigns laid out by when they end: this week, next week, later, and the ones with no end date. */
export default async function Page() {
  await connection()
  if (!(await featureOn('campaign-calendar'))) notFound()
  const now = Math.floor(Date.now() / 1000)
  const live = await liveCampaigns()
  const rows = live.map((c) => ({ c, end: parseEnds(c.endsOn) }))
  const week = 7 * 86400
  const groups: { title: string; items: typeof rows }[] = [
    { title: 'This week', items: rows.filter((r) => r.end !== null && r.end >= now && r.end < now + week) },
    { title: 'Next week', items: rows.filter((r) => r.end !== null && r.end >= now + week && r.end < now + 2 * week) },
    { title: 'Later', items: rows.filter((r) => r.end !== null && r.end >= now + 2 * week) },
    { title: 'No end date', items: rows.filter((r) => r.end === null) },
  ]
  for (const g of groups) g.items.sort((a, b) => (a.end ?? 0) - (b.end ?? 0))
  return (
    <main className={`${CONTAINER} pt-24 pb-32`}>
      <Breadcrumbs trail={[{ name: 'Calendar' }]} />
      <h1 className="mt-8 font-display text-5xl tracking-[-0.03em] md:text-7xl">Campaign calendar</h1>
      <p className="mt-4 max-w-xl text-lg leading-relaxed text-mute">When every live campaign ends. Post before the date, and check the budget left.</p>
      <div className="mt-12 grid gap-12">
        {groups.map(
          (g) =>
            g.items.length > 0 && (
              <section key={g.title}>
                <h2 className="border-b border-line pb-3 font-display text-2xl">{g.title}</h2>
                <ul>
                  {g.items.map(({ c, end }) => (
                    <li key={c.id} className="border-b border-line">
                      <TransitionLink href={`/campaign/${c.id}`} className="flex items-center gap-4 py-4 transition-colors hover:bg-white/[0.02]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={c.cover} alt="" className="size-12 shrink-0 rounded-chip object-cover" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[17px] leading-tight">{c.title}</span>
                          <span className="block truncate text-sm text-mute">
                            {c.creator} · ${c.ratePer1k.toFixed(2)} per 1,000 · {c.budgetLeftPct ?? 100}% left
                          </span>
                        </span>
                        <span className="shrink-0 text-sm text-mute tabular-nums">{end ? day(end) : ''}</span>
                      </TransitionLink>
                    </li>
                  ))}
                </ul>
              </section>
            ),
        )}
      </div>
    </main>
  )
}
