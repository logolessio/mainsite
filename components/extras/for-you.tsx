import { TransitionLink } from '@/components/shell/transition-link'
import { featureOn } from '@/lib/features'
import { picksFor } from '@/lib/foryou'

/** "Picked for you" on the creator dashboard: up to three live campaigns, each with the reasons it was picked. */
export async function ForYou({ userId }: { userId: string }) {
  if (!(await featureOn('for-you'))) return null
  const picks = await picksFor(userId)
  if (!picks.length) return null
  return (
    <section aria-label="Picked for you" className="mt-16">
      <h2 className="border-b border-line pb-4 font-display text-3xl tracking-[-0.03em]">Picked for you</h2>
      <ul className="mt-6 grid gap-4 md:grid-cols-3">
        {picks.map(({ campaign: c, reasons }) => (
          <li key={c.id}>
            <TransitionLink href={`/campaign/${c.id}`} className="group flex h-full flex-col rounded-card border border-line bg-white/[0.02] p-4 transition-colors hover:border-line-strong hover:bg-white/[0.04]">
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.cover} alt="" className="size-14 shrink-0 rounded-panel object-cover" />
                <div className="min-w-0">
                  <p className="truncate text-lg leading-tight">{c.title}</p>
                  <p className="truncate text-sm text-mute">
                    {c.creator} · ${c.ratePer1k.toFixed(2)} per 1,000
                  </p>
                </div>
              </div>
              <ul className="mt-4 grid gap-1 text-sm text-paper/70">
                {reasons.map((r) => (
                  <li key={r} className="flex gap-2">
                    <span aria-hidden="true" className="mt-[9px] size-1 shrink-0 rounded-pill bg-paper/50" />
                    {r}
                  </li>
                ))}
              </ul>
            </TransitionLink>
          </li>
        ))}
      </ul>
    </section>
  )
}
