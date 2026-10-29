'use client'

import { Download, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { SEVENTEEN_DISCORD } from '@/components/seventeen/links'
import { poster, type Pack, type PackFile } from '@/lib/seventeen/packs'
import { cn } from '@/lib/utils'

const TAGS: (PackFile['tag'] | 'All')[] = ['All', 'Season', 'Scenes', 'Twixtor']

/** Every file in a pack: chips for each kind of cut, a search, and a row per file with its download (the Discord until the file has its own link). */
export function PackFiles({ pack }: { pack: Pack }) {
  const [q, setQ] = useState('')
  const [tag, setTag] = useState<(typeof TAGS)[number]>('All')
  const tags = TAGS.filter((t) => t === 'All' || pack.files.some((f) => f.tag === t))
  const files = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean)
    return pack.files.filter((f) => (tag === 'All' || f.tag === tag) && words.every((w) => [f.name, f.quality, f.tag].join(' ').toLowerCase().includes(w)))
  }, [pack.files, q, tag])
  const thumb = poster(pack, 92)

  return (
    <section id="files" aria-labelledby="s17-files" className="scroll-mt-24">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="s17-mono text-[10.5px] uppercase text-white/40">In this pack</p>
          <h2 id="s17-files" className="s17-display mt-2.5 text-[clamp(1.8rem,3.4vw,2.6rem)] text-white">
            {pack.files.length} files
          </h2>
        </div>
        <div className="relative w-full sm:w-[260px]">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-white/40" />
          <label htmlFor="s17-file-search" className="sr-only">Search this pack</label>
          <input
            id="s17-file-search"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search this pack…"
            autoComplete="off"
            className="h-10 w-full rounded-full bg-white/[0.05] pl-10 pr-4 text-[13.5px] text-white outline-none ring-1 ring-white/10 placeholder:text-white/35 focus:ring-[#ff1f38]/70 [&::-webkit-search-cancel-button]:hidden"
          />
        </div>
      </div>
      {tags.length > 2 && (
        <div className="mt-5 flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <button key={t} type="button" aria-pressed={tag === t} onClick={() => setTag(t)} className={cn('s17-mono h-7 rounded-full px-3 text-[10.5px] uppercase transition-colors', tag === t ? 'bg-white text-black' : 'bg-white/[0.04] text-white/55 ring-1 ring-white/8 hover:text-white')}>
              {t === 'Season' ? 'Seasons' : t}
            </button>
          ))}
        </div>
      )}

      <ul className="mt-6 overflow-hidden rounded-[20px] bg-white/[0.025] ring-1 ring-white/8">
        {files.map((f, i) => (
          <li key={f.name} className="group flex items-center gap-4 border-b border-white/[0.06] px-4 py-3.5 transition-colors last:border-b-0 hover:bg-white/[0.04] sm:px-5">
            <span className="s17-mono hidden w-6 text-[11px] text-white/30 sm:block">{String(pack.files.indexOf(f) + 1).padStart(2, '0')}</span>
            <span className="relative h-12 w-[72px] shrink-0 overflow-hidden rounded-lg ring-1 ring-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {thumb && <img src={thumb} alt="" loading="lazy" className="absolute inset-0 size-full scale-150 object-cover opacity-70 blur-[1px]" style={{ objectPosition: `50% ${20 + ((i * 23) % 60)}%` }} />}
              <span className="s17-mono absolute bottom-1 right-1 rounded bg-black/70 px-1 text-[9px] text-white/90">{f.length}</span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14.5px] font-semibold text-white">{f.name}</span>
              <span className="s17-mono mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10.5px] uppercase text-white/40">
                <span className={cn(f.tag === 'Twixtor' ? 'text-[#4ba9dc]' : f.tag === 'Season' ? 'text-[#2ed0b0]' : 'text-[#ff4d6a]')}>{f.tag}</span>
                <span>{f.quality}</span>
                <span>{f.size}</span>
              </span>
            </span>
            <a
              href={f.url ?? SEVENTEEN_DISCORD}
              target="_blank"
              rel="noreferrer"
              aria-label={`Download ${f.name}`}
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-white/[0.07] px-3 text-[13px] font-semibold text-white ring-1 ring-white/12 transition-all group-hover:bg-white group-hover:text-black sm:px-4"
            >
              <Download className="size-4" />
              <span className="hidden sm:inline">Download</span>
            </a>
          </li>
        ))}
        {files.length === 0 && <li className="px-5 py-12 text-center text-[13.5px] text-white/50">Nothing in this pack matches that.</li>}
      </ul>
      <p className="mt-4 text-[12px] leading-relaxed text-white/40">Downloads are posted on the Discord: the button takes you straight there.</p>
    </section>
  )
}
