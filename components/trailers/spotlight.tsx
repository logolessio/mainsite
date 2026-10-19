'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Clapperboard, CornerDownLeft, Search, Settings, UserRound } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { GlassSurface } from '@/components/glass/glass'
import { type Clip, type Mini, poster } from '@/lib/trailers/types'
import { cn } from '@/lib/utils'
import { api, useTrailers } from './ctx'
import type { View } from './nav'

type Row = { key: string; title: string; sub: string; poster?: string | null; icon?: React.ReactNode; run: () => void }

/** ⌘K: type a movie to play its trailer, or jump to a page. */
export function Spotlight({ open, onClose, onOpen, onView }: { open: boolean; onClose: () => void; onOpen: (c: Clip) => void; onView: (v: View) => void }) {
  const { toast } = useTrailers()
  const [q, setQ] = useState('')
  const [found, setFound] = useState<Mini[] | null>(null)
  const [trend, setTrend] = useState<Mini[]>([])
  const [sel, setSel] = useState(0)
  const [busy, setBusy] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setQ('')
    setFound(null)
    setSel(0)
    setTimeout(() => input.current?.focus(), 60)
    if (!trend.length) api<{ results: Mini[] }>('/api/trailers/trending').then((r) => setTrend(r.results.slice(0, 5))).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    const term = q.trim()
    if (term.length < 2) return setFound(null)
    const t = setTimeout(() => api<{ results: Mini[] }>(`/api/trailers/search?q=${encodeURIComponent(term)}`).then((r) => { setFound(r.results.slice(0, 7)); setSel(0) }).catch(() => setFound([])), 200)
    return () => clearTimeout(t)
  }, [q])

  const play = async (m: Mini) => {
    setBusy(true)
    try {
      const r = await api<{ clip: Clip }>(`/api/trailers/movie/${m.id}`)
      onClose()
      onOpen(r.clip)
    } catch {
      toast(`${m.t} has no trailer to show`)
    } finally {
      setBusy(false)
    }
  }

  const pages: Row[] = [
    { key: 'p-watch', title: 'Watch trailers', sub: 'Go to the feed', icon: <Clapperboard className="size-5" strokeWidth={1.6} />, run: () => (onClose(), onView('watch')) },
    { key: 'p-account', title: 'Your account', sub: 'Liked, saved and favourites', icon: <UserRound className="size-5" strokeWidth={1.6} />, run: () => (onClose(), onView('account')) },
    { key: 'p-settings', title: 'Settings', sub: 'Sound, country, glass', icon: <Settings className="size-5" strokeWidth={1.6} />, run: () => (onClose(), onView('settings')) },
  ]
  const term = q.trim().toLowerCase()
  const rows: Row[] = found
    ? found.map((m) => ({ key: `m-${m.id}`, title: m.t, sub: [m.y, m.r ? `★ ${m.r.toFixed(1)}` : ''].filter(Boolean).join('  ·  '), poster: m.p, run: () => void play(m) }))
    : [...pages.filter((p) => !term || p.title.toLowerCase().includes(term)), ...trend.map((m) => ({ key: `t-${m.id}`, title: m.t, sub: ['Trending', m.y].filter(Boolean).join('  ·  '), poster: m.p, run: () => void play(m) }))]

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') (e.preventDefault(), onClose())
      else if (e.key === 'ArrowDown') (e.preventDefault(), setSel((s) => Math.min(rows.length - 1, s + 1)))
      else if (e.key === 'ArrowUp') (e.preventDefault(), setSel((s) => Math.max(0, s - 1)))
      else if (e.key === 'Enter') (e.preventDefault(), rows[sel]?.run())
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  })

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex justify-center pt-[16vh]">
          <motion.button type="button" aria-label="Close search" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="absolute inset-0 cursor-default rounded-none bg-black/45 backdrop-blur-[10px]" />
          <motion.div role="dialog" aria-modal="true" aria-label="Search" initial={{ opacity: 0, scale: 0.9, y: -20, filter: 'blur(12px)' }} animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, scale: 0.96, y: -10, filter: 'blur(6px)', transition: { duration: 0.18 } }} transition={{ type: 'spring', stiffness: 380, damping: 30 }} className="relative h-fit w-[min(720px,90vw)]">
            <GlassSurface radius={36} className="w-full">
              <div className="relative z-10">
                <div className="flex h-[72px] items-center gap-4 border-b border-white/10 px-7">
                  <Search className="size-5 shrink-0 text-paper/50" aria-hidden="true" />
                  <input data-bare ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search for a movie" aria-label="Search for a movie" className="h-full flex-1 bg-transparent text-[20px] text-paper outline-none placeholder:text-paper/35" />
                  <kbd className="rounded-md bg-white/10 px-2 py-1 text-[12px] text-paper/55">esc</kbd>
                </div>
                <div className="max-h-[52vh] overflow-y-auto p-3" onPointerLeave={() => undefined}>
                  {rows.length === 0 && <p className="px-5 py-10 text-center text-paper/50">{found ? 'No movie matches that.' : 'Type to search.'}</p>}
                  {rows.map((r, i) => (
                    <button key={r.key} type="button" onPointerMove={() => setSel(i)} onClick={r.run} disabled={busy} className="relative flex w-full items-center gap-4 rounded-[22px] px-4 py-3 text-left outline-none">
                      {sel === i && <motion.span layoutId="spot-lens" transition={{ type: 'spring', stiffness: 520, damping: 36 }} aria-hidden="true" className="absolute inset-0 rounded-[22px] bg-white/[0.1] shadow-[inset_0_1px_0_rgb(255_255_255/0.22),inset_0_0_0_1px_rgb(255_255_255/0.08)]" />}
                      {r.poster ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={poster(r.poster, 185)} alt="" className="relative h-[60px] w-10 shrink-0 rounded-lg object-cover ring-1 ring-white/10" draggable={false} />
                      ) : (
                        <span className="relative grid size-10 shrink-0 place-items-center rounded-full bg-white/10 text-paper/80">{r.icon}</span>
                      )}
                      <span className="relative min-w-0 flex-1">
                        <span className="block truncate text-[17px]">{r.title}</span>
                        <span className="block truncate text-[13px] text-paper/50">{r.sub}</span>
                      </span>
                      <CornerDownLeft className={cn('relative size-4 text-paper/50 transition-opacity', sel === i ? 'opacity-100' : 'opacity-0')} aria-hidden="true" />
                    </button>
                  ))}
                </div>
              </div>
            </GlassSurface>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
