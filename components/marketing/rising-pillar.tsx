'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { Pillar } from './pillar'

/**
 * A pillar that rises from the floor of whatever it stands in the first time it scrolls into view (the closing box). The cell clips it, so it comes up out of the
 * bottom edge; `delay` (seconds) lets the second one follow the first. With reduced motion, or calm mode, it is simply there (see .pillar-rise in globals.css).
 */
export function RisingPillar({ className, delay = 0 }: { className?: string; delay?: number }) {
  const cell = useRef<HTMLSpanElement>(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = cell.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setSeen(true)
          io.disconnect()
        }
      },
      { threshold: 0.2 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <span ref={cell} className="block h-full overflow-hidden" style={{ '--rise-delay': `${delay}s` } as React.CSSProperties}>
      <Pillar className={cn('pillar-rise', seen && 'pillar-rise-in', className)} />
    </span>
  )
}
