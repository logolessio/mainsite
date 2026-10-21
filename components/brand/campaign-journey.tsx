import { cn } from '@/lib/utils'

const STEPS = ['Sent', 'Reviewed', 'Funded', 'Live'] as const
/** How far along each state is: the number of steps done, the next one is the one it is waiting on. */
const DONE: Record<string, number> = { requested: 1, awaiting_payment: 2, paid: 3, live: 4, paused: 4, ended: 4 }
const WAITING_ON: Record<string, string> = { requested: 'Waiting for the team to read it', awaiting_payment: 'Add funds to your balance to start', paid: 'Going live shortly' }

/** Where a campaign is on its way to going live: sent, reviewed, funded, live. Says what it is waiting on. */
export function CampaignJourney({ status, className }: { status: string; className?: string }) {
  const done = DONE[status]
  if (done === undefined || done >= 4) return null
  return (
    <div className={cn('max-w-md', className)} aria-label={`Progress: ${WAITING_ON[status] ?? ''}`}>
      <ol className="grid grid-cols-4 gap-1.5">
        {STEPS.map((s, i) => (
          <li key={s}>
            <span className={cn('block h-1 rounded-pill', i < done ? 'bg-paper' : i === done ? 'animate-pulse bg-paper/45' : 'bg-white/12')} />
            <span className={cn('mt-1.5 block text-[11px]', i < done ? 'text-paper' : 'text-mute')}>{s}</span>
          </li>
        ))}
      </ol>
      <p className="mt-1 text-xs text-mute">{WAITING_ON[status]}</p>
    </div>
  )
}
