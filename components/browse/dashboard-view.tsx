'use client'

import { motion } from 'framer-motion'
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { TOUR_EVENT } from '@/components/shell/site-nav'
import type { Campaign, Platform } from '@/lib/campaigns'
import type { EndedCampaign } from '@/lib/campaigns-db'
import { agoText } from '@/lib/time-ago'
import { useNavUser } from '@/components/shell/nav-user'
import { TransitionLink } from '@/components/shell/transition-link'
import { EASE_OUT } from '@/lib/layout'
import { CampaignGrid } from './campaign-grid'
import { EndingSoon } from './ending-soon'
import { FilterBar, type SortKey } from './filter-bar'
import { GlassSearch } from './glass-search'
import { GuidedTour } from './guided-tour'

export function DashboardView({ campaigns, ended = [], startTour }: { campaigns: Campaign[]; ended?: EndedCampaign[]; startTour: boolean }) {
  const [query, setQuery] = useState('')
  const { user } = useNavUser()
  const signedIn = Boolean(user?.signedIn)
  const [tourOpen, setTourOpen] = useState(startTour)
  const deferred = useDeferredValue(query)

  const [category, setCategory] = useState('All')
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [sort, setSort] = useState<SortKey>('rate')

  const categories = useMemo(
    () => ['All', ...Array.from(new Set(campaigns.map((c) => c.type.split(' · ')[0])))],
    [campaigns],
  )
  const filtersActive = category !== 'All' || platforms.length > 0 || sort !== 'rate'

  // Open a campaign and come back: your search and filters are still there, instead of starting again from the top.
  const [restored, setRestored] = useState(false)
  useEffect(() => {
    try {
      const v = JSON.parse(window.sessionStorage.getItem('ll:browse') ?? 'null') as { q?: unknown; category?: unknown; platforms?: unknown; sort?: unknown } | null
      if (v) {
        if (typeof v.q === 'string') setQuery(v.q.slice(0, 80))
        if (typeof v.category === 'string' && categories.includes(v.category)) setCategory(v.category)
        if (Array.isArray(v.platforms)) setPlatforms(v.platforms.filter((p): p is Platform => p === 'tiktok' || p === 'youtube' || p === 'instagram'))
        if (v.sort === 'rate' || v.sort === 'ending' || v.sort === 'budget') setSort(v.sort)
      }
    } catch {
      /* nothing remembered, or storage is blocked: start fresh */
    }
    setRestored(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    if (!restored) return
    try {
      window.sessionStorage.setItem('ll:browse', JSON.stringify({ q: query, category, platforms, sort }))
    } catch {
      /* blocked storage just forgets */
    }
  }, [restored, query, category, platforms, sort])

  const results = useMemo(() => {
    const q = deferred.trim().toLowerCase()
    const end = (c: Campaign) => Date.parse(`${c.endsOn} 2026`) || 0
    return campaigns
      .filter((c) => category === 'All' || c.type.startsWith(category))
      .filter((c) => platforms.every((p) => c.platforms.includes(p)))
      .filter(
        (c) => !q || [c.title, c.creator, c.type, ...c.platforms].some((field) => field.toLowerCase().includes(q)),
      )
      .sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || (sort === 'rate' ? b.ratePer1k - a.ratePer1k : sort === 'budget' ? b.budget - a.budget : end(a) - end(b)))
  }, [campaigns, deferred, category, platforms, sort])

  // a campaign that has closed is not listed, but if someone searches for it, say that it ended and how long ago
  const gone = useMemo(() => {
    const q = deferred.trim().toLowerCase()
    if (q.length < 2) return []
    return ended.filter((c) => c.title.toLowerCase().includes(q) || c.creator.toLowerCase().includes(q)).slice(0, 3)
  }, [ended, deferred])

  useEffect(() => {
    const open = () => setTourOpen(true)
    window.addEventListener(TOUR_EVENT, open)
    return () => window.removeEventListener(TOUR_EVENT, open)
  }, [])

  const closeTour = useCallback(() => {
    setTourOpen(false)
    if (window.location.search.includes('tour')) window.history.replaceState(null, '', '/')
  }, [])

  return (
    <>
      <section aria-labelledby="hero-title" className="mx-auto flex max-w-3xl flex-col items-center pt-14 pb-12 text-center md:pt-24 md:pb-16">
        <h1 id="hero-title" className="font-display text-[clamp(2.6rem,7vw,5.2rem)] leading-[0.98]">
          Your views have value.
        </h1>
        <p className="mt-6 max-w-md text-lg leading-relaxed text-paper/60">Join a campaign, post your content, and earn for every 1,000 verified views.</p>
        {!signedIn && (
          <TransitionLink href="/onboarding" className="mt-9 inline-flex h-12 items-center rounded-pill bg-paper px-8 text-[15px] font-medium text-ink transition-colors hover:bg-paper/85">
            Get started
          </TransitionLink>
        )}
      </section>

      <motion.div
        initial={false}
        className="sticky top-[76px] z-20 mx-auto mb-3 max-w-3xl md:mb-4"
      >
        <GlassSearch value={query} onChange={setQuery} resultCount={results.length} />
      </motion.div>

      <FilterBar
        categories={categories}
        category={category}
        onCategory={setCategory}
        platforms={platforms}
        onPlatform={(p) => setPlatforms((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]))}
        sort={sort}
        onSort={setSort}
        active={filtersActive}
        onClear={() => {
          setCategory('All')
          setPlatforms([])
          setSort('rate')
        }}
      />

      {!filtersActive && !deferred.trim() && <EndingSoon campaigns={campaigns} />}

      <section id="campaigns" aria-label="Campaigns" className="scroll-mt-40">
        {results.length > 0 ? (
          <div className="island mx-auto max-w-[1300px] rounded-[calc(40px*var(--round,1))] bg-[#0a0a0c] p-4 sm:p-6 md:rounded-[calc(52px*var(--round,1))] md:p-10">
            <CampaignGrid campaigns={results} />
          </div>
        ) : (
          <div className="mx-auto max-w-xl rounded-[calc(28px*var(--round,1))] border border-dashed border-line-strong px-6 py-20 text-center">
            {gone.length > 0 ? (
              <>
                <p className="font-display text-3xl">that campaign has ended</p>
                <ul className="mt-5 grid gap-2 text-[15px]">
                  {gone.map((c) => (
                    <li key={c.id}>
                      <TransitionLink href={`/campaign/${c.id}`} className="text-paper underline decoration-paper/30 underline-offset-4 transition-colors hover:decoration-paper">
                        {c.title}
                      </TransitionLink>{' '}
                      <span className="text-mute">ended {agoText(c.endedAt)}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-sm text-mute">Try another search to find something that is live.</p>
              </>
            ) : (
              <>
                <p className="font-display text-3xl">no campaigns match</p>
                <p className="mt-2 text-sm text-mute">Try a different search, or clear the filters.</p>
              </>
            )}
          </div>
        )}
      </section>

      <GuidedTour open={tourOpen} onClose={closeTour} />
    </>
  )
}
