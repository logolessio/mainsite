'use client'

import { ArrowDownUp, Check, Search, X } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { PackCard } from '@/components/seventeen/pack-card'
import { GENRES, KINDS, type Pack, type PackKind } from '@/lib/seventeen/packs'
import { cn } from '@/lib/utils'

const PAGE = 24
const SORTS = [
  ['new', 'Newest'],
  ['rating', 'Top rated'],
  ['year', 'Release year'],
  ['az', 'A to Z'],
] as const
type Sort = (typeof SORTS)[number][0]

/**
 * Every pack: the kind tabs, a search, the sort and the genre chips stay pinned under the header while the grid scrolls; more come in
 * twenty-four at a time. The search looks at the title, year, genres, director, cast and file names. A genre or kind can come in from the
 * address (?genre=Crime, ?kind=Anime), which is how the mood tiles and the footer open it.
 */
export function Catalog({ packs, kind: initialKind, genre: initialGenre }: { packs: Pack[]; kind?: PackKind; genre?: string }) {
  const [q, setQ] = useState('')
  const [kind, setKind] = useState<PackKind | 'All'>(initialKind ?? 'All')
  const [genre, setGenre] = useState<string | null>(initialGenre ?? null)
  const [sort, setSort] = useState<Sort>('new')
  const [shown, setShown] = useState(PAGE)
  const [menu, setMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menu) return
    const away = (e: PointerEvent) => !menuRef.current?.contains(e.target as Node) && setMenu(false)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false)
    document.addEventListener('pointerdown', away)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('pointerdown', away)
      document.removeEventListener('keydown', esc)
    }
  }, [menu])

  const list = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean)
    const hits = packs.filter((p) => {
      if (kind !== 'All' && p.kind !== kind) return false
      if (genre && !p.genres.includes(genre)) return false
      const hay = [p.title, p.year, p.kind, p.director, ...p.genres, ...p.actors, ...p.files.map((f) => f.name)].join(' ').toLowerCase()
      return words.every((w) => hay.includes(w))
    })
    if (sort === 'rating') return [...hits].sort((a, b) => Number(b.imdbRating ?? 0) - Number(a.imdbRating ?? 0))
    if (sort === 'year') return [...hits].sort((a, b) => b.year.localeCompare(a.year))
    if (sort === 'az') return [...hits].sort((a, b) => a.title.localeCompare(b.title))
    return hits
  }, [packs, q, kind, genre, sort])

  const reset = () => {
    setQ('')
    setKind('All')
    setGenre(null)
    setShown(PAGE)
  }
  const count = (k: PackKind | 'All') => (k === 'All' ? packs.length : packs.filter((p) => p.kind === k).length)

  return (
    <section id="packs" className="scroll-mt-16">
      <div className="mx-auto mb-6 flex max-w-[1440px] items-end justify-between gap-6 px-4 sm:px-6 lg:px-10">
        <div>
          <p className="s17-mono text-[10.5px] uppercase text-white/40">The whole library</p>
          <h2 className="s17-display mt-2.5 text-[clamp(2rem,4vw,3.2rem)] text-white">Every pack</h2>
        </div>
        <p className="s17-mono pb-1 text-[11px] uppercase text-white/40">
          {list.length} of {packs.length}
        </p>
      </div>

      <div className="sticky top-16 z-30 border-y border-white/8 bg-black/75 backdrop-blur-2xl backdrop-saturate-150">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-2.5 px-4 py-3 sm:px-6 lg:px-10">
          <div role="tablist" aria-label="Kind" className="flex rounded-full bg-white/[0.05] p-1 ring-1 ring-white/10">
            {(['All', ...KINDS] as const).map((k) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={kind === k}
                onClick={() => {
                  setKind(k)
                  setShown(PAGE)
                }}
                className={cn('h-8 rounded-full px-3.5 text-[13px] font-medium transition-colors', kind === k ? 'bg-white text-black' : 'text-white/60 hover:text-white')}
              >
                {k === 'Film' ? 'Films' : k}
                <span className={cn('s17-mono ml-1.5 text-[10px]', kind === k ? 'text-black/45' : 'text-white/30')}>{count(k)}</span>
              </button>
            ))}
          </div>
          <div className="relative order-last w-full sm:order-none sm:ml-auto sm:w-[300px]">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-white/40" />
            <label htmlFor="s17-search" className="sr-only">Search the packs</label>
            <input
              id="s17-search"
              type="search"
              value={q}
              onChange={(e) => {
                setQ(e.target.value)
                setShown(PAGE)
              }}
              placeholder="Title, actor, director…"
              autoComplete="off"
              className="h-10 w-full rounded-full bg-white/[0.05] pl-10 pr-4 text-[13.5px] text-white outline-none ring-1 ring-white/10 transition-shadow placeholder:text-white/35 focus:ring-[#ff1f38]/70 [&::-webkit-search-cancel-button]:hidden"
            />
          </div>
          <div className="relative ml-auto sm:ml-0" ref={menuRef}>
            <button type="button" aria-expanded={menu} onClick={() => setMenu((m) => !m)} className="flex h-10 items-center gap-2 rounded-full bg-white/[0.05] px-4 text-[13px] text-white/75 ring-1 ring-white/10 transition-colors hover:text-white">
              <ArrowDownUp className="size-3.5" />
              {SORTS.find((s) => s[0] === sort)?.[1]}
            </button>
            {menu && (
              <div className="s17-in absolute right-0 top-12 z-40 w-48 rounded-2xl bg-[#0d0d0f]/95 p-1.5 shadow-[0_24px_60px_rgb(0_0_0/0.7)] ring-1 ring-white/10 backdrop-blur-xl">
                {SORTS.map(([s, label]) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setSort(s)
                      setMenu(false)
                    }}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-[13px] text-white/75 hover:bg-white/[0.06] hover:text-white"
                  >
                    {label}
                    {sort === s && <Check className="size-3.5 text-[#ff1f38]" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="s17-rail mx-auto flex max-w-[1440px] gap-1.5 overflow-x-auto px-4 pb-3 sm:px-6 lg:px-10">
          {GENRES.map((g) => (
            <button
              key={g}
              type="button"
              aria-pressed={genre === g}
              onClick={() => {
                setGenre((x) => (x === g ? null : g))
                setShown(PAGE)
              }}
              className={cn('s17-mono h-7 shrink-0 rounded-full px-3 text-[10.5px] uppercase transition-colors', genre === g ? 'bg-[#ff1f38] text-white' : 'bg-white/[0.04] text-white/55 ring-1 ring-white/8 hover:text-white')}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-[1440px] px-4 pt-8 sm:px-6 lg:px-10">
        {list.length === 0 ? (
          <div className="py-24 text-center">
            <p className="s17-display text-[clamp(2rem,5vw,3.4rem)] text-white/90">Nothing yet</p>
            <p className="mt-3 text-[14px] text-white/55">{q ? <>No pack matches &ldquo;{q}&rdquo;.</> : 'No pack matches those filters.'}</p>
            <div className="mt-7 flex justify-center gap-2">
              {q && (
                <Link href={`/request?q=${encodeURIComponent(q)}`} className="inline-flex h-10 items-center rounded-full bg-white px-5 text-[13px] font-semibold text-black">
                  Request &ldquo;{q.length > 24 ? `${q.slice(0, 24)}…` : q}&rdquo;
                </Link>
              )}
              <button type="button" onClick={reset} className="inline-flex h-10 items-center gap-1.5 rounded-full px-5 text-[13px] text-white/75 ring-1 ring-white/15 hover:text-white">
                <X className="size-3.5" />
                Clear filters
              </button>
            </div>
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 sm:gap-x-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 xl:gap-x-5">
            {list.slice(0, shown).map((p, i) => (
              <li key={p.slug}>
                <PackCard pack={p} eager={i < 6} />
              </li>
            ))}
          </ul>
        )}
        {list.length > shown && (
          <div className="mt-12 text-center">
            <button type="button" onClick={() => setShown((s) => s + PAGE)} className="inline-flex h-12 items-center gap-2 rounded-full bg-white/[0.06] px-7 text-[13.5px] font-medium text-white ring-1 ring-white/12 transition-colors hover:bg-white/[0.1]">
              Show more
              <span className="s17-mono text-[10.5px] text-white/40">{list.length - shown} left</span>
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
