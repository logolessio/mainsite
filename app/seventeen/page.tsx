import { ArrowDown } from 'lucide-react'
import { BrandIcon } from '@/components/brand-icon'
import { Catalog } from '@/components/seventeen/catalog'
import { GenreTiles, PosterWall, RequestBand, TopRated } from '@/components/seventeen/home'
import { HeroSearch } from '@/components/seventeen/hero-search'
import { SEVENTEEN_DISCORD } from '@/components/seventeen/links'
import { Spotlight } from '@/components/seventeen/spotlight'
import { KINDS, PACKS, packBySlug, topRated, type Pack, type PackKind } from '@/lib/seventeen/packs'

const FEATURED = ['dune-part-two', 'the-batman', 'sinners', 'arcane', 'breaking-bad', 'blade-runner-2049']

type Props = { searchParams: Promise<{ kind?: string; genre?: string }> }

/**
 * 17.logoless.io: the hero over a drifting wall of every poster, the featured packs, the ten best rated, the genres, and every pack in one
 * searchable grid. ?kind= and ?genre= open the grid already filtered.
 */
export default async function SeventeenHome({ searchParams }: Props) {
  const { kind, genre } = await searchParams
  const featured = FEATURED.map(packBySlug).filter((p): p is Pack => Boolean(p))
  const pickedKind = KINDS.find((k) => k === kind) as PackKind | undefined
  const pickedGenre = typeof genre === 'string' ? genre.slice(0, 30) : undefined
  const counts = { films: PACKS.filter((p) => p.kind === 'Film').length, series: PACKS.filter((p) => p.kind === 'Series').length, anime: PACKS.filter((p) => p.kind === 'Anime').length }

  return (
    <>
      <section className="relative isolate -mt-16 flex min-h-[min(940px,100svh)] items-center overflow-hidden pb-24 pt-32">
        <PosterWall packs={PACKS} />
        <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(70%_60%_at_50%_48%,rgb(0_0_0/0.94)_0%,rgb(0_0_0/0.78)_45%,rgb(0_0_0/0.35)_100%)]" />
        <div aria-hidden className="absolute inset-x-0 top-0 -z-10 h-40 bg-linear-to-b from-black to-transparent" />
        <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-64 bg-linear-to-t from-black via-black/80 to-transparent" />
        <div aria-hidden className="absolute left-1/2 top-[30%] -z-10 h-[340px] w-[min(900px,90vw)] -translate-x-1/2 rounded-full bg-[#ff1f38]/[0.10] blur-[120px]" />

        <div className="mx-auto w-full max-w-[1100px] px-4 text-center sm:px-6">
          <p className="s17-in s17-mono inline-flex items-center gap-2.5 rounded-full bg-white/[0.06] py-2 pl-3 pr-4 text-[10.5px] uppercase text-white/70 ring-1 ring-white/12 backdrop-blur-md">
            <span className="size-2 rounded-full bg-[#2ed0b0]" style={{ animation: 's17-pulse 2.4s ease-out infinite' }} />
            {PACKS.length} packs · new every week
          </p>
          <h1 className="s17-in s17-display mt-8 text-[clamp(3.2rem,10.5vw,9.5rem)] [animation-delay:80ms]">
            <span className="s17-shimmer block">Every scene.</span>
            <span className="block">
              <span className="s17-red">In 4K.</span> <span className="s17-shimmer">Free.</span>
            </span>
          </h1>
          <p className="s17-in mx-auto mt-8 max-w-[560px] text-[clamp(15px,1.4vw,17px)] leading-relaxed text-white/65 [animation-delay:160ms]">
            Clean, watermark-free scenepacks of {counts.films} films, {counts.series} series and {counts.anime} anime, cut for edits. Find one, grab it, make something.
          </p>
          <div className="s17-in mx-auto mt-10 flex max-w-[620px] flex-col items-stretch gap-3 [animation-delay:240ms] sm:flex-row">
            <HeroSearch count={PACKS.length} />
            <a href={SEVENTEEN_DISCORD} target="_blank" rel="noreferrer" className="inline-flex h-14 shrink-0 items-center justify-center gap-2.5 rounded-full bg-[#5865f2] px-7 text-[14.5px] font-semibold text-white shadow-[0_12px_40px_-10px_rgb(88_101_242/0.8)] transition-transform hover:scale-[1.03] active:scale-[0.98]">
              <BrandIcon name="discord" className="size-5" />
              Join Discord
            </a>
          </div>
          <dl className="s17-in mx-auto mt-14 grid max-w-[640px] grid-cols-4 gap-2 [animation-delay:320ms]">
            {[
              ['4K', 'Quality'],
              ['0', 'Watermarks'],
              [String(PACKS.reduce((n, p) => n + p.files.length, 0)), 'Files'],
              ['100%', 'Free'],
            ].map(([v, k]) => (
              <div key={k}>
                <dt className="sr-only">{k}</dt>
                <dd className="s17-display text-[clamp(1.6rem,3.4vw,2.4rem)] text-white">{v}</dd>
                <dd className="s17-mono mt-2 text-[10px] uppercase text-white/40">{k}</dd>
              </div>
            ))}
          </dl>
        </div>
        <a href="#featured" aria-label="Scroll down" className="absolute bottom-8 left-1/2 grid size-10 -translate-x-1/2 place-items-center rounded-full text-white/50 ring-1 ring-white/15 transition-colors hover:text-white">
          <ArrowDown className="size-4" />
        </a>
      </section>

      <div id="featured" className="scroll-mt-20 space-y-24 sm:space-y-28">
        <Spotlight packs={featured} />
        <TopRated packs={topRated(10)} />
        <GenreTiles />
        <Catalog key={`${pickedKind}-${pickedGenre}`} packs={PACKS} kind={pickedKind} genre={pickedGenre} />
        <RequestBand />
      </div>
    </>
  )
}
