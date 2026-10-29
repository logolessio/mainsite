'use client'

import { ArrowRight, Star } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { firstYear, lengthOf, poster, type Pack } from '@/lib/seventeen/packs'
import { cn } from '@/lib/utils'

const EVERY = 8000

/**
 * The featured packs, one at a time on a wide card: the poster blown up and blurred behind, the title, the ratings and the plot on the left,
 * the poster itself leaning in on the right. It moves on by itself (not while the pointer is over it); the posters at the bottom pick one.
 */
export function Spotlight({ packs }: { packs: Pack[] }) {
  const [at, setAt] = useState(0)
  const [paused, setPaused] = useState(false)
  useEffect(() => {
    if (paused) return
    const t = setTimeout(() => setAt((a) => (a + 1) % packs.length), EVERY)
    return () => clearTimeout(t)
  }, [at, paused, packs.length])
  const p = packs[at]

  return (
    <section aria-label="Featured packs" className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10" onPointerEnter={() => setPaused(true)} onPointerLeave={() => setPaused(false)}>
      <div className="relative isolate overflow-hidden rounded-[28px] bg-[#070708] ring-1 ring-white/10">
        {packs.map((x, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={x.slug} src={poster(x, 600)} alt="" aria-hidden className={cn('absolute inset-0 -z-10 size-full scale-125 object-cover blur-[60px] saturate-[1.6] transition-opacity duration-1000', i === at ? 'opacity-60' : 'opacity-0')} />
        ))}
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,#000_0%,rgb(0_0_0/0.85)_35%,rgb(0_0_0/0.25)_75%,rgb(0_0_0/0.5)_100%)]" />
        <div className="absolute inset-0 -z-10 bg-linear-to-t from-black/80 via-transparent to-transparent" />

        <div className="grid min-h-[540px] items-center gap-10 p-6 sm:p-10 md:grid-cols-[1fr_auto] lg:min-h-[640px] lg:p-14 lg:pb-28">
          <div key={p.slug} className="s17-in max-w-[640px]">
            <p className="s17-mono flex items-center gap-2 text-[10.5px] uppercase text-white/55">
              <span className="size-1.5 rounded-full bg-[#ff1f38]" />
              Featured pack · {String(at + 1).padStart(2, '0')}/{String(packs.length).padStart(2, '0')}
            </p>
            <h2 className="s17-display mt-5 text-balance text-[clamp(2.6rem,6.4vw,5.8rem)] text-white">{p.title}</h2>
            <div className="mt-6 flex flex-wrap items-center gap-2">
              {p.imdbRating && (
                <span className="inline-flex h-7 items-center gap-1.5 rounded-md bg-[#ffc857] px-2 text-[12px] font-bold text-black">
                  <Star className="size-3.5 fill-current" />
                  {p.imdbRating}
                </span>
              )}
              {[firstYear(p), lengthOf(p), p.rated, p.quality].filter(Boolean).map((m) => (
                <span key={m} className="s17-mono inline-flex h-7 items-center rounded-md bg-white/8 px-2 text-[11px] uppercase text-white/75 ring-1 ring-white/10">
                  {m}
                </span>
              ))}
            </div>
            <p className="mt-6 line-clamp-3 max-w-[540px] text-[15px] leading-relaxed text-white/70">{p.plot}</p>
            <p className="s17-mono mt-4 text-[11px] uppercase text-white/40">{p.genres.join(' · ')}</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href={`/p/${p.slug}`} className="inline-flex h-12 items-center gap-2 rounded-full bg-white pl-6 pr-5 text-[14px] font-semibold text-black transition-transform hover:scale-[1.03] active:scale-[0.98]">
                Get the pack
                <ArrowRight className="size-4" />
              </Link>
              <span className="s17-mono text-[11px] uppercase text-white/45">{p.files.length} files</span>
            </div>
          </div>
          <Link href={`/p/${p.slug}`} tabIndex={-1} aria-hidden className="relative hidden md:block [perspective:1200px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={p.slug}
              src={poster(p, 600)}
              alt=""
              className="s17-in w-[clamp(220px,24vw,330px)] rounded-[18px] shadow-[0_50px_100px_-30px_rgb(0_0_0/0.95),0_0_0_1px_rgb(255_255_255/0.12)] transition-transform duration-700 [transform:rotateY(-14deg)_rotateX(4deg)] hover:[transform:rotateY(-4deg)]"
            />
          </Link>
        </div>

        <div className="absolute bottom-5 right-5 hidden gap-2 lg:flex">
          {packs.map((x, i) => (
            <button
              key={x.slug}
              type="button"
              aria-label={`Show ${x.title}`}
              aria-current={i === at}
              onClick={() => setAt(i)}
              className={cn('relative h-[66px] w-11 overflow-hidden rounded-lg ring-1 transition-all duration-300', i === at ? 'ring-white/80' : 'opacity-45 ring-white/15 hover:opacity-90')}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={poster(x, 92)} alt="" className="absolute inset-0 size-full object-cover" />
              {i === at && (
                <span key={`${at}-${paused}`} className="absolute inset-x-0 bottom-0 h-[3px] origin-left bg-[#ff1f38]" style={{ animation: paused ? 'none' : `s17-progress ${EVERY}ms linear both` }} />
              )}
            </button>
          ))}
        </div>
        <div className="flex justify-center gap-1.5 pb-6 lg:hidden">
          {packs.map((x, i) => (
            <button key={x.slug} type="button" aria-label={`Show ${x.title}`} onClick={() => setAt(i)} className={cn('h-1.5 rounded-full transition-all', i === at ? 'w-6 bg-white' : 'w-1.5 bg-white/30')} />
          ))}
        </div>
      </div>
    </section>
  )
}
