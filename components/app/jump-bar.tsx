'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

/** A row of links to the parts of a long page. It stays under the top bar, and the part you are reading is lit. */
export function JumpBar({ items }: { items: { id: string; label: string }[] }) {
  const [on, setOn] = useState(items[0]?.id ?? '')

  useEffect(() => {
    const els = items.map((i) => document.getElementById(i.id)).filter((e): e is HTMLElement => Boolean(e))
    if (els.length === 0) return
    const seen = new Map<string, number>()
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) seen.set(e.target.id, e.isIntersecting ? e.boundingClientRect.top : Infinity)
        const first = [...seen.entries()].filter(([, top]) => top !== Infinity).sort((a, b) => a[1] - b[1])[0]
        if (first) setOn(first[0])
      },
      { rootMargin: '-120px 0px -55% 0px' },
    )
    els.forEach((e) => io.observe(e))
    return () => io.disconnect()
  }, [items])

  return (
    <nav aria-label="On this page" className="no-scrollbar sticky top-[72px] z-20 -mx-5 mb-6 flex gap-1.5 overflow-x-auto bg-ink/90 px-5 py-3 md:-mx-10 md:px-10">
      {items.map((i) => (
        <a key={i.id} href={`#${i.id}`} aria-current={on === i.id ? 'true' : undefined} className={cn('h-9 shrink-0 rounded-pill border px-4 text-sm leading-9 transition-colors duration-300', on === i.id ? 'border-line-strong bg-white/[0.08] text-paper' : 'border-transparent text-paper/50 hover:text-paper')}>
          {i.label}
        </a>
      ))}
    </nav>
  )
}
