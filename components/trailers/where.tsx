'use client'

import { motion } from 'framer-motion'
import { ExternalLink, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { GlassMenu } from '@/components/glass/blob'
import { GlassSurface } from '@/components/glass/glass'
import { type Clip, type Provider, REGIONS, type Where, logo, poster } from '@/lib/trailers/types'
import { api, useTrailers } from './ctx'
import { EASE, Skeleton } from './ui'

function Row({ title, list, link }: { title: string; list: Provider[]; link: string | null }) {
  if (!list.length) return null
  return (
    <section>
      <h3 className="mb-3 text-[13px] tracking-wide text-paper/45">{title}</h3>
      <div className="flex flex-wrap gap-x-5 gap-y-4">
        {list.slice(0, 12).map((p) => (
          <motion.a
            key={p.id}
            href={link ?? undefined}
            target="_blank"
            rel="noreferrer noopener"
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 480, damping: 26 }}
            className="group flex w-[72px] flex-col items-center gap-2 text-center outline-none"
            aria-label={`${p.name}. Opens the list of where to watch.`}
          >
            <span className="relative block size-[60px] overflow-hidden rounded-[16px] shadow-[0_8px_20px_-8px_rgb(0_0_0/0.7)] ring-1 ring-white/15 group-focus-visible:ring-2 group-focus-visible:ring-paper">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logo(p.logo)} alt="" className="size-full object-cover" draggable={false} />
            </span>
            <span className="line-clamp-2 text-[11.5px] leading-tight text-paper/65">{p.name}</span>
          </motion.a>
        ))}
      </div>
    </section>
  )
}

/** Where a movie can be watched, as a pane of glass that opens from the Watch button. */
export function WherePopup({ clip, onClose }: { clip: Clip; onClose: () => void }) {
  const { settings, patchSettings } = useTrailers()
  const [region, setRegion] = useState(settings.region)
  const [data, setData] = useState<Where | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let live = true
    setData(null)
    setError('')
    api<{ where: Where }>(`/api/trailers/where?id=${clip.id}&region=${region}`)
      .then((r) => live && setData(r.where))
      .catch((e) => live && setError(e instanceof Error ? e.message : 'Could not find out.'))
    return () => {
      live = false
    }
  }, [clip.id, region])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && (e.stopPropagation(), onClose())
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose])

  const none = data && !data.stream.length && !data.free.length && !data.rent.length && !data.buy.length
  const name = REGIONS.find(([c]) => c === region)?.[1] ?? region

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center">
      <motion.button type="button" aria-label="Close" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }} className="absolute inset-0 cursor-default rounded-none bg-black/55 backdrop-blur-[6px]" />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={`Where to watch ${clip.title}`}
        initial={{ opacity: 0, scale: 0.86, y: 30, x: 60, filter: 'blur(14px)' }}
        animate={{ opacity: 1, scale: 1, y: 0, x: 0, filter: 'blur(0px)' }}
        exit={{ opacity: 0, scale: 0.94, y: 16, filter: 'blur(8px)', transition: { duration: 0.22 } }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="relative w-[min(660px,92vw)]"
      >
        <GlassSurface radius={40} className="w-full">
          <div className="relative z-10 p-9">
            <div className="flex items-start gap-6">
              {clip.poster && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={poster(clip.poster, 185)} alt="" className="h-[108px] w-[72px] shrink-0 rounded-[14px] object-cover shadow-[0_10px_26px_-10px_rgb(0_0_0/0.8)] ring-1 ring-white/15" draggable={false} />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[13px] text-paper/45">Where to watch</p>
                <h2 className="mt-1 truncate font-display text-[2.1rem] leading-tight">{clip.title}</h2>
                <p className="mt-1 text-[14px] text-paper/50">{clip.year}</p>
              </div>
              <button type="button" onClick={onClose} aria-label="Close" className="relative grid size-11 shrink-0 place-items-center rounded-full text-paper outline-none focus-visible:ring-2 focus-visible:ring-paper/70">
                <GlassSurface shine flat className="pointer-events-none absolute inset-0" />
                <X className="relative z-10 size-[18px]" />
              </button>
            </div>

            <div className="mt-7 flex items-center justify-between gap-4">
              <span className="text-[14px] text-paper/55">Showing {name}</span>
              <GlassMenu label="Country" value={region} width={260} onChange={(r) => { setRegion(r); void patchSettings({ region: r }) }} options={REGIONS.map(([id, label]) => ({ id, label }))} />
            </div>

            <div className="mt-7 flex min-h-[170px] flex-col gap-7">
              {!data && !error && (
                <div className="flex gap-5">
                  {Array.from({ length: 6 }, (_, i) => (
                    <div key={i} className="flex w-[72px] flex-col items-center gap-2">
                      <Skeleton className="size-[60px] rounded-[16px]" />
                      <Skeleton className="h-3 w-12 rounded-full" />
                    </div>
                  ))}
                </div>
              )}
              {error && <p className="text-paper/60">{error}</p>}
              {data && (
                <>
                  <Row title="Stream" list={data.stream} link={data.link} />
                  <Row title="Free with ads" list={data.free} link={data.link} />
                  <Row title="Rent" list={data.rent} link={data.link} />
                  <Row title="Buy" list={data.buy} link={data.link} />
                  {none && (
                    <div className="py-6 text-center">
                      <p className="font-display text-[1.7rem]">Not available here yet.</p>
                      <p className="mt-2 text-[14.5px] text-paper/55">Nobody lists {clip.title} in {name} right now. Try another country.</p>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="mt-8 flex items-center justify-between gap-4 border-t border-white/10 pt-5 text-[12px] text-paper/40">
              <span>Where to watch from JustWatch. Movie data from TMDB.</span>
              {data?.link && (
                <a href={data.link} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1.5 text-[13px] text-paper/75 transition-colors hover:text-paper">
                  See every option <ExternalLink className="size-3.5" aria-hidden="true" />
                </a>
              )}
            </div>
          </div>
        </GlassSurface>
      </motion.div>
    </div>
  )
}
