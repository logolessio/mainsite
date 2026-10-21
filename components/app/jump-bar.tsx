'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * A row of links to the parts of a long page. It stays under the top bar, and the part you are reading is lit.
 * A press lights its link at once and keeps it lit while the page scrolls there (the reading position would otherwise light each
 * part on the way, or never light a short part at the very end of the page).
 */
export function JumpBar({ items }: { items: { id: string; label: string }[] }) {
  const [on, setOn] = useState(items[0]?.id ?? '')
  const [stuck, setStuck] = useState(false)
  const lockUntil = useRef(0)
  const rest = useRef<HTMLSpanElement>(null)

  // the bar has no backdrop while it sits in its place; once the page has scrolled under it, it gets a soft one that fades out below
  useEffect(() => {
    const el = rest.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([e]) => setStuck(!e.isIntersecting), { rootMargin: '-73px 0px 0px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])

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

  return (
    <>
      <span ref={rest} aria-hidden="true" className="block h-px" />
      <nav
        aria-label="On this page"
        className={cn(
          'no-scrollbar sticky top-[72px] z-20 -mx-5 mb-6 flex gap-1.5 overflow-x-auto px-5 py-3 transition-[background-color,backdrop-filter] duration-300 md:-mx-10 md:px-10',
          stuck && 'bg-ink/75 backdrop-blur-md [mask-image:linear-gradient(to_bottom,#000_80%,transparent)]',
        )}
      >
        {items.map((i) => (
          <a
            key={i.id}
            href={`#${i.id}`}
            aria-current={on === i.id ? 'true' : undefined}
            onClick={() => {
              setOn(i.id)
              lockUntil.current = Date.now() + 1100
            }}
            className={cn('h-9 shrink-0 rounded-pill border px-4 text-sm leading-9 transition-colors duration-300', on === i.id ? 'border-line-strong bg-white/[0.08] text-paper' : 'border-transparent text-paper/50 hover:text-paper')}
          >
            {i.label}
          </a>
        ))}
      </nav>
    </>
  )
}
