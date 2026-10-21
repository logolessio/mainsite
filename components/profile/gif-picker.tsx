'use client'

import { Loader2, Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

export type GifPick = { id: string; w: number; h: number; title: string }
type Result = GifPick & { preview: string }
type Answer = { enabled: boolean; results: Result[]; next?: number | null; error?: string }

const SUGGEST = ['aesthetic', 'anime', 'gaming', 'space', 'neon', 'retro', 'nature', 'cats']

/**
 * The GIF library (GIPHY), asked through our own server so the key stays secret. Shows trending GIFs until you type.
 * When the library is not switched on yet (no key), it says so instead of showing an empty box.
 */
export function GifPicker({ onPick, selected, className }: { onPick: (g: GifPick) => void; selected?: string; className?: string }) {
  const [q, setQ] = useState('')
  const [items, setItems] = useState<Result[]>([])
  const [next, setNext] = useState<number | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'off' | 'error'>('loading')
  const [more, setMore] = useState(false)
  const [error, setError] = useState('')
  const seq = useRef(0)

  const load = async (query: string, offset: number) => {
    const my = ++seq.current
    if (offset === 0) setState('loading')
    else setMore(true)
    try {
      const r = await fetch(`/api/giphy?q=${encodeURIComponent(query)}&offset=${offset}`, { cache: 'no-store' })
      const j = (await r.json().catch(() => ({ enabled: true, results: [], error: 'Could not load GIFs.' }))) as Answer & { error?: string }
      if (my !== seq.current) return
      if (!j.enabled) return setState('off')
      if (!r.ok || j.error) {
        setError(j.error ?? 'Could not load GIFs.')
        if (offset === 0) setState('error')
        return
      }
      setItems((cur) => (offset === 0 ? j.results : [...cur, ...j.results.filter((x) => !cur.some((c) => c.id === x.id))]))
      setNext(j.next ?? null)
      setState('ready')
    } finally {
      if (my === seq.current) setMore(false)
    }
  }

  useEffect(() => {
    const t = setTimeout(() => void load(q.trim(), 0), q ? 350 : 0)
    return () => clearTimeout(t)
  }, [q])

  if (state === 'off')
    return (
      <div className={cn('rounded-2xl border border-dashed border-line-strong p-5 text-center', className)}>
        <p className="text-sm">The GIF library is not switched on yet.</p>
        <p className="mt-1 text-xs text-mute">It needs a GIPHY key. Until then you can upload your own picture.</p>
      </div>
    )

  // two columns that keep each GIF's own shape
  const cols: Result[][] = [[], []]
  const heights = [0, 0]
  for (const it of items) {
    const c = heights[0] <= heights[1] ? 0 : 1
    cols[c].push(it)
    heights[c] += it.h / Math.max(1, it.w)
  }

  return (
    <div className={className}>
      <label className="relative block">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-mute" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search GIFs"
          aria-label="Search GIFs"
          maxLength={50}
          className="h-11 w-full rounded-pill border border-line-strong bg-ink pr-4 pl-10 text-sm outline-none placeholder:text-mute focus:border-paper/60"
        />
      </label>
      {!q && (
        <div className="no-scrollbar mt-2.5 flex gap-1.5 overflow-x-auto">
          {SUGGEST.map((s) => (
            <button key={s} type="button" onClick={() => setQ(s)} className="h-7 shrink-0 rounded-pill border border-line px-3 text-xs text-mute hover:text-paper">
              {s}
            </button>
          ))}
        </div>
      )}
      <div className="mt-3 max-h-[360px] overflow-y-auto overscroll-contain rounded-panel">
        {state === 'loading' ? (
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-panel bg-white/[0.05]" />
            ))}
          </div>
        ) : state === 'error' ? (
          <p className="py-8 text-center text-sm text-mute">{error}</p>
        ) : items.length === 0 ? (
          <p className="py-8 text-center text-sm text-mute">No GIFs found. Try another word.</p>
        ) : (
          <div className="grid grid-cols-2 items-start gap-2">
            {cols.map((col, ci) => (
              <div key={ci} className="grid gap-2">
                {col.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => onPick({ id: g.id, w: g.w, h: g.h, title: g.title })}
                    aria-pressed={selected === g.id}
                    aria-label={g.title || 'GIF'}
                    className={cn('relative block overflow-hidden rounded-panel bg-white/[0.04] ring-offset-2 ring-offset-[#0b0b0d] transition-transform hover:scale-[1.02]', selected === g.id && 'ring-2 ring-paper')}
                    style={{ aspectRatio: `${g.w} / ${g.h}` }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={g.preview} alt="" loading="lazy" referrerPolicy="no-referrer" className="size-full object-cover" />
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
        {next !== null && state === 'ready' && (
          <button type="button" disabled={more} onClick={() => void load(q.trim(), next)} className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-pill border border-line text-xs text-mute hover:text-paper">
            {more && <Loader2 className="size-3.5 animate-spin" />} Load more
          </button>
        )}
      </div>
      <p className="mt-2 text-right text-[10px] tracking-wide text-mute uppercase">Powered by GIPHY</p>
    </div>
  )
}
