import { Download, FileText, Image as ImageIcon, PackageOpen } from 'lucide-react'
import Link from 'next/link'
import { featureOn } from '@/lib/features'

const chip = 'inline-flex h-10 items-center gap-2 rounded-pill border border-line-strong px-4 text-sm transition-colors hover:bg-white/[0.06]'

/** A row of ways to take your numbers away: the tax summary, spreadsheets, a picture to share, and everything logoless keeps about you. Each is its own switch. */
export async function RecordsBar() {
  const [tax, csv, share, data] = await Promise.all([featureOn('tax-summary'), featureOn('export-csv'), featureOn('earnings-share-card'), featureOn('data-download')])
  if (!tax && !csv && !share && !data) return null
  return (
    <div className="mb-6 flex flex-wrap items-center gap-2" aria-label="Your records">
      {tax && (
        <Link href="/dashboard/earnings/tax" className={chip}>
          <FileText aria-hidden="true" className="size-4" /> Tax summary
        </Link>
      )}
      {csv && (
        <>
          <a href="/api/me/export/earnings" className={chip}>
            <Download aria-hidden="true" className="size-4" /> Earnings (CSV)
          </a>
          <a href="/api/me/export/submissions" className={chip}>
            <Download aria-hidden="true" className="size-4" /> Submissions (CSV)
          </a>
        </>
      )}
      {share && (
        <a href="/api/share/earnings?download=1" className={chip}>
          <ImageIcon aria-hidden="true" className="size-4" /> Share what I earned
        </a>
      )}
      {data && (
        <a href="/api/me/export.json" className={chip}>
          <PackageOpen aria-hidden="true" className="size-4" /> All my data
        </a>
      )}
    </div>
  )
}
