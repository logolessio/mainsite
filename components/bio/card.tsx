'use client'

import { Crown, Eye, Hash, Sparkles } from 'lucide-react'
import { type CSSProperties, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { useBio } from './context'

/** The small marks beside a name (the account number, OG, founding member), together in one dark pill like guns.lol's. */
export function Badges({ className, center = true }: { className?: string; center?: boolean }) {
  const { data, cfg } = useBio()
  const list = cfg.meta.badges ? data.badges ?? [] : []
  if (!list.length) return null
  const icon = (id: string) => (id === 'uid' ? <Hash className="size-3.5" strokeWidth={2} /> : id === 'og' ? <Crown className="size-3.5" strokeWidth={1.8} /> : <Sparkles className="size-3.5" strokeWidth={1.8} />)
  return (
    <div data-in style={{ '--i': 2 } as CSSProperties} className={cn('flex', center ? 'justify-center' : 'justify-start', className)}>
      <ul className="inline-flex h-7 items-center gap-2.5 rounded-full border border-[var(--bio-line)] bg-[rgb(0_0_0/0.28)] px-3 text-[0.72rem] font-medium text-[var(--bio-fg)]">
        {list.map((b) => (
          <li key={b.id} title={b.hint} className="inline-flex items-center gap-1">
            {icon(b.id)}
            {b.label}
          </li>
        ))}
      </ul>
    </div>
  )
}

/** The bio, typed out a letter at a time once the page is entered. */
export function Typewriter({ text, className }: { text: string; className?: string }) {
  const { entered, reduced } = useBio()
  const [n, setN] = useState(reduced ? text.length : 0)
  useEffect(() => {
    if (reduced) return setN(text.length)
    if (!entered) return setN(0)
    let i = 0
    setN(0)
    const id = window.setInterval(() => {
      i++
      setN(i)
      if (i >= text.length) window.clearInterval(id)
    }, 28)
    return () => window.clearInterval(id)
  }, [text, entered, reduced])
  return (
    <p className={className} aria-label={text}>
      <span aria-hidden="true">{text.slice(0, n)}</span>
      {n < text.length && <span aria-hidden="true" style={{ animation: 'bio-blink 0.9s steps(1) infinite' }}>▍</span>}
    </p>
  )
}

export function ViewCount({ className }: { className?: string }) {
  const { data } = useBio()
  if (data.views === null) return null
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <Eye className="size-3.5" strokeWidth={1.6} />
      {data.views.toLocaleString('en-US')}
    </span>
  )
}
