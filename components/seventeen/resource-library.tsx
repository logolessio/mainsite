'use client'

import { Download, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { SEVENTEEN_LINKS } from '@/components/seventeen/links'
import { RESOURCE_TABS, type Resource, type ResourceTab } from '@/lib/seventeen/resources'
import { cn } from '@/lib/utils'

/** The resources panel: a window-like card with tabs for the three kinds, a search, the tags of the open tab, and a grid of moving previews. */
export function ResourceLibrary({ items }: { items: Resource[] }) {
  const [tab, setTab] = useState<ResourceTab>('Text animations')
  const [tag, setTag] = useState('All')
  const [q, setQ] = useState('')
  const inTab = useMemo(() => items.filter((r) => r.tab === tab), [items, tab])
  const tags = useMemo(() => ['All', ...new Set(inTab.map((r) => r.tag))], [inTab])
  const list = inTab.filter((r) => (tag === 'All' || r.tag === tag) && r.name.toLowerCase().includes(q.trim().toLowerCase()))

  return (
    <section className="s17-panel mx-auto max-w-[1300px] rounded-[22px] p-4 sm:p-6 md:mx-9 min-[1374px]:mx-auto">
      <div className="flex gap-1.5 pb-5" aria-hidden>
        <span className="size-2.5 rounded-full bg-white/15" />
        <span className="size-2.5 rounded-full bg-white/15" />
        <span className="size-2.5 rounded-full bg-white/15" />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5" role="tablist">
          {RESOURCE_TABS.map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => {
                setTab(t)
                setTag('All')
              }}
              className={cn('h-8 rounded-full px-3.5 text-[12px] font-medium transition-colors', tab === t ? 'bg-white text-black' : 'bg-white/[0.06] text-white/70 hover:text-white')}
            >
              {t}
            </button>
          ))}
        </div>
        <p className="text-[11.5px] text-white/40">
          {inTab.length} {tab.toLowerCase()}
        </p>
      </div>
      <div className="relative mt-4">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-3.5 -translate-y-1/2 text-white/40" />
        <label htmlFor="s17-res-search" className="sr-only">Search resources</label>
        <input
          id="s17-res-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search resources..."
          autoComplete="off"
          className="h-10 w-full rounded-xl border border-white/10 bg-black/40 pl-10 pr-4 text-[12.5px] text-white outline-none placeholder:text-white/35 focus:border-[#ff1f38]/60 [&::-webkit-search-cancel-button]:hidden"
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {tags.map((t) => (
          <button key={t} type="button" onClick={() => setTag(t)} className={cn('h-7 rounded-full px-3 text-[11px] transition-colors', tag === t ? 'bg-white text-black' : 'bg-white/[0.05] text-white/65 hover:text-white')}>
            {t}
          </button>
        ))}
      </div>
      <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {list.map((r) => (
          <li key={r.name}>
            <div className="group relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-[#070708]">
              <Preview r={r} />
              <a href={r.url ?? SEVENTEEN_LINKS.discord} target="_blank" rel="noreferrer" aria-label={`Download ${r.name}`} className="absolute bottom-2 right-2 grid size-7 place-items-center rounded-full bg-white text-black opacity-80 transition-opacity group-hover:opacity-100">
                <Download className="size-3.5" />
              </a>
            </div>
            <p className="mt-2 text-[12.5px] font-medium text-white">{r.name}</p>
            <p className="text-[11px] text-white/40">{r.tag}</p>
          </li>
        ))}
      </ul>
      {list.length === 0 && <p className="py-16 text-center text-[13px] text-white/50">Nothing matches that.</p>}
    </section>
  )
}

const MOTION = { blur: 's17-blur', rise: 's17-rise', type: 's17-type', scale: 's17-scale', slide: 's17-slide', flicker: 's17-flicker' } as const

/** A resource's preview: the word 17 doing the animation, a drifting light, or the grade's two colours. */
function Preview({ r }: { r: Resource }) {
  const l = r.look
  if (l.kind === 'text')
    return (
      <div className="absolute inset-0 grid place-items-center overflow-hidden">
        <span data-anim className="font-display text-[clamp(1.4rem,3vw,2rem)] font-black uppercase tracking-[-0.04em] text-white" style={{ animation: `${MOTION[l.motion]} 2.6s cubic-bezier(0.2,0.8,0.2,1) infinite` }}>
          Seventeen
        </span>
      </div>
    )
  if (l.kind === 'overlay')
    return (
      <div className="absolute inset-0 overflow-hidden">
        <div data-anim className="absolute inset-[-30%] rounded-full blur-2xl" style={{ background: `radial-gradient(40% 40% at 50% 50%, ${l.colour}, transparent 70%)`, animation: 's17-drift 6s ease-in-out infinite' }} />
      </div>
    )
  return (
    <div className="absolute inset-0" style={{ background: `linear-gradient(120deg, ${l.from}, ${l.to})` }}>
      <div className="absolute inset-y-0 left-1/2 w-px bg-white/40" />
      <span className="absolute left-2 top-2 rounded bg-black/40 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-white/70">Before</span>
      <span className="absolute right-2 top-2 rounded bg-black/40 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-white/70">After</span>
    </div>
  )
}
