import { Download } from 'lucide-react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Card, PageHeader } from '@/components/app/ui'
import { featureOn } from '@/lib/features'
import { yearlyTotals } from '@/lib/growth'
import { pageUser } from '@/lib/user'

export const metadata: Metadata = { title: 'Tax summary | logoless', robots: { index: false } }

const usd = (c: number) => `$${(c / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/** What was earned and withdrawn in each year, with the spreadsheet for it. A summary of the records, not tax advice. */
export default async function Page() {
  const user = await pageUser()
  if (!(await featureOn('tax-summary'))) notFound()
  const csv = await featureOn('export-csv')
  const years = await yearlyTotals(user.id)
  return (
    <>
      <PageHeader title="Tax summary" sub="What you earned and withdrew in each year, ready for your own records." />
      {years.length === 0 ? (
        <p className="rounded-card border border-dashed border-line-strong px-6 py-14 text-center text-mute">Nothing earned yet. Your years appear here once you are paid.</p>
      ) : (
        <div className="grid max-w-3xl gap-4">
          {years.map((y) => (
            <Card key={y.year}>
              <div className="flex flex-wrap items-end justify-between gap-4 p-6">
                <div>
                  <p className="text-sm text-mute">{y.year}</p>
                  <p className="mt-1 font-display text-5xl leading-none tabular-nums">{usd(y.earnedCents)}</p>
                  <p className="mt-3 text-sm text-mute">
                    earned from {y.clips} {y.clips === 1 ? 'clip' : 'clips'} · {usd(y.paidOutCents)} withdrawn
                  </p>
                </div>
                {csv && (
                  <div className="flex flex-wrap gap-2">
                    <a href={`/api/me/export/earnings?year=${y.year}`} className="inline-flex h-10 items-center gap-2 rounded-pill border border-line-strong px-4 text-sm transition-colors hover:bg-white/[0.06]">
                      <Download aria-hidden="true" className="size-4" /> Earnings
                    </a>
                    <a href={`/api/me/export/payouts?year=${y.year}`} className="inline-flex h-10 items-center gap-2 rounded-pill border border-line-strong px-4 text-sm transition-colors hover:bg-white/[0.06]">
                      <Download aria-hidden="true" className="size-4" /> Withdrawals
                    </a>
                  </div>
                )}
              </div>
            </Card>
          ))}
          <p className="max-w-xl text-sm leading-relaxed text-mute">This is a summary of what logoless has recorded. It is not tax advice, and what you owe depends on where you live. Keep it with your other records, and ask an accountant if you are unsure.</p>
        </div>
      )}
    </>
  )
}
