import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { Breadcrumbs } from '@/components/marketing/breadcrumbs'
import { TransitionLink } from '@/components/shell/transition-link'
import { FEATURES } from '@/lib/feature-defs'
import { featureOn, featureState, pushLog } from '@/lib/features'
import { CONTAINER } from '@/lib/layout'

export const metadata: Metadata = { title: "What's new | logoless", description: 'What has been added to logoless lately.' }

/** What has gone live, newest first. It lists only what is switched on for everyone, from the same switches the owner pushes. */
export default async function Page() {
  await connection()
  if (!(await featureOn('whats-new'))) notFound()
  const st = await featureState()
  const log = await pushLog().catch(() => [])
  const when = new Map<string, number>()
  for (const e of [...log].sort((a, b) => a.at - b.at)) for (const id of e.ids) e.action === 'push' ? when.set(id, e.at) : when.delete(id)
  const live = FEATURES.filter((f) => st.live[f.id] === true || st.dev)
    .map((f) => ({ f, at: when.get(f.id) ?? 0 }))
    .sort((a, b) => b.at - a.at)
  return (
    <main className={`${CONTAINER} pt-24 pb-32`}>
      <Breadcrumbs trail={[{ name: "What's new" }]} />
      <h1 className="mt-8 font-display text-5xl tracking-[-0.03em] md:text-7xl">What&apos;s new</h1>
      <p className="mt-4 max-w-xl text-lg leading-relaxed text-mute">Everything added lately, with where to find it.</p>
      <ul className="mt-12 max-w-3xl divide-y divide-line border-y border-line">
        {live.map(({ f, at }) => (
          <li key={f.id} className="py-6">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h2 className="text-xl">{f.name}</h2>
              {at > 0 && <p className="text-sm text-mute">{new Date(at * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>}
            </div>
            <p className="mt-2 text-[15px] leading-relaxed text-mute">{f.description}</p>
            {!f.path.startsWith('/admin') && !f.path.startsWith('/dev') && (
              <TransitionLink href={f.path} className="mt-3 inline-block text-sm underline underline-offset-4 transition-colors hover:text-paper">
                Try it
              </TransitionLink>
            )}
          </li>
        ))}
      </ul>
    </main>
  )
}
