'use client'

import { motion } from 'framer-motion'
import { ExternalLink, Loader2, Play } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { type Credit, type PersonPage, poster, portrait } from '@/lib/trailers/types'
import { cn } from '@/lib/utils'
import { api, useTrailers } from './ctx'
import { EASE, GButton, Skeleton } from './ui'

const long = (d: string) => {
  const t = new Date(`${d}T00:00:00`)
  return Number.isNaN(t.getTime()) ? d : t.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}
const ageOf = (born: string, died: string | null) => {
  const b = new Date(`${born}T00:00:00`)
  const e = died ? new Date(`${died}T00:00:00`) : new Date()
  if (Number.isNaN(b.getTime()) || Number.isNaN(e.getTime())) return null
  let a = e.getFullYear() - b.getFullYear()
  if (e.getMonth() < b.getMonth() || (e.getMonth() === b.getMonth() && e.getDate() < b.getDate())) a--
  return a >= 0 && a < 130 ? a : null
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[12.5px] tracking-[0.14em] text-paper/45 uppercase">{label}</dt>
      <dd className="mt-1 text-[16px] text-paper/85">{children}</dd>
    </div>
  )
}

/** One poster in the "known for" row. A film opens its trailer; a show is only shown (there are no trailers for shows here). */
function Known({ c, busy, onOpen }: { c: Credit; busy: boolean; onOpen: (c: Credit) => void }) {
  const playable = c.kind === 'movie'
  return (
    <li className="w-[150px] shrink-0">
      <button type="button" disabled={!playable || busy} onClick={() => onOpen(c)} aria-label={playable ? `Watch the trailer for ${c.t}` : c.t} className="group relative block aspect-[2/3] w-full overflow-hidden rounded-[18px] bg-white/[0.06] outline-none focus-visible:ring-2 focus-visible:ring-paper/70 disabled:cursor-default">
        {c.p && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={poster(c.p, 342)} alt="" loading="lazy" draggable={false} className={cn('size-full object-cover transition-transform duration-500', playable && 'group-hover:scale-[1.05]')} />
        )}
        <span aria-hidden="true" className="absolute inset-0 rounded-[18px] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.1)]" />
        {!playable && <span className="absolute top-2 left-2 rounded-full bg-black/65 px-2 py-0.5 text-[11px] text-paper/80">TV</span>}
        {playable && (
          <span className="absolute inset-0 grid place-items-center bg-black/35 opacity-0 transition-opacity group-hover:opacity-100">
            {busy ? <Loader2 className="size-6 animate-spin" aria-hidden="true" /> : <Play className="size-7 fill-paper" aria-hidden="true" />}
          </span>
        )}
      </button>
      <p className="mt-2.5 line-clamp-2 text-[14px] leading-snug text-paper/85">{c.t}</p>
      {c.role && <p className="mt-0.5 line-clamp-1 text-[12.5px] text-paper/45">{c.role}</p>}
    </li>
  )
}

/**
 * A person's page: who they are, and every film and show they are in or made. Opened by pressing a name under a trailer.
 * Pressing a film plays its trailer. It sits over the trailers, and the trailer behind it is paused.
 */
export function PersonView({ id, onClose, onOpenMovie }: { id: number; onClose: () => void; onOpenMovie: (movieId: number) => Promise<boolean> }) {
  const { lite } = useTrailers()
  const [p, setP] = useState<PersonPage | null>(null)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'movies' | 'tv'>('movies')
  const [full, setFull] = useState(false)
  const [all, setAll] = useState(false)
  const [busy, setBusy] = useState<number | null>(null)
  const scroller = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let live = true
    setP(null)
    setError('')
    setFull(false)
    setAll(false)
    setBusy(null)
    scroller.current?.scrollTo(0, 0)
    api<{ person: PersonPage }>(`/api/trailers/person/${id}`)
      .then((r) => {
        if (!live) return
        setP(r.person)
        setTab(r.person.movies.length > 0 || r.person.tv.length === 0 ? 'movies' : 'tv')
      })
      .catch((e) => live && setError(e instanceof Error ? e.message : 'We could not load that page.'))
    return () => {
      live = false
    }
  }, [id])

  const open = async (c: Credit) => {
    if (c.kind !== 'movie' || busy !== null) return
    setBusy(c.id)
    const ok = await onOpenMovie(c.id)
    if (!ok) setBusy(null)
  }

  const list = p ? (tab === 'movies' ? p.movies : p.tv) : []
  const shown = all ? list : list.slice(0, 40)
  const bio = p?.bio ?? ''
  const clipped = !full && bio.length > 760 ? `${bio.slice(0, 760).replace(/\s+\S*$/, '')}…` : bio
  const age = p?.birthday ? ageOf(p.birthday, p.deathday) : null
  const enter = lite ? { initial: { opacity: 0 }, animate: { opacity: 1 } } : { initial: { opacity: 0, y: 26 }, animate: { opacity: 1, y: 0 } }

  return (
    <div ref={scroller} className="absolute inset-0 z-30 overflow-y-auto bg-black/[0.97] [scrollbar-width:none]" role="dialog" aria-label={p ? p.name : 'Person'}>
      <div className="fixed top-7 right-8 z-[75]">
        <GButton size="sm" onClick={onClose}>Close</GButton>
      </div>
      <div className="mx-auto max-w-[1180px] px-10 pt-32 pb-44">
        {error ? (
          <div className="pt-24 text-center">
            <p className="font-display text-4xl">We could not load that page.</p>
            <p className="mt-3 text-paper/55">{error}</p>
          </div>
        ) : !p ? (
          <div className="grid grid-cols-[260px_1fr] gap-12">
            <Skeleton className="aspect-[2/3] rounded-[28px]" />
            <div className="space-y-5 pt-4">
              <Skeleton className="h-16 w-3/4 rounded-2xl" />
              <Skeleton className="h-5 w-1/2 rounded-full" />
              <Skeleton className="h-40 w-full rounded-2xl" />
            </div>
          </div>
        ) : (
          <>
            <motion.header {...enter} transition={{ duration: lite ? 0.35 : 0.7, ease: EASE }} className="grid grid-cols-[260px_1fr] gap-12">
              <div>
                {p.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={portrait(p.photo)} alt={p.name} draggable={false} className="aspect-[2/3] w-full rounded-[28px] bg-white/[0.06] object-cover shadow-[0_30px_80px_-30px_rgb(0_0_0/0.9)]" />
                ) : (
                  <div className="grid aspect-[2/3] w-full place-items-center rounded-[28px] bg-white/[0.06] font-display text-7xl text-paper/50">{p.name.slice(0, 1)}</div>
                )}
              </div>
              <div className="min-w-0 pt-2">
                {p.dept && <p className="text-[13px] tracking-[0.18em] text-paper/50 uppercase">{p.dept}</p>}
                <h1 className="mt-3 font-display text-[clamp(3rem,5.4vw,5.6rem)] leading-[1.02]">{p.name}</h1>
                <dl className="mt-7 flex flex-wrap gap-x-12 gap-y-5">
                  {p.birthday && (
                    <Fact label="Born">
                      {long(p.birthday)}
                      {age !== null && !p.deathday && <span className="text-paper/50">  ·  {age} years old</span>}
                    </Fact>
                  )}
                  {p.deathday && (
                    <Fact label="Died">
                      {long(p.deathday)}
                      {age !== null && <span className="text-paper/50">  ·  aged {age}</span>}
                    </Fact>
                  )}
                  {p.place && <Fact label="From">{p.place}</Fact>}
                  <Fact label="In">{p.movies.length} films{p.tv.length > 0 ? ` and ${p.tv.length} shows` : ''}</Fact>
                </dl>
                <div className="mt-7 max-w-[720px]">
                  {bio ? (
                    <>
                      {clipped.split(/\n{2,}/).map((para, i) => (
                        <p key={i} className="mb-4 text-[16.5px] leading-[1.7] text-paper/70">{para}</p>
                      ))}
                      {bio.length > 760 && (
                        <button type="button" onClick={() => setFull((f) => !f)} className="text-[14.5px] text-paper/60 underline decoration-paper/25 underline-offset-4 hover:text-paper">
                          {full ? 'Show less' : 'Read the rest'}
                        </button>
                      )}
                    </>
                  ) : (
                    <p className="text-[16px] text-paper/50">We do not have a biography for {p.name} yet.</p>
                  )}
                </div>
                <div className="mt-7 flex flex-wrap gap-3">
                  {p.imdb && (
                    <a href={p.imdb} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-full border border-white/20 px-5 text-[14px] text-paper/85 transition-colors hover:border-white/40 hover:text-paper">
                      IMDb <ExternalLink className="size-3.5" aria-hidden="true" />
                    </a>
                  )}
                  <a href={`https://www.themoviedb.org/person/${p.id}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-full border border-white/20 px-5 text-[14px] text-paper/85 transition-colors hover:border-white/40 hover:text-paper">
                    TMDB <ExternalLink className="size-3.5" aria-hidden="true" />
                  </a>
                </div>
              </div>
            </motion.header>

            {p.known.length > 0 && (
              <motion.section {...enter} transition={{ duration: lite ? 0.35 : 0.7, ease: EASE, delay: lite ? 0 : 0.1 }} className="mt-16">
                <h2 className="font-display text-[1.9rem]">Known for</h2>
                <ul className="mt-6 flex gap-5 overflow-x-auto pb-3 [scrollbar-width:none]">
                  {p.known.map((c) => (
                    <Known key={`${c.kind}${c.id}`} c={c} busy={busy === c.id} onOpen={(x) => void open(x)} />
                  ))}
                </ul>
              </motion.section>
            )}

            <motion.section {...enter} transition={{ duration: lite ? 0.35 : 0.7, ease: EASE, delay: lite ? 0 : 0.18 }} className="mt-16">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <h2 className="font-display text-[1.9rem]">Everything they are in</h2>
                <div role="tablist" aria-label="Films or shows" className="flex gap-2">
                  {(['movies', 'tv'] as const).map((k) => {
                    const n = k === 'movies' ? p.movies.length : p.tv.length
                    if (k === 'tv' && n === 0) return null
                    return (
                      <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => { setTab(k); setAll(false) }} className={cn('h-10 rounded-full px-5 text-[14px] transition-colors', tab === k ? 'bg-paper text-ink' : 'border border-white/15 text-paper/70 hover:text-paper')}>
                        {k === 'movies' ? 'Films' : 'Shows'} <span className="opacity-60">{n}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
              {list.length === 0 ? (
                <p className="mt-8 text-paper/50">Nothing listed yet.</p>
              ) : (
                <ul className="mt-6 divide-y divide-white/[0.08] border-t border-white/[0.08]">
                  {shown.map((c) => {
                    const playable = c.kind === 'movie'
                    return (
                      <li key={`${c.kind}${c.id}`}>
                        <button type="button" disabled={!playable || busy !== null} onClick={() => void open(c)} className={cn('group grid w-full grid-cols-[56px_48px_1fr_auto] items-center gap-5 py-3.5 text-left outline-none focus-visible:bg-white/[0.04]', playable ? 'hover:bg-white/[0.04]' : 'cursor-default')}>
                          <span className="text-[14px] text-paper/45 tabular-nums">{c.y || 'TBA'}</span>
                          <span className="block h-[70px] w-12 overflow-hidden rounded-lg bg-white/[0.06]">
                            {c.p && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={poster(c.p, 185)} alt="" loading="lazy" draggable={false} className="size-full object-cover" />
                            )}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-[17px] text-paper">{c.t}</span>
                            {c.role && <span className="mt-0.5 block truncate text-[14px] text-paper/50">{c.role}</span>}
                          </span>
                          <span className="flex items-center gap-4 text-[13.5px] text-paper/50">
                            {c.r > 0 && <span>★ {c.r.toFixed(1)}</span>}
                            {c.kind === 'tv' && c.eps ? <span>{c.eps} {c.eps === 1 ? 'episode' : 'episodes'}</span> : null}
                            {playable && (busy === c.id ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Play className="size-4 fill-paper/0 text-paper/0 transition-colors group-hover:fill-paper group-hover:text-paper" aria-hidden="true" />)}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
              {!all && list.length > shown.length && (
                <div className="mt-8 flex justify-center">
                  <GButton size="sm" onClick={() => setAll(true)}>Show all {list.length}</GButton>
                </div>
              )}
              <p className="mt-10 text-[12.5px] text-paper/35">Credits and biographies from TMDB.</p>
            </motion.section>
          </>
        )}
      </div>
    </div>
  )
}
