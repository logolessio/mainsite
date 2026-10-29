import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import type { CSSProperties } from 'react'
import { BrandIcon } from '@/components/brand-icon'
import { SEVENTEEN_DISCORD } from '@/components/seventeen/links'
import { Rail } from '@/components/seventeen/rail'
import { PACKS, firstYear, poster, type Pack } from '@/lib/seventeen/packs'
import { cn } from '@/lib/utils'

/**
 * The posters behind the hero: every pack's, in columns on a tilted plane, drifting up and down at different speeds. Each column holds its
 * posters twice so it loops without a seam (see .s17-col in globals.css).
 */
export function PosterWall({ packs, columns = 10 }: { packs: Pack[]; columns?: number }) {
  const cols = Array.from({ length: columns }, (_, c) => packs.filter((_, i) => i % columns === c))
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden opacity-60 sm:opacity-100">
      <div className="absolute left-1/2 top-1/2 flex gap-4" style={{ transform: 'translate(-50%, -50%) perspective(1800px) rotateX(24deg) rotateZ(-9deg) scale(1.12)' }}>
        {cols.map((col, c) => (
          <div key={c} className="s17-col flex w-[150px] shrink-0 flex-col gap-4 sm:w-[170px]" data-dir={c % 2 ? 'down' : 'up'} style={{ '--s17-speed': `${90 + ((c * 37) % 50)}s` } as CSSProperties}>
            {[...col, ...col].map((p, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={poster(p, 240)} alt="" loading={i < 4 ? 'eager' : 'lazy'} decoding="async" className="aspect-[2/3] w-full rounded-[14px] object-cover ring-1 ring-white/10" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

/** Top rated: the ten best rated packs on IMDb, each with its rank huge and outlined, the poster tucked into it. */
export function TopRated({ packs }: { packs: Pack[] }) {
  return (
    <section id="top" className="scroll-mt-20">
      <SectionHead kicker="By IMDb rating" title="Top rated" />
      <Rail label="Top rated packs">
        {packs.map((p, i) => (
          <Link key={p.slug} href={`/p/${p.slug}`} className="group flex shrink-0 snap-start items-end">
            <span className="s17-display s17-outline relative -mr-[0.07em] select-none text-[clamp(10rem,17vw,15rem)] leading-[0.74] tracking-[-0.08em] transition-[-webkit-text-stroke-color] duration-500 group-hover:[-webkit-text-stroke-color:#ff1f38]">{i + 1}</span>
            <span className="s17-sheen relative z-10 block aspect-[2/3] w-[clamp(120px,13vw,170px)] overflow-hidden rounded-[14px] shadow-[-12px_0_30px_rgb(0_0_0/0.8)] ring-1 ring-white/12 transition-transform duration-500 group-hover:-translate-y-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={poster(p, 360)} alt={`${p.title} poster`} loading="lazy" className="absolute inset-0 size-full object-cover" />
              <span className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/90 to-transparent p-2.5 pt-8">
                <span className="s17-mono flex items-center gap-1 text-[10.5px] text-white">
                  <span className="text-[#ffc857]">★</span> {p.imdbRating}
                  <span className="text-white/40">· {firstYear(p)}</span>
                </span>
              </span>
            </span>
          </Link>
        ))}
      </Rail>
    </section>
  )
}

const MOODS: { genre: string; label: string; tint: string }[] = [
  { genre: 'Crime', label: 'Crime', tint: '#ff1f38' },
  { genre: 'Sci-Fi', label: 'Sci-fi', tint: '#4678ff' },
  { genre: 'Action', label: 'Action', tint: '#ff8a3d' },
  { genre: 'Thriller', label: 'Thriller', tint: '#9650ff' },
  { genre: 'Animation', label: 'Animated', tint: '#2ed0b0' },
  { genre: 'Comedy', label: 'Comedy', tint: '#ffc857' },
]

/** A tile for each mood, its three best rated posters fanned out in the corner. Each one opens the grid filtered to that genre. */
export function GenreTiles() {
  return (
    <section>
      <SectionHead kicker="Browse by genre" title="Pick a mood" />
      <ul className="mx-auto grid max-w-[1440px] grid-cols-2 gap-3 px-4 sm:px-6 md:grid-cols-3 lg:px-10 xl:grid-cols-6">
        {MOODS.map((m) => {
          const all = PACKS.filter((p) => p.genres.includes(m.genre))
          const top = [...all].sort((a, b) => Number(b.imdbRating ?? 0) - Number(a.imdbRating ?? 0)).slice(0, 3)
          return (
            <li key={m.genre}>
              <Link
                href={`/?genre=${encodeURIComponent(m.genre)}#packs`}
                className="group relative block h-[210px] overflow-hidden rounded-[20px] ring-1 ring-white/10 transition-[box-shadow] duration-500 hover:ring-white/25"
                style={{ background: `radial-gradient(120% 90% at 100% 0%, ${m.tint}55, transparent 60%), linear-gradient(160deg, #111114, #060607)` }}
              >
                {top.map((p, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={p.slug}
                    src={poster(p, 160)}
                    alt=""
                    loading="lazy"
                    className={cn('absolute top-5 w-[72px] rounded-lg shadow-[0_14px_30px_rgb(0_0_0/0.7)] ring-1 ring-white/15 transition-transform duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)]', ['right-[64px] rotate-[-14deg] group-hover:rotate-[-20deg] group-hover:-translate-x-2', 'right-[38px] rotate-[-3deg] group-hover:-translate-y-2', 'right-[10px] rotate-[10deg] group-hover:rotate-[16deg] group-hover:translate-x-1'][i])}
                    style={{ zIndex: i === 1 ? 2 : 1 }}
                  />
                ))}
                <span className="absolute bottom-4 left-4">
                  <span className="s17-display block text-[26px] text-white">{m.label}</span>
                  <span className="s17-mono mt-1 block text-[10.5px] uppercase text-white/45">{all.length} packs</span>
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/** The ask at the foot of the home page: a wall of posters, and the request button over it. */
export function RequestBand() {
  const wall = PACKS.slice(20, 44)
  return (
    <section className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10">
      <div className="relative isolate overflow-hidden rounded-[28px] px-6 py-20 text-center ring-1 ring-white/10 sm:py-28">
        <div aria-hidden className="absolute inset-0 -z-10 grid grid-cols-6 gap-2 opacity-35 sm:grid-cols-8 lg:grid-cols-12" style={{ transform: 'rotate(-6deg) scale(1.3)' }}>
          {wall.map((p) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={p.slug} src={poster(p, 160)} alt="" loading="lazy" className="aspect-[2/3] w-full rounded-lg object-cover" />
          ))}
        </div>
        <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(60%_70%_at_50%_50%,rgb(0_0_0/0.92),rgb(0_0_0/0.6))]" />
        <p className="s17-mono text-[11px] uppercase text-white/50">Not here yet?</p>
        <h2 className="s17-display mx-auto mt-5 max-w-[900px] text-[clamp(2.8rem,7vw,6rem)] text-white">
          Ask and it <span className="s17-red">gets cut.</span>
        </h2>
        <p className="mx-auto mt-6 max-w-[460px] text-[15px] leading-relaxed text-white/60">Tell us the film, the series or the character. Most requests go up within the week.</p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link href="/request" className="inline-flex h-12 items-center gap-2 rounded-full bg-white pl-6 pr-5 text-[14px] font-semibold text-black transition-transform hover:scale-[1.03]">
            Request a pack
            <ArrowRight className="size-4" />
          </Link>
          <a href={SEVENTEEN_DISCORD} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center gap-2.5 rounded-full bg-white/[0.07] px-6 text-[14px] font-semibold text-white ring-1 ring-white/15 backdrop-blur transition-colors hover:bg-white/[0.12]">
            <BrandIcon name="discord" className="size-[18px]" />
            Join the Discord
          </a>
        </div>
      </div>
    </section>
  )
}

export function SectionHead({ kicker, title, aside }: { kicker: string; title: string; aside?: React.ReactNode }) {
  return (
    <div className="mx-auto mb-7 flex max-w-[1440px] items-end justify-between gap-6 px-4 sm:px-6 lg:px-10">
      <div>
        <p className="s17-mono text-[10.5px] uppercase text-white/40">{kicker}</p>
        <h2 className="s17-display mt-2.5 text-[clamp(2rem,4vw,3.2rem)] text-white">{title}</h2>
      </div>
      {aside}
    </div>
  )
}
