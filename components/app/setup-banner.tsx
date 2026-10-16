import type { SetupStep } from '@/lib/setup-steps'
import { ActionLink } from './action-link'

/** On an overview page: how far along set-up is, and the one thing to do next. Gone once everything needed is done. */
export function SetupBanner({ steps, guide }: { steps: SetupStep[]; guide: string }) {
  const needed = steps.filter((s) => !s.optional)
  const done = needed.filter((s) => s.done).length
  const next = needed.find((s) => !s.done)
  if (!next) return null
  return (
    <section aria-label="Finish setting up" className="mb-14 rounded-[2rem] border border-line-strong bg-black/45 p-6 md:p-8">
      <div className="flex items-center justify-between gap-4">
        <p className="text-[15px] text-paper/55">Finish setting up</p>
        <p className="text-[15px] text-paper/55 tabular-nums">
          {done} of {needed.length} done
        </p>
      </div>
      <div className="mt-3 flex gap-1.5" role="progressbar" aria-valuemin={0} aria-valuemax={needed.length} aria-valuenow={done} aria-label="Set-up steps done">
        {needed.map((s) => (
          <span key={s.id} className={s.done ? 'h-1.5 flex-1 rounded-full bg-paper' : 'h-1.5 flex-1 rounded-full bg-white/12'} />
        ))}
      </div>
      <h2 className="mt-6 font-display text-3xl leading-[1.05] tracking-[-0.03em] md:text-4xl">{next.title}</h2>
      <p className="mt-2 text-[16px] text-paper/60">{next.short}</p>
      <div className="mt-6 flex flex-wrap gap-2">
        <ActionLink href={next.id === 'verify' ? guide : (next.href ?? guide)}>{next.id === 'verify' ? 'Confirm it now' : (next.cta ?? 'Continue')}</ActionLink>
        <ActionLink href={guide} variant="ghost">
          See all the steps
        </ActionLink>
      </div>
    </section>
  )
}
