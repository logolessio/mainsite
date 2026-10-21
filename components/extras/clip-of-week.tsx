import Link from 'next/link'
import { feedPage } from '@/lib/clip-feed'
import { featureOn } from '@/lib/features'

const compact = (n: number) => n.toLocaleString('en-US', { notation: 'compact', maximumFractionDigits: 1 })

/** The most viewed clip submitted in the last seven days, from creators who allow their clips on the public feed. Hidden when there is not one. */
export async function ClipOfTheWeek() {
  if (!(await featureOn('clip-of-the-week'))) return null
  const { clips } = await feedPage({ sort: 'views', viewerId: null }).catch(() => ({ clips: [] }))
  const week = Math.floor(Date.now() / 1000) - 7 * 86400
  const k = clips.find((c) => c.submittedAt >= week && c.views > 0)
  if (!k) return null
  return (
    <section aria-label="Clip of the week" className="mt-20">
      <h2 className="border-b border-line pb-4 font-display text-3xl tracking-[-0.03em]">Clip of the week</h2>
      <a href={k.url} target="_blank" rel="noopener noreferrer" className="group mt-6 grid items-center gap-6 rounded-card border border-line bg-white/[0.02] p-4 transition-colors hover:border-line-strong sm:grid-cols-[10rem_1fr]">
        <div className="aspect-[9/12] w-40 overflow-hidden rounded-panel bg-white/[0.04]">
          {k.thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/clip-thumb/${k.id}`} alt="" className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
          ) : null}
        </div>
        <div className="min-w-0">
          <p className="font-display text-4xl leading-none tabular-nums">{compact(k.views)} views</p>
          <p className="mt-3 truncate text-xl">{k.title || `A clip by ${k.by.name}`}</p>
          <p className="mt-1 text-mute">
            {k.by.name} · for {k.campaign.title}
          </p>
          <p className="mt-4 text-sm text-mute underline underline-offset-4 group-hover:text-paper">Watch it</p>
        </div>
      </a>
      <Link href="/submissions" className="mt-4 inline-block text-sm text-mute underline underline-offset-4 hover:text-paper">
        See every clip
      </Link>
    </section>
  )
}
