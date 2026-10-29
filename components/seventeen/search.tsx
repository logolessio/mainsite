'use client'

import { CornerDownLeft, Search, Star } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { SearchItem } from '@/lib/seventeen/packs'
import { cn } from '@/lib/utils'

/** Anything on the page can open the search: window.dispatchEvent(new Event(OPEN_SEARCH)). The hero's search bar does. */
export const OPEN_SEARCH = 's17:search'

/**
 * The search over every pack, as a palette in the middle of the screen: ⌘K or / opens it, the arrows move, Enter opens the pack. It looks at
 * the title, the year, the kind, the director and the cast. With nothing typed it shows the best rated; with no match it offers a request.
 */
export function SearchPalette({ items }: { items: SearchItem[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [at, setAt] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const list = useRef<HTMLUListElement>(null)

  useEffect(() => {
    const show = () => setOpen(true)
    const key = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && (e.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName))
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    window.addEventListener(OPEN_SEARCH, show)
    window.addEventListener('keydown', key)
    return () => {
      window.removeEventListener(OPEN_SEARCH, show)
      window.removeEventListener('keydown', key)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    setQ('')
    setAt(0)
    const t = setTimeout(() => input.current?.focus(), 10)
    const html = document.documentElement
    const was = html.style.overflow
    html.style.overflow = 'hidden'
    return () => {
      clearTimeout(t)
      html.style.overflow = was
    }
  }, [open])

  const hits = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean)
    if (!words.length) return [...items].sort((a, b) => Number(b.imdbRating ?? 0) - Number(a.imdbRating ?? 0)).slice(0, 7)
    return items
      .map((it) => {
        const title = it.title.toLowerCase()
        const hay = `${title} ${it.year} ${it.kind} ${it.people}`.toLowerCase()
        if (!words.every((w) => hay.includes(w))) return null
        return { it, score: title.startsWith(q.toLowerCase().trim()) ? 0 : words.every((w) => title.includes(w)) ? 1 : 2 }
      })
      .filter((x) => x !== null)
      .sort((a, b) => a.score - b.score)
      .slice(0, 8)
      .map((x) => x.it)
  }, [items, q])

  useEffect(() => {
    list.current?.querySelector(`[data-i="${at}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [at])

  if (!open) return null
  const go = (slug: string) => {
    setOpen(false)
    router.push(`/p/${slug}`)
  }
  const want = q.trim()

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center bg-black/70 px-4 pt-[12vh] backdrop-blur-md" onPointerDown={(e) => e.target === e.currentTarget && setOpen(false)}>
      <div role="dialog" aria-modal aria-label="Search packs" className="s17-in w-full max-w-[620px] overflow-hidden rounded-[22px] bg-[#0b0b0d]/95 shadow-[0_40px_120px_-20px_rgb(0_0_0/0.9),0_0_0_1px_rgb(255_255_255/0.1),inset_0_1px_0_rgb(255_255_255/0.08)]">
        <div className="flex items-center gap-3 border-b border-white/8 px-5">
          <Search className="size-[18px] shrink-0 text-white/45" />
          <input
            ref={input}
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setAt(0)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setOpen(false)
              else if (e.key === 'ArrowDown') {
                e.preventDefault()
                setAt((a) => Math.min(a + 1, hits.length - 1))
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setAt((a) => Math.max(a - 1, 0))
              } else if (e.key === 'Enter') {
                e.preventDefault()
                if (hits[at]) go(hits[at].slug)
                else if (want) {
                  setOpen(false)
                  router.push(`/request?q=${encodeURIComponent(want)}`)
                }
              }
            }}
            placeholder="Films, series, anime, actors…"
            aria-label="Search packs"
            autoComplete="off"
            spellCheck={false}
            className="h-16 min-w-0 flex-1 bg-transparent text-[17px] text-white outline-none placeholder:text-white/30"
          />
          <kbd className="s17-mono rounded-md border border-white/12 px-1.5 py-0.5 text-[10px] text-white/45">ESC</kbd>
        </div>
        <p className="s17-mono px-5 pb-1 pt-3.5 text-[10px] uppercase text-white/35">{want ? `${hits.length} ${hits.length === 1 ? 'pack' : 'packs'}` : 'Top rated'}</p>
        <ul ref={list} className="max-h-[min(440px,55vh)] overflow-y-auto px-2 pb-2">
          {hits.map((it, i) => (
            <li key={it.slug} data-i={i}>
              <Link
                href={`/p/${it.slug}`}
                onClick={() => setOpen(false)}
                onMouseMove={() => setAt(i)}
                className={cn('flex items-center gap-3.5 rounded-xl px-3 py-2.5 transition-colors', at === i ? 'bg-white/[0.07]' : '')}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {it.thumb ? <img src={it.thumb} alt="" className="h-[54px] w-9 shrink-0 rounded-md object-cover ring-1 ring-white/10" /> : <span className="h-[54px] w-9 shrink-0 rounded-md bg-white/5" />}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14.5px] font-semibold text-white">{it.title}</span>
                  <span className="s17-mono mt-0.5 block truncate text-[10.5px] uppercase text-white/40">
                    {it.year} · {it.kind} · {it.people.split(', ').slice(0, 2).join(', ')}
                  </span>
                </span>
                {it.imdbRating && (
                  <span className="s17-mono inline-flex shrink-0 items-center gap-1 text-[11px] text-white/70">
                    <Star className="size-3 fill-[#ffc857] text-[#ffc857]" />
                    {it.imdbRating}
                  </span>
                )}
                <CornerDownLeft className={cn('size-3.5 shrink-0 text-white/40', at === i ? 'opacity-100' : 'opacity-0')} />
              </Link>
            </li>
          ))}
        </ul>
        {want && hits.length === 0 && (
          <div className="px-5 pb-8 pt-4 text-center">
            <p className="text-[14px] text-white/70">No pack for &ldquo;{want}&rdquo; yet.</p>
            <Link href={`/request?q=${encodeURIComponent(want)}`} onClick={() => setOpen(false)} className="mt-4 inline-flex h-10 items-center rounded-full bg-white px-5 text-[13px] font-semibold text-black">
              Request it
            </Link>
          </div>
        )}
        <div className="s17-mono flex items-center gap-4 border-t border-white/8 px-5 py-3 text-[10px] uppercase text-white/35">
          <span>↑↓ to move</span>
          <span>↵ to open</span>
          <span className="ml-auto">{items.length} packs</span>
        </div>
      </div>
    </div>
  )
}
