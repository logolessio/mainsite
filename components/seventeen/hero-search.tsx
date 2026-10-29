'use client'

import { Search } from 'lucide-react'
import { OPEN_SEARCH } from '@/components/seventeen/search'

/** The big search bar in the hero. It is a button that opens the search palette, so there is one search on the site, not two. */
export function HeroSearch({ count }: { count: number }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_SEARCH))}
      className="group flex h-14 min-w-0 flex-1 items-center gap-3 rounded-full bg-white/[0.07] pl-5 pr-2 text-left text-[15px] text-white/45 shadow-[inset_0_1px_0_rgb(255_255_255/0.08)] ring-1 ring-white/15 backdrop-blur-xl transition-colors hover:bg-white/[0.1] hover:text-white/70"
    >
      <Search className="size-[18px] shrink-0 text-white/60" />
      <span className="truncate">Search {count} films, series and anime…</span>
      <span className="ml-auto hidden h-10 items-center rounded-full bg-white px-5 text-[13.5px] font-semibold text-black transition-transform group-hover:scale-[1.03] sm:inline-flex">Search</span>
    </button>
  )
}
