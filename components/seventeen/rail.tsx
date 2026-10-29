'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * A row that scrolls sideways, snapping to its items, with round arrows at its ends on screens with a mouse (a finger just swipes). The
 * arrows go when there is nothing more that way. The row runs to the edge of the screen and starts in line with the page.
 */
export function Rail({ children, label, className }: { children: React.ReactNode; label: string; className?: string }) {
  const row = useRef<HTMLDivElement>(null)
  const [ends, setEnds] = useState({ start: true, end: false })
  useEffect(() => {
    const el = row.current
    if (!el) return
    const on = () => setEnds({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth > el.scrollWidth - 8 })
    on()
    el.addEventListener('scroll', on, { passive: true })
    window.addEventListener('resize', on)
    return () => {
      el.removeEventListener('scroll', on)
      window.removeEventListener('resize', on)
    }
  }, [])
  const move = (dir: 1 | -1) => row.current?.scrollBy({ left: dir * row.current.clientWidth * 0.8, behavior: 'smooth' })

  return (
    <div className="group/rail relative">
      <div ref={row} role="region" aria-label={label} className={cn('s17-rail flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-4 sm:scroll-px-6 sm:px-6 lg:scroll-px-10 lg:px-10', className)}>
        {children}
      </div>
      {/* placed by wrappers: on touch screens the main stylesheet makes every button position: relative */}
      <div className={cn('absolute left-3 top-[38%] hidden -translate-y-1/2 transition-opacity duration-300 [@media(pointer:fine)]:block lg:left-6', ends.start ? 'pointer-events-none opacity-0' : 'opacity-0 group-hover/rail:opacity-100')}>
        <button type="button" aria-label="Back" onClick={() => move(-1)} className="grid size-11 place-items-center rounded-full bg-black/70 text-white ring-1 ring-white/15 backdrop-blur-md transition-transform hover:scale-105">
          <ChevronLeft className="size-5" />
        </button>
      </div>
      <div className={cn('absolute right-3 top-[38%] hidden -translate-y-1/2 transition-opacity duration-300 [@media(pointer:fine)]:block lg:right-6', ends.end ? 'pointer-events-none opacity-0' : 'opacity-0 group-hover/rail:opacity-100')}>
        <button type="button" aria-label="More" onClick={() => move(1)} className="grid size-11 place-items-center rounded-full bg-black/70 text-white ring-1 ring-white/15 backdrop-blur-md transition-transform hover:scale-105">
          <ChevronRight className="size-5" />
        </button>
      </div>
    </div>
  )
}
