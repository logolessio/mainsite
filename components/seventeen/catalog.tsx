'use client'

import { Check, ChevronDown, Search, SlidersHorizontal } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Poster } from '@/components/seventeen/poster'
import { KINDS, packName, type Pack, type PackKind } from '@/lib/seventeen/packs'
import { cn } from '@/lib/utils'

const PAGE = 12
type Sort = 'new' | 'az'

/**
 * The raised panel under the hero: the search with its filter menu, the grid of covers (title and details come up over a cover on hover),
 * and Show more, twelve at a time. Search looks at the title, year, tagline, genres, editor and every file name.
 */
export function Catalog({ packs }: { packs: Pack[] }) {
  const [q, setQ] = useState('')
  const [kinds, setKinds] = useState<PackKind[]>([])
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
      if (kinds.length && !kinds.includes(p.kind)) return false
      const hay = [p.title, p.year, p.tagline, p.kind, p.quality, p.editor, ...p.genres, ...p.files.map((f) => f.name)].join(' ').toLowerCase()
      return words.every((w) => hay.includes(w))
    })
    return sort === 'az' ? [...hits].sort((a, b) => a.title.localeCompare(b.title)) : hits
  }, [packs, q, kinds, sort])

  const filtered = q !== '' || kinds.length > 0
  const toggle = (k: PackKind) => {
    setKinds((ks) => (ks.includes(k) ? ks.filter((x) => x !== k) : [...ks, k]))
    setShown(PAGE)
  }

  return (
    <section className="s17-panel relative mx-auto max-w-[1300px] rounded-t-[30px] px-4 pb-24 sm:px-6 md:mx-9 md:px-[37px] min-[1374px]:mx-auto">
      <div className="mx-auto max-w-[440px] pt-11" ref={menuRef}>
        <div className="relative">
          <Search className="pointer-events-none absolute left-[18px] top-1/2 size-4 -translate-y-1/2 text-white/40" />
          <label htmlFor="s17-search" className="sr-only">Search scenepacks</label>
          <input
            id="s17-search"
            type="search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setShown(PAGE)
            }}
            placeholder="Search scenepacks..."
            autoComplete="off"
            className="h-[46px] w-full rounded-[50px] border border-[#27272a] bg-[#0a0a0a] pl-12 pr-12 text-[13px] text-white outline-none transition-colors placeholder:text-white/35 focus:border-[#ff1f38]/60 [&::-webkit-search-cancel-button]:hidden"
          />
          {/* placed by a wrapper: on touch screens the site makes every button position: relative (for its bigger tap target) */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <button
              type="button"
              aria-label="Filters"
              aria-expanded={menu}
              onClick={() => setMenu((m) => !m)}
              className={cn('grid size-8 place-items-center rounded-full transition-colors', menu || kinds.length ? 'bg-white/10 text-white' : 'text-white/45 hover:text-white')}
            >
              <SlidersHorizontal className="size-3.5" />
              {kinds.length > 0 && <span className="absolute right-1 top-1 size-1.5 rounded-full bg-[#ff1f38]" />}
            </button>
          </div>
          {menu && (
            <div className="absolute right-0 top-[54px] z-30 w-60 rounded-2xl border border-white/10 bg-[#0c0c0d]/95 p-2 shadow-[0_24px_60px_rgb(0_0_0/0.6)] backdrop-blur-xl">
              <p className="px-2.5 pb-1.5 pt-1 text-[11px] uppercase tracking-[0.12em] text-white/40">Type</p>
              {KINDS.map((k) => (
                <button key={k} type="button" onClick={() => toggle(k)} className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[13px] text-white/80 hover:bg-white/6 hover:text-white">
                  {k}
                  {kinds.includes(k) && <Check className="size-3.5 text-[#ff1f38]" />}
                </button>
              ))}
              <div className="my-1.5 h-px bg-white/8" />
              <p className="px-2.5 pb-1.5 pt-1 text-[11px] uppercase tracking-[0.12em] text-white/40">Sort</p>
              {(
                [
                  ['new', 'Newest first'],
                  ['az', 'A to Z'],
                ] as const
              ).map(([s, label]) => (
                <button key={s} type="button" onClick={() => setSort(s)} className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[13px] text-white/80 hover:bg-white/6 hover:text-white">
                  {label}
                  {sort === s && <Check className="size-3.5 text-[#ff1f38]" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {filtered && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-[12px] text-white/50">
          <span>
            {list.length} {list.length === 1 ? 'pack' : 'packs'}
          </span>
          {kinds.map((k) => (
            <button key={k} type="button" onClick={() => toggle(k)} className="rounded-full border border-white/12 px-2.5 py-0.5 text-white/75 hover:border-white/25">
              {k} ×
            </button>
          ))}
        </div>
      )}

      {list.length === 0 ? (
        <div className="py-24 text-center">
          <p className="text-[14px] text-white/70">Nothing for &ldquo;{q}&rdquo; yet.</p>
          <Link href={`/request${q ? `?q=${encodeURIComponent(q)}` : ''}`} className="mt-4 inline-flex h-9 items-center rounded-full bg-white px-4 text-[12px] font-semibold text-black">
            Request it
          </Link>
        </div>
      ) : (
        <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-6 lg:gap-[18px]">
          {list.slice(0, shown).map((p, i) => (
            <li key={p.slug}>
              <PackCard pack={p} priority={i < 6} />
            </li>
          ))}
        </ul>
      )}

      {list.length > shown && (
        <div className="mt-10 text-center">
          <button type="button" onClick={() => setShown((s) => s + PAGE)} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-4 text-[12px] text-white/75 transition-colors hover:border-white/20 hover:text-white">
            Show More
            <ChevronDown className="size-3.5" />
          </button>
        </div>
      )}
    </section>
  )
}

/** One cover in the grid. On hover the cover darkens and the title, tagline, quality and editor come up from the bottom. */
function PackCard({ pack, priority }: { pack: Pack; priority: boolean }) {
  return (
    <Link
      href={`/p/${pack.slug}`}
      className="group relative block aspect-[2/3] overflow-hidden rounded-xl border border-white/20 bg-[#09090b] shadow-[0_12px_34px_rgb(0_0_0/0.45)] outline-none transition-[transform,border-color] duration-300 hover:-translate-y-1 hover:border-white/35 focus-visible:border-[#ff1f38]"
    >
      <Poster pack={pack} priority={priority} className="transition-transform duration-500 group-hover:scale-[1.04]" />
      <div className="absolute inset-0 flex flex-col justify-end bg-linear-to-t from-black via-black/80 to-black/20 p-3.5 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
        <div className="translate-y-2 transition-transform duration-300 group-hover:translate-y-0">
          <p className="text-[14px] font-semibold leading-snug text-white">{packName(pack)}</p>
          <p className="mt-1.5 line-clamp-3 text-[11.5px] leading-relaxed text-white/60">{pack.tagline}</p>
          <span className="mt-2.5 inline-block rounded-md bg-white/12 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-white/85">{pack.quality}</span>
          <p className="mt-2 text-[11px] text-white/45">{pack.editor}</p>
        </div>
      </div>
    </Link>
  )
}
