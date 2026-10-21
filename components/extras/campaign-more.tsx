import { CaptionKit } from '@/components/extras/caption-kit'
import { ShareBar } from '@/components/extras/share-bar'
import { TransitionLink } from '@/components/shell/transition-link'
import type { Campaign } from '@/lib/campaigns'
import { feedPage } from '@/lib/clip-feed'
import { featureOn } from '@/lib/features'

const compact = (n: number) => n.toLocaleString('en-US', { notation: 'compact', maximumFractionDigits: 1 })

/** Under a campaign's sheet: the best clips made for it so far, ways to share it, and a caption to start a clip with. Each is its own switch and shows nothing when it has nothing. */
export async function CampaignMore({ campaign }: { campaign: Campaign }) {
  const [top, share, caption] = await Promise.all([featureOn('campaign-top-clips'), featureOn('campaign-share-cards'), featureOn('caption-kit')])
  if (!top && !share && !caption) return null
  const clips = top ? (await feedPage({ sort: 'views', campaign: campaign.id, viewerId: null }).catch(() => ({ clips: [] }))).clips.slice(0, 3) : []
  if (!clips.length && !share && !caption) return null
  return (
    <div className="mx-auto mt-10 grid max-w-5xl gap-10 px-4">
      {clips.length > 0 && (
        <section aria-label="Top clips for this campaign">
          <h2 className="border-b border-line pb-3 font-display text-2xl">Top clips so far</h2>
          <ul className="mt-5 grid gap-4 sm:grid-cols-3">
            {clips.map((k, i) => (
              <li key={k.id}>
                <a href={k.url} target="_blank" rel="noopener noreferrer" className="group block">
                  <div className="relative aspect-[9/12] overflow-hidden rounded-card border border-line bg-white/[0.03]">
                    {k.thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`/clip-thumb/${k.id}`} alt="" className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                    ) : null}
                    <span className="absolute top-3 left-3 grid size-8 place-items-center rounded-pill bg-black/65 font-display text-lg backdrop-blur">{i + 1}</span>
                  </div>
                  <p className="mt-3 truncate text-[15px]">{k.title || `A clip by ${k.by.name}`}</p>
                  <p className="text-sm text-mute">
                    {k.by.name} · {compact(k.views)} views
                  </p>
                </a>
              </li>
            ))}
          </ul>
          <TransitionLink href={`/submissions?campaign=${campaign.id}`} className="mt-4 inline-block text-sm text-mute underline underline-offset-4 hover:text-paper">
            See every clip
          </TransitionLink>
        </section>
      )}
      {caption && <CaptionKit title={campaign.title} creator={campaign.creator} platforms={campaign.platforms} />}
      {share && <ShareBar id={campaign.id} title={campaign.title} creator={campaign.creator} />}
    </div>
  )
}
