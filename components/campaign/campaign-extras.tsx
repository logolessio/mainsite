import { ExternalLink, FolderOpen } from 'lucide-react'
import { BrandIcon } from '@/components/brand-icon'
import { exampleLink, type CampaignExtras } from '@/lib/campaign-extras-shared'
import { embedSrc, isTall, postId } from '@/lib/clip-embed'

const iconFor = (url: string) => (/tiktok\.com/.test(url) ? 'tiktok' : /instagram\.com/.test(url) ? 'instagram' : /youtu/.test(url) ? 'youtube' : /soundcloud/.test(url) ? 'soundcloud' : /apple\.com/.test(url) ? 'applemusic' : 'spotify')
const labelFor = (url: string) => (/tiktok\.com/.test(url) ? 'Use the sound on TikTok' : /instagram\.com/.test(url) ? 'Use the audio on Instagram' : /youtu/.test(url) ? 'Open on YouTube' : /soundcloud/.test(url) ? 'Open on SoundCloud' : 'Open on Apple Music')
const spotifyLabel = (url: string) => {
  const kind = /\/(track|album|artist|playlist|episode|show)\//.exec(url)?.[1]
  return kind === 'album' ? 'The album on Spotify' : kind === 'artist' ? 'The artist on Spotify' : kind === 'playlist' ? 'The playlist on Spotify' : 'Listen on Spotify'
}
const pill = 'inline-flex h-10 items-center gap-2 rounded-pill border border-white/15 bg-white/[0.06] px-4 text-[14px] text-white/90 transition-colors hover:bg-white/[0.12]'

/** The music links, the official sound, which part to use, footage and the bio, under a campaign's brief. Nothing shows when there is none. */
export function CampaignExtrasBlock({ x }: { x: CampaignExtras }) {
  if (!x.bio && !x.spotify.length && !x.sounds.length && !x.audioNote && !x.assets && !x.example) return null
  return (
    <div className="grid gap-5">
      {x.example && <ExampleEdit url={x.example} />}
      {(x.sounds.length > 0 || x.audioNote) && (
        <section>
          <h3 className="text-[13px] text-white/50">The audio</h3>
          {x.audioNote && <p className="mt-1.5 text-[15px] leading-relaxed text-white/90">{x.audioNote}</p>}
          {x.sounds.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {x.sounds.map((u) => (
                <a key={u} href={u} target="_blank" rel="noopener noreferrer" className={pill}>
                  <BrandIcon name={iconFor(u)} className="size-4" /> {labelFor(u)} <ExternalLink aria-hidden="true" className="size-3.5 text-white/50" />
                </a>
              ))}
            </div>
          )}
        </section>
      )}
      {(x.spotify.length > 0 || x.assets) && (
        <div className="flex flex-wrap gap-2">
          {x.spotify.map((u) => (
            <a key={u} href={u} target="_blank" rel="noopener noreferrer" className={pill}>
              <BrandIcon name="spotify" className="size-4 text-[#1ed760]" /> {spotifyLabel(u)}
            </a>
          ))}
          {x.assets && (
            <a href={x.assets} target="_blank" rel="noopener noreferrer" className={pill}>
              <FolderOpen aria-hidden="true" className="size-4" /> Footage you can use
            </a>
          )}
        </div>
      )}
      {x.bio && (
        <section>
          <h3 className="text-[13px] text-white/50">About</h3>
          <p className="mt-1.5 text-[15px] leading-relaxed whitespace-pre-line text-white/80">{x.bio}</p>
        </section>
      )}
    </div>
  )
}

/** The campaign's own wide picture, softly behind the top of its page. */
export function CampaignBackdrop({ id }: { id: string }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[70vh] overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/api/img/${id}`} alt="" className="size-full scale-110 object-cover opacity-35 blur-2xl" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-ink/60 to-ink" />
    </div>
  )
}

/** The brand's example edit, played right on the page: a video file in the browser's own player, or a TikTok, YouTube or Instagram post in its official player. */
function ExampleEdit({ url }: { url: string }) {
  const link = exampleLink(url)
  if ('error' in link) return null
  const platform = link.kind === 'file' ? null : link.kind
  const src = platform ? embedSrc(platform, postId(platform, url), url) : null
  const tall = platform ? isTall(platform, url) : true
  return (
    <section>
      <h3 className="text-[13px] text-white/50">Example edit</h3>
      <div className="mt-2.5">
        {link.kind === 'file' ? (
          <video src={url} controls playsInline preload="metadata" className="max-h-[540px] w-full max-w-[320px] rounded-panel bg-black" />
        ) : src ? (
          <div className={tall ? 'aspect-[9/16] w-full max-w-[320px]' : 'aspect-video w-full max-w-[520px]'}>
            <iframe src={src} title="Example edit" loading="lazy" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" className="size-full rounded-panel border-0 bg-black" />
          </div>
        ) : (
          <a href={url} target="_blank" rel="noopener noreferrer" className={pill}>
            <ExternalLink aria-hidden="true" className="size-4" /> Watch the example
          </a>
        )}
      </div>
    </section>
  )
}
