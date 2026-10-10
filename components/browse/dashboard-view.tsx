'use client'

import { motion } from 'framer-motion'
import { Compass } from 'lucide-react'
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { TOUR_EVENT } from '@/components/shell/site-nav'
import type { Campaign, Platform } from '@/lib/campaigns'
import { Layer, Tilt3D } from '@/components/motion/tilt'
import { Words } from '@/components/motion/words'
import { EASE_OUT } from '@/lib/layout'
import { CampaignGrid } from './campaign-grid'
import { FilterBar, type SortKey } from './filter-bar'
import { GlassSearch } from './glass-search'
import { GuidedTour } from './guided-tour'

export function DashboardView({ campaigns, startTour }: { campaigns: Campaign[]; startTour: boolean }) {
  const [query, setQuery] = useState('')
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

  const results = useMemo(() => {
    const q = deferred.trim().toLowerCase()
    const end = (c: Campaign) => Date.parse(`${c.endsOn} 2026`) || 0
    return campaigns
      .filter((c) => category === 'All' || c.type.startsWith(category))
      .filter((c) => platforms.every((p) => c.platforms.includes(p)))
      .filter(
        (c) => !q || [c.title, c.creator, c.type, ...c.platforms].some((field) => field.toLowerCase().includes(q)),
      )
      .sort((a, b) => (sort === 'rate' ? b.ratePer1k - a.ratePer1k : sort === 'budget' ? b.budget - a.budget : end(a) - end(b)))
  }, [campaigns, deferred, category, platforms, sort])

  // The hero shows either the headline or the big logo, picked at random on each visit.
  // It is chosen after mount so the server and browser HTML always match.
  const [hero, setHero] = useState<'text' | 'logo' | null>(null)
  useEffect(() => {
    setHero(Math.random() < 0.5 ? 'text' : 'logo')
  }, [])

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
      <section aria-labelledby="hero-title" className="flex flex-col items-center pt-16 pb-14 text-center md:pt-24 md:pb-16">
        <h1 className="sr-only" id="hero-title">
          logoless: views have value
        </h1>
        <Tilt3D global glare={false} max={5} className="flex min-h-[150px] w-full items-center justify-center md:min-h-[290px]">
          {hero === 'text' && (
            <Layer z={90}>
              <Words
                as="p"
                sweep
                immediate
                delay={0.1}
                stagger={0.12}
                text="views have value"
                className="mx-auto max-w-[10ch] font-display text-[15vw] leading-[0.95] md:text-[8.5vw] xl:text-[132px]"
              />
            </Layer>
          )}
          {hero === 'logo' && (
            <Layer z={90}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <motion.img
                src="/logo-lg.png"
                alt=""
                width={1100}
                height={587}
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.9, ease: EASE_OUT }}
                className="mx-auto block w-[min(620px,82vw)] select-none"
                draggable={false}
              />
            </Layer>
          )}
        </Tilt3D>
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          type="button"
          onClick={() => setTourOpen(true)}
          className="mt-10 inline-flex h-11 items-center gap-2 border border-line-strong px-5 text-sm transition-colors hover:bg-paper/10 rounded-full"
        >
          <Compass aria-hidden="true" className="size-4" />
          Take the tour
        </motion.button>
      </section>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.35, ease: EASE_OUT }}
        className="sticky top-20 z-20 mb-4 md:mb-5"
      >
        <GlassSearch value={query} onChange={setQuery} resultCount={results.length} className="mx-auto max-w-3xl" />
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

      <section id="campaigns" aria-label="Campaigns" className="scroll-mt-40">
        {results.length > 0 ? (
          <div className="mx-auto max-w-[1300px] rounded-[56px] border border-white/10 bg-white/[0.025] p-4 shadow-[inset_0_1px_0_rgb(255_255_255/0.06)] sm:p-6 md:rounded-[72px] md:p-10">
            <CampaignGrid campaigns={results} />
          </div>
        ) : (
          <div className="mx-auto max-w-xl rounded-[28px] border border-dashed border-line-strong px-6 py-20 text-center">
            <p className="font-display text-3xl">no campaigns match</p>
            <p className="mt-2 text-sm text-mute">Try a different search, or clear the filters.</p>
          </div>
        )}
      </section>

      <GuidedTour open={tourOpen} onClose={closeTour} />
    </>
  )
}
