'use client'

import { Clapperboard, Download, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { SEVENTEEN_LINKS } from '@/components/seventeen/links'
import { packName, type Pack } from '@/lib/seventeen/packs'

/** Every file in a pack, with a search over them, and a download on each (the Discord until the file has its own link). */
export function PackFiles({ pack }: { pack: Pack }) {
  const [q, setQ] = useState('')
  const files = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean)
    return pack.files.filter((f) => words.every((w) => [f.name, f.quality, f.editor].join(' ').toLowerCase().includes(w)))
  }, [pack.files, q])

  return (
    <section className="mt-9" aria-labelledby="s17-files">
      <p id="s17-files" className="text-[15px] font-semibold text-white">
        Available Scenepacks
      </p>
      <div className="mt-1.5 flex flex-wrap items-center gap-2.5 text-[11.5px] text-white/45">
        <span>High quality scenepacks for Discord and edits</span>
        <span className="inline-flex items-center gap-1 rounded-full border border-[#4ba9dc]/30 bg-[#4ba9dc]/10 px-2 py-0.5 text-[#4ba9dc]">
          <Clapperboard className="size-3" />
          {pack.files.length} {pack.files.length === 1 ? 'file' : 'files'}
        </span>
      </div>

      <div className="relative mt-5">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-3.5 -translate-y-1/2 text-white/40" />
        <label htmlFor="s17-file-search" className="sr-only">Search this pack</label>
        <input
          id="s17-file-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search scenes, season, quality..."
          autoComplete="off"
          className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.03] pl-10 pr-4 text-[12.5px] text-white outline-none placeholder:text-white/35 focus:border-[#ff1f38]/60 [&::-webkit-search-cancel-button]:hidden"
        />
      </div>

      <ul className="mt-3">
        {files.map((f) => (
          <li key={f.name} className="-mx-3 flex items-center gap-4 rounded-lg border-b border-white/8 px-3 py-3.5 transition-colors hover:bg-white/[0.04]">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-white">
                {f.name} <span className="font-normal text-white/50">· {pack.title}</span>
              </p>
              {(f.length || f.size) && (
                <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-[#4ba9dc]">
                  <Download className="size-3" />
                  {[f.length, f.size].filter(Boolean).join(' · ')}
                </p>
              )}
              <p className="mt-0.5 truncate text-[11.5px] text-white/45">
                {packName(pack)} • {f.quality} • {f.editor}
              </p>
            </div>
            <a
              href={f.url ?? SEVENTEEN_LINKS.discord}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-white px-4 text-[11px] font-semibold uppercase tracking-[0.04em] text-black transition-transform hover:scale-[1.04] active:scale-[0.98]"
            >
              <Download className="size-3.5" />
              <span className="hidden sm:inline">Download</span>
            </a>
          </li>
        ))}
        {files.length === 0 && <li className="py-10 text-center text-[13px] text-white/50">No file in this pack matches &ldquo;{q}&rdquo;.</li>}
      </ul>
    </section>
  )
}
