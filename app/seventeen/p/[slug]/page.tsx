import type { Metadata } from 'next'
import { ArrowLeft, Download, ExternalLink, Play, Star, Trophy } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SectionHead } from '@/components/seventeen/home'
import { PackCard } from '@/components/seventeen/pack-card'
import { PackFiles } from '@/components/seventeen/pack-files'
import { Rail } from '@/components/seventeen/rail'
import { firstYear, lengthOf, packBySlug, PACKS, poster, relatedPacks } from '@/lib/seventeen/packs'

type Props = { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return PACKS.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const pack = packBySlug((await params).slug)
  if (!pack) return {}
  const title = `${pack.title} scenepack`
  const description = `Free ${pack.quality} ${pack.title} (${firstYear(pack)}) scenepack: ${pack.files.length} clean clips for edits. ${pack.plot ?? ''}`.trim()
  const image = poster(pack, 600)
  return { title, description, openGraph: { title, description, siteName: '17', images: image ? [{ url: image }] : undefined }, twitter: { card: 'summary_large_image', title, description, images: image ? [image] : undefined } }
}

/**
 * 17.logoless.io/p/<slug>: one pack. The poster, blown up and blurred, lights the top; over it the poster itself, the title, the ratings, the
 * plot and the buttons. Then the files with the film's details beside them, and the packs most like it.
 */
export default async function PackPage({ params }: Props) {
  const pack = packBySlug((await params).slug)
  if (!pack) notFound()

  const size = pack.files.reduce((mb, f) => mb + (f.size.endsWith('GB') ? parseFloat(f.size) * 1000 : parseFloat(f.size)), 0)
  const people = pack.kind === 'Film' ? ['Director', pack.director] : ['Created by', pack.writer ?? pack.director]
  const about: [string, string | undefined][] = [
    [people[0] as string, people[1]],
    ['Starring', pack.actors.join(', ')],
    ['Genre', pack.genres.join(', ')],
    ['Released', pack.released],
    [pack.kind === 'Film' ? 'Runtime' : 'Seasons', pack.kind === 'Film' ? pack.runtime : pack.seasons],
    ['Language', pack.language],
    ['Country', pack.country],
  ]
  const ratings = [
    pack.imdbRating && { label: 'IMDb', value: pack.imdbRating, out: '/10', sub: pack.imdbVotes ? `${pack.imdbVotes} votes` : undefined },
    pack.rottenTomatoes && { label: 'Rotten Tomatoes', value: pack.rottenTomatoes, out: '', sub: 'Tomatometer' },
    pack.metascore && { label: 'Metacritic', value: pack.metascore, out: '/100', sub: 'Metascore' },
  ].filter((r): r is { label: string; value: string; out: string; sub: string | undefined } => Boolean(r))
  const trailer = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${pack.title} ${firstYear(pack)} official trailer`)}`

  return (
    <article>
      <section className="relative isolate -mt-16 overflow-hidden pb-16 pt-28 sm:pt-32">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={poster(pack, 600)} alt="" aria-hidden className="absolute inset-0 -z-10 size-full scale-125 object-cover opacity-55 blur-[80px] saturate-[1.7]" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={poster(pack, 1200)} alt="" aria-hidden className="absolute right-0 top-0 -z-10 hidden h-full w-[55%] object-cover object-top opacity-30 [mask-image:linear-gradient(to_left,#000_20%,transparent),linear-gradient(to_top,transparent,#000_40%)] [mask-composite:intersect] lg:block" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgb(0_0_0/0.85),rgb(0_0_0/0.4)_60%,rgb(0_0_0/0.2))]" />
        <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-2/3 bg-linear-to-t from-black via-black/70 to-transparent" />

        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10">
          <Link href="/#packs" className="s17-mono inline-flex items-center gap-2 text-[10.5px] uppercase text-white/55 transition-colors hover:text-white">
            <ArrowLeft className="size-3.5" />
            Every pack
          </Link>
          <div className="mt-8 grid items-end gap-8 md:grid-cols-[minmax(0,300px)_1fr] md:gap-12 lg:grid-cols-[minmax(0,340px)_1fr]">
            <div className="s17-in mx-auto w-[min(260px,62vw)] md:mx-0 md:w-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={poster(pack, 700)} alt={`${pack.title} poster`} className="aspect-[2/3] w-full rounded-[20px] object-cover shadow-[0_50px_120px_-30px_rgb(0_0_0/1),0_0_0_1px_rgb(255_255_255/0.14)]" />
            </div>
            <div className="s17-in min-w-0 [animation-delay:100ms]">
              <div className="flex flex-wrap items-center gap-2">
                <span className="s17-mono inline-flex h-7 items-center rounded-md bg-[#ff1f38] px-2 text-[11px] font-medium uppercase text-white">{pack.kind}</span>
                {[pack.year, lengthOf(pack), pack.rated, pack.quality].filter(Boolean).map((m) => (
                  <span key={m} className="s17-mono inline-flex h-7 items-center rounded-md bg-white/8 px-2 text-[11px] uppercase text-white/75 ring-1 ring-white/10 backdrop-blur">
                    {m}
                  </span>
                ))}
              </div>
              <h1 className="s17-display mt-5 text-balance text-[clamp(2.8rem,7.4vw,7rem)] text-white">{pack.title}</h1>
              {ratings.length > 0 && (
                <dl className="mt-7 flex flex-wrap gap-x-8 gap-y-4">
                  {ratings.map((r) => (
                    <div key={r.label}>
                      <dt className="s17-mono text-[10px] uppercase text-white/40">{r.label}</dt>
                      <dd className="mt-1.5 flex items-baseline gap-1">
                        {r.label === 'IMDb' && <Star className="size-4 -translate-y-px self-center fill-[#ffc857] text-[#ffc857]" />}
                        <span className="s17-display text-[30px] leading-none text-white">{r.value}</span>
                        <span className="text-[13px] text-white/40">{r.out}</span>
                      </dd>
                      {r.sub && <dd className="s17-mono mt-1 text-[10px] uppercase text-white/30">{r.sub}</dd>}
                    </div>
                  ))}
                </dl>
              )}
              <p className="mt-7 max-w-[680px] text-[15.5px] leading-relaxed text-white/70">{pack.plotFull ?? pack.plot}</p>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <a href="#files" className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-[14px] font-semibold text-black transition-transform hover:scale-[1.03] active:scale-[0.98]">
                  <Download className="size-4" />
                  Get the pack
                </a>
                <a href={trailer} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center gap-2.5 rounded-full bg-white/[0.08] pl-2 pr-5 text-[14px] font-semibold text-white ring-1 ring-white/15 backdrop-blur-md transition-colors hover:bg-white/[0.14]">
                  <span className="grid size-8 place-items-center rounded-full bg-white/15">
                    <Play className="size-3.5 fill-current" />
                  </span>
                  Trailer
                </a>
                <a href={`https://www.imdb.com/title/${pack.imdbID}/`} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center gap-1.5 rounded-full px-4 text-[13.5px] font-medium text-white/60 transition-colors hover:text-white">
                  IMDb
                  <ExternalLink className="size-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-[1440px] gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_360px] lg:gap-16 lg:px-10">
        <PackFiles pack={pack} />
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="grid grid-cols-3 gap-px overflow-hidden rounded-[20px] bg-white/8 ring-1 ring-white/8">
            {[
              [String(pack.files.length), 'Files'],
              [size >= 1000 ? `${(size / 1000).toFixed(1)}GB` : `${Math.round(size)}MB`, 'In all'],
              [pack.quality, 'Best'],
            ].map(([v, k]) => (
              <div key={k} className="bg-[#08080a] px-4 py-5">
                <p className="s17-display text-[26px] leading-none text-white">{v}</p>
                <p className="s17-mono mt-2 text-[10px] uppercase text-white/40">{k}</p>
              </div>
            ))}
          </div>
          <div className="rounded-[20px] bg-white/[0.025] p-5 ring-1 ring-white/8">
            <p className="s17-mono text-[10.5px] uppercase text-white/40">About the {pack.kind === 'Film' ? 'film' : 'series'}</p>
            <dl className="mt-3">
              {about
                .filter((d): d is [string, string] => Boolean(d[1]))
                .map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[96px_1fr] gap-4 border-b border-white/[0.06] py-3 text-[13px] last:border-b-0">
                    <dt className="text-white/40">{k}</dt>
                    <dd className="text-white/85">{v}</dd>
                  </div>
                ))}
            </dl>
            {pack.awards && (
              <p className="mt-3 flex gap-2.5 rounded-xl bg-[#ffc857]/[0.07] p-3 text-[12.5px] leading-snug text-[#ffd98a] ring-1 ring-[#ffc857]/20">
                <Trophy className="mt-px size-4 shrink-0" />
                {pack.awards}
              </p>
            )}
          </div>
        </aside>
      </div>

      <section className="mt-24">
        <SectionHead kicker={`If you like ${pack.title}`} title="More like this" />
        <Rail label="More like this">
          {relatedPacks(pack, 12).map((p) => (
            <PackCard key={p.slug} pack={p} className="w-[clamp(140px,15vw,190px)] shrink-0 snap-start" />
          ))}
        </Rail>
      </section>
    </article>
  )
}
