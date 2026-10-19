'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Heart, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { BlobTabs } from '@/components/glass/blob'
import { GlassSurface } from '@/components/glass/glass'
import { type Clip, type Mini, poster } from '@/lib/trailers/types'
import { api, useTrailers } from './ctx'
import { EASE } from './ui'

type Tab = 'liked' | 'saved' | 'favorites'

function Poster({ m, i, onPlay, onRemove }: { m: Mini; i: number; onPlay: () => void; onRemove?: () => void }) {
  return (
    <motion.div layout initial={{ opacity: 0, y: 26, filter: 'blur(8px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.6, ease: EASE, delay: Math.min(i, 12) * 0.035 }} className="group relative">
      <motion.button type="button" onClick={onPlay} whileHover={{ y: -6, scale: 1.02 }} whileTap={{ scale: 0.97 }} transition={{ type: 'spring', stiffness: 420, damping: 26 }} aria-label={`Play the trailer for ${m.t}`} className="relative block aspect-[2/3] w-full overflow-hidden rounded-[22px] bg-white/[0.06] shadow-[0_18px_36px_-18px_rgb(0_0_0/0.9)] outline-none focus-visible:ring-2 focus-visible:ring-paper/70">
        {m.p && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={poster(m.p, 342)} alt="" loading="lazy" draggable={false} className="size-full object-cover transition-transform duration-700 group-hover:scale-[1.05]" />
        )}
        <span aria-hidden="true" className="absolute inset-0 rounded-[22px] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.12)]" />
        <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        <span className="absolute inset-x-0 bottom-0 translate-y-2 p-4 text-left opacity-0 transition-[opacity,transform] duration-500 group-hover:translate-y-0 group-hover:opacity-100">
          <span className="block truncate font-display text-[1.25rem] leading-tight">{m.t}</span>
          <span className="block text-[12.5px] text-paper/65">{[m.y, m.r ? `★ ${m.r.toFixed(1)}` : ''].filter(Boolean).join('  ·  ')}</span>
        </span>
      </motion.button>
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label={`Remove ${m.t}`} className="absolute top-3 right-3 grid size-9 place-items-center rounded-full text-paper opacity-0 outline-none transition-opacity duration-300 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-paper">
          <GlassSurface flat className="pointer-events-none absolute inset-0" />
          <X className="relative z-10 size-4" />
        </button>
      )}
    </motion.div>
  )
}

const hue = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7)

/** Your page: who you are, and everything you have liked, saved and picked. */
export function AccountView({ onOpen }: { onOpen: (c: Clip) => void }) {
  const { profile, toggle, toast } = useTrailers()
  const [tab, setTab] = useState<Tab>('liked')
  const lists = useMemo(() => ({ liked: profile?.liked ?? [], saved: profile?.saved ?? [], favorites: profile?.favorites ?? [] }), [profile])
  if (!profile) return null
  const list = lists[tab]
  const h = hue(profile.username)

  const play = async (m: Mini) => {
    try {
      const r = await api<{ clip: Clip }>(`/api/trailers/movie/${m.id}`)
      onOpen(r.clip)
    } catch {
      toast(`${m.t} has no trailer to show`)
    }
  }

  return (
    <div className="absolute inset-0 overflow-y-auto [scrollbar-width:none]">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -inset-1/4 opacity-60 blur-[90px]" style={{ background: `radial-gradient(40% 40% at 25% 30%, hsl(${h} 70% 45% / .55), transparent 70%), radial-gradient(40% 40% at 75% 70%, hsl(${(h + 70) % 360} 70% 40% / .4), transparent 70%)` }} />
      </div>
      <div className="mx-auto grid max-w-[1320px] grid-cols-[340px_1fr] gap-16 px-16 pt-36 pb-44">
        <aside className="sticky top-36 self-start">
          <GlassSurface radius={44} className="w-full">
            <div className="relative z-10 p-9">
              <div className="grid size-24 place-items-center rounded-full font-display text-[2.8rem] text-white shadow-[0_14px_34px_-12px_rgb(0_0_0/0.7)]" style={{ background: `radial-gradient(circle at 30% 25%, hsl(${h} 80% 72%), hsl(${(h + 50) % 360} 70% 38%) 60%, hsl(${(h + 90) % 360} 60% 18%))` }} aria-hidden="true">
                {profile.name.slice(0, 1).toUpperCase()}
              </div>
              <h1 className="mt-6 font-display text-[2.6rem] leading-[1.05]">{profile.name}</h1>
              <p className="mt-1.5 text-[15px] text-paper/55">@{profile.username}</p>
              <div className="mt-8 grid grid-cols-3 gap-2 border-t border-white/10 pt-6">
                {([['liked', 'Liked', profile.liked.length], ['saved', 'Saved', profile.saved.length], ['favorites', 'Picks', profile.favorites.length]] as const).map(([k, label, n]) => (
                  <button key={k} type="button" onClick={() => setTab(k)} className="rounded-2xl py-2 text-left outline-none transition-colors hover:bg-white/[0.05] focus-visible:ring-2 focus-visible:ring-paper/60">
                    <motion.span key={n} initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="block pl-2 font-display text-[2.2rem] leading-none tabular-nums">{n}</motion.span>
                    <span className="mt-1.5 block pl-2 text-[12.5px] text-paper/50">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </GlassSurface>
        </aside>

        <main>
          <BlobTabs ariaLabel="Your lists" value={tab} onChange={(v) => setTab(v as Tab)} items={[{ id: 'liked', label: 'Liked', aria: 'Liked' }, { id: 'saved', label: 'Saved', aria: 'Saved' }, { id: 'favorites', label: 'Your picks', aria: 'Your picks' }]} height={44} />
          <div className="mt-10">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={tab} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: 0.12 } }} transition={{ duration: 0.4, ease: EASE }}>
                {list.length === 0 ? (
                  <div className="grid min-h-[360px] place-content-center text-center">
                    <Heart className="mx-auto size-8 text-paper/35" strokeWidth={1.4} aria-hidden="true" />
                    <p className="mt-5 font-display text-[2.2rem] leading-tight">{tab === 'liked' ? 'Nothing liked yet.' : tab === 'saved' ? 'Nothing saved yet.' : 'No picks yet.'}</p>
                    <p className="mx-auto mt-3 max-w-xs text-[15px] text-paper/50">{tab === 'favorites' ? 'Change your picks in Settings.' : `Press ${tab === 'liked' ? 'L' : 'S'} on a trailer, or use the buttons beside it.`}</p>
                  </div>
                ) : (
                  <motion.div layout className="grid grid-cols-4 gap-x-7 gap-y-10 xl:grid-cols-5">
                    <AnimatePresence>
                      {list.map((m, i) => (
                        <Poster key={m.id} m={m} i={i} onPlay={() => void play(m)} onRemove={tab === 'favorites' ? undefined : () => void toggle(tab === 'liked' ? 'like' : 'save', m)} />
                      ))}
                    </AnimatePresence>
                  </motion.div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  )
}
