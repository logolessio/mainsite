import { Card } from '@/components/app/ui'
import { TransitionLink } from '@/components/shell/transition-link'
import { campaignHealth } from '@/lib/campaign-health'
import { featureOn } from '@/lib/features'
import { cn } from '@/lib/utils'

const LABEL = { good: 'On track', slow: 'Slow', fast: 'Fast', look: 'Needs a look' } as const

/** On the brand overview: how each live campaign is going against its time and budget, with what to try. Hidden with no live campaigns. */
export async function CampaignHealth({ userId }: { userId: string }) {
  if (!(await featureOn('campaign-health'))) return null
  const list = await campaignHealth(userId)
  if (!list.length) return null
  return (
    <Card className="mt-6" title="How your campaigns are going" sub="Budget used against time passed, and what to try if it is off.">
      <ul className="divide-y divide-line px-6 pb-2">
        {list.map((h) => (
          <li key={h.id} className="py-5">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={h.cover} alt="" className="size-11 shrink-0 rounded-panel object-cover" />
              <div className="min-w-0 flex-1 basis-60">
                <p className="flex flex-wrap items-center gap-2 text-[15px]">
                  <TransitionLink href={`/campaign/${h.id}`} className="truncate underline-offset-4 hover:underline">
                    {h.title}
                  </TransitionLink>
                  <span className={cn('rounded-chip border px-2 py-0.5 text-xs', h.state === 'good' ? 'border-line-strong text-mute' : 'border-paper/40 text-paper')}>{LABEL[h.state]}</span>
                </p>
                <p className="mt-0.5 text-sm text-mute">{h.headline}</p>
              </div>
              <div className="w-44 shrink-0">
                <div className="flex justify-between text-xs text-mute">
                  <span>Budget {h.burnPct}%</span>
                  {h.timePct !== null && <span>Time {h.timePct}%</span>}
                </div>
                <div className="relative mt-1.5 h-1.5 overflow-hidden rounded-pill bg-white/10">
                  <div className="absolute inset-y-0 left-0 rounded-pill bg-paper" style={{ width: `${Math.min(100, h.burnPct)}%` }} />
                  {h.timePct !== null && <div className="absolute inset-y-[-2px] w-px bg-paper/60" style={{ left: `${h.timePct}%` }} aria-hidden="true" />}
                </div>
              </div>
            </div>
            {h.tips.length > 0 && (
              <ul className="mt-3 grid gap-1 pl-[3.75rem] text-sm text-paper/70">
                {h.tips.map((t) => (
                  <li key={t} className="flex gap-2">
                    <span aria-hidden="true" className="mt-[9px] size-1 shrink-0 rounded-pill bg-paper/40" />
                    {t}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </Card>
  )
}
