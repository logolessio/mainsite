'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { BlobLens, type Rect } from '@/components/glass/blob-lens'
import { cn } from '@/lib/utils'

/**
 * A row of links to the parts of a long page. It stays under the top bar, and the part you are reading is held by a lens of glass.
 * A press lights its link at once and keeps it lit while the page scrolls there (the reading position would otherwise light each
 * part on the way, or never light a short part at the very end of the page).
 */
export function JumpBar({ items }: { items: { id: string; label: string }[] }) {
  const [on, setOn] = useState(items[0]?.id ?? '')
  const lockUntil = useRef(0)
  const nodes = useRef(new Map<string, HTMLAnchorElement>())
  const row = useRef<HTMLDivElement>(null)
  const [rect, setRect] = useState<Rect | null>(null)
  const [from, setFrom] = useState<Rect | null>(null)
  const [still, setStill] = useState(false)

  useEffect(() => {
    const els = items.map((i) => document.getElementById(i.id)).filter((e): e is HTMLElement => Boolean(e))
    if (els.length === 0) return
    const seen = new Map<string, number>()
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) seen.set(e.target.id, e.isIntersecting ? e.boundingClientRect.top : Infinity)
        if (Date.now() < lockUntil.current) return
        const first = [...seen.entries()].filter(([, top]) => top !== Infinity).sort((a, b) => a[1] - b[1])[0]
        if (first) setOn(first[0])
      },
      { rootMargin: '-120px 0px -55% 0px' },
    )
    els.forEach((e) => io.observe(e))
    // at the very bottom the last part is the one being read, even if it is too short to reach the reading line
    const onScroll = () => {
      if (Date.now() < lockUntil.current) return
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 6) setOn(items[items.length - 1].id)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      io.disconnect()
      window.removeEventListener('scroll', onScroll)
    }
  }, [items])

  const measure = useCallback((): Rect | null => {
    const el = nodes.current.get(on)
    return el ? { left: el.offsetLeft, top: el.offsetTop, width: el.offsetWidth, height: el.offsetHeight } : null
  }, [on])
  useLayoutEffect(() => {
    const m = measure()
    if (!m) return
    setFrom((f) => f ?? m)
    setRect(m)
  }, [measure, items])
  useLayoutEffect(() => {
    const el = row.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => {
      const m = measure()
      if (!m) return
      setStill(true)
      setRect(m)
      window.setTimeout(() => setStill(false), 60)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [measure])

  return (
    <nav aria-label="On this page" className="no-scrollbar sticky top-[72px] z-20 -mx-5 mb-6 overflow-x-auto bg-ink/90 px-5 py-3 md:-mx-10 md:px-10">
      <div ref={row} className="relative flex w-max gap-1.5">
        {rect && from && <BlobLens rect={rect} from={from} instant={still} soft />}
        {items.map((i) => (
          <a
            key={i.id}
            ref={(el) => {
              if (el) nodes.current.set(i.id, el)
              else nodes.current.delete(i.id)
            }}
            href={`#${i.id}`}
            aria-current={on === i.id ? 'true' : undefined}
            onClick={() => {
              setOn(i.id)
              lockUntil.current = Date.now() + 1100
            }}
            className={cn('relative h-9 shrink-0 rounded-pill px-4 text-sm leading-9 transition-colors duration-300', on === i.id ? 'text-paper' : 'text-paper/55 hover:text-paper')}
          >
            {on === i.id && !rect && <span aria-hidden="true" className="absolute inset-0 rounded-pill bg-white/[0.14] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.2)]" />}
            <span className="relative">{i.label}</span>
          </a>
        ))}
      </div>
    </nav>
  )
}
