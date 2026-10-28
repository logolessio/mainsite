import type { Metadata } from 'next'
import { Play, X } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PackFiles } from '@/components/seventeen/pack-files'
import { Poster, PosterArt } from '@/components/seventeen/poster'
import { packBySlug, packName, PACKS } from '@/lib/seventeen/packs'

type Props = { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return PACKS.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const pack = packBySlug((await params).slug)
  if (!pack) return {}
  return { title: `${packName(pack)} scenepack`, description: `${pack.tagline} Free ${pack.quality} scenepacks of ${pack.title} for edits.` }
}

/**
 * 17.logoless.io/p/<slug>: one pack. The cover art fills the top as a backdrop, the poster and the details sit on the left, and every file
 * in the pack is listed on the right with its download.
 */
export default async function PackPage({ params }: Props) {
  const pack = packBySlug((await params).slug)
  if (!pack) notFound()

  const details: [string, string | undefined][] = [
    ['Released', pack.year],
    ['Genres', pack.genres.join(', ')],
    ['Runtime', pack.runtime],
    ['Director', pack.director],
    ['Cast', pack.cast?.join(', ')],
    ['Best quality', pack.quality],
    ['Pack by', pack.editor],
  ]

  return (
    <div className="relative -mt-14">
      <div className="relative h-[clamp(300px,52vw,560px)] overflow-hidden md:rounded-t-[26px]">
        {pack.poster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={pack.poster} alt="" className="absolute inset-0 size-full scale-110 object-cover opacity-60 blur-2xl" />
        ) : (
          <PosterArt art={pack.art} className="scale-x-[1.8] scale-y-125 opacity-75 blur-[28px]" />
        )}
        <div className="absolute inset-0 bg-[radial-gradient(70%_60%_at_50%_40%,transparent,rgb(0_0_0/0.85))]" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-black to-transparent" />
        {pack.trailer && (
          <a href={pack.trailer} target="_blank" rel="noreferrer" className="absolute left-1/2 top-[42%] inline-flex -translate-1/2 items-center gap-2.5 rounded-full bg-white py-1.5 pl-1.5 pr-5 text-[13px] font-semibold text-black shadow-[0_10px_40px_rgb(0_0_0/0.5)] transition-transform hover:scale-[1.04]">
            <span className="grid size-8 place-items-center rounded-full bg-black text-white">
              <Play className="size-3.5 fill-current" />
            </span>
            Watch Trailer
          </a>
        )}
      </div>

      <Link href="/" aria-label="Close, back to every pack" className="fixed right-5 top-[68px] z-40 grid size-10 place-items-center rounded-full border border-white/12 bg-black/60 text-white/80 backdrop-blur transition-colors hover:text-white md:right-9">
        <X className="size-4" />
      </Link>

      <div className="relative mx-auto -mt-[clamp(120px,16vw,190px)] grid max-w-[1180px] gap-8 px-5 md:grid-cols-[230px_1fr] md:gap-11 md:px-9">
        <aside className="mx-auto w-[min(230px,60vw)] md:mx-0 md:w-auto">
          <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-white/15 bg-[#09090b] shadow-[0_24px_60px_rgb(0_0_0/0.7)]">
            <Poster pack={pack} priority />
          </div>
          <span className="mt-6 inline-block rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-black">{pack.kind}</span>
          <dl className="mt-4 text-[12px]">
            {details
              .filter((d): d is [string, string] => Boolean(d[1]))
              .map(([k, v]) => (
                <div key={k} className="flex justify-between gap-6 border-b border-white/8 py-3">
                  <dt className="shrink-0 text-white/45">{k}</dt>
                  <dd className="text-right text-white/80">{v}</dd>
                </div>
              ))}
          </dl>
        </aside>

        <div className="min-w-0 md:pt-[clamp(80px,11vw,140px)]">
          <h1 data-no-shadow className="font-display text-[clamp(1.9rem,3.6vw,2.7rem)] font-black uppercase leading-[0.95] tracking-[-0.04em] text-white">
            {packName(pack)}
          </h1>
          <p className="mt-3 text-[13px] text-white/55">{pack.tagline}</p>
          <PackFiles pack={pack} />
        </div>
      </div>
    </div>
  )
}
