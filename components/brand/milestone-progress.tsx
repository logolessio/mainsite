/** A quiet line under the overview's numbers: how far the views are from the next milestone. */
export function MilestoneProgress({ views, from, to }: { views: number; from: number; to: number }) {
  const pct = Math.min(100, Math.max(0, ((views - from) / (to - from)) * 100))
  return (
    <div className="mt-5 border-t border-line pt-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-[13px]">
        <span className="text-mute">Next milestone: {to.toLocaleString('en-US')} verified views</span>
        <span className="text-paper/70 tabular-nums">{(to - views).toLocaleString('en-US')} to go</span>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-pill bg-white/10" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label="Progress to the next milestone">
        <div className="h-full rounded-pill bg-paper" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
