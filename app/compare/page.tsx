import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { ComparePicker } from '@/components/extras/compare-picker'
import { Breadcrumbs } from '@/components/marketing/breadcrumbs'
import { TransitionLink } from '@/components/shell/transition-link'
import { liveCampaigns } from '@/lib/campaigns-db'
import { featureOn } from '@/lib/features'
import { CONTAINER } from '@/lib/layout'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Compare campaigns | logoless', description: 'Put up to three live campaigns side by side: rate, budget left, rules, platforms.' }

/** Up to three live campaigns in columns. The best figure in each numeric row is picked out. */
export default async function Page({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  await connection()
  if (!(await featureOn('campaign-compare'))) notFound()
  const { c } = await searchParams
  const live = await liveCampaigns()
  const picked = (c ?? '').split(',').filter((id) => live.some((l) => l.id === id)).slice(0, 3)
  const cols = picked.map((id) => live.find((l) => l.id === id)!)
  const best = (vals: (number | undefined)[], high = true) => {
    const nums = vals.filter((v): v is number => typeof v === 'number')
    return nums.length > 1 ? (high ? Math.max(...nums) : Math.min(...nums)) : null
  }
  const rate = best(cols.map((x) => x.ratePer1k))
  const left = best(cols.map((x) => x.budgetLeftPct ?? 100))
  const rows: { label: string; cells: React.ReactNode[]; win?: (i: number) => boolean }[] = [
    { label: 'Pays per 1,000 views', cells: cols.map((x) => `$${x.ratePer1k.toFixed(2)}`), win: (i) => cols[i].ratePer1k === rate },
    { label: 'Budget left', cells: cols.map((x) => `${x.budgetLeftPct ?? 100}%`), win: (i) => (cols[i].budgetLeftPct ?? 100) === left },
    { label: 'Total budget', cells: cols.map((x) => `$${x.budget.toLocaleString('en-US')}`) },
    { label: 'Ends', cells: cols.map((x) => x.endsOn || 'No end date') },
    { label: 'Platforms', cells: cols.map((x) => x.platforms.map((p) => ({ tiktok: 'TikTok', youtube: 'YouTube', instagram: 'Instagram' })[p]).join(', ')) },
    { label: 'Most one clip earns', cells: cols.map((x) => (x.capPerPost ? `$${x.capPerPost.toLocaleString('en-US')}` : 'No limit')) },
    { label: 'Most one creator earns', cells: cols.map((x) => (x.capPerUser ? `$${x.capPerUser.toLocaleString('en-US')}` : 'No limit')) },
    { label: 'What to make', cells: cols.map((x) => (x.clipThis.length ? <ul className="grid gap-1">{x.clipThis.slice(0, 5).map((t) => <li key={t}>{t}</li>)}</ul> : 'Not said')) },
    { label: 'Off limits', cells: cols.map((x) => (x.offLimits.length ? <ul className="grid gap-1">{x.offLimits.slice(0, 5).map((t) => <li key={t}>{t}</li>)}</ul> : 'Not said')) },
  ]
  return (
    <main className={`${CONTAINER} pt-24 pb-32`}>
      <Breadcrumbs trail={[{ name: 'Compare' }]} />
      <h1 className="mt-8 font-display text-5xl tracking-[-0.03em] md:text-7xl">Compare campaigns</h1>
      <p className="mt-4 max-w-xl text-lg leading-relaxed text-mute">Pick up to three. Put the rate, the budget left and the rules next to each other, then choose where your clip goes.</p>
      <div className="mt-8">
        <ComparePicker options={live.map((l) => ({ id: l.id, title: l.title, creator: l.creator }))} picked={picked} />
      </div>
      {cols.length > 0 ? (
        <div className="mt-10 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr>
                <th className="w-44 pb-4" />
                {cols.map((x) => (
                  <th key={x.id} className="pr-6 pb-4 align-bottom font-normal">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={x.cover} alt="" className="mb-3 size-20 rounded-panel object-cover" />
                    <TransitionLink href={`/campaign/${x.id}`} className="block text-xl leading-tight underline-offset-4 hover:underline">
                      {x.title}
                    </TransitionLink>
                    <span className="text-sm text-mute">{x.creator}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label} className="border-t border-line align-top">
                  <th scope="row" className="py-4 pr-4 text-sm font-normal text-mute">
                    {r.label}
                  </th>
                  {r.cells.map((cell, i) => (
                    <td key={i} className={cn('py-4 pr-6 text-[15px] leading-snug', r.win?.(i) && 'font-medium text-paper')}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-12 rounded-card border border-dashed border-line-strong px-6 py-14 text-center text-mute">Choose a campaign above to start.</p>
      )}
    </main>
  )
}
