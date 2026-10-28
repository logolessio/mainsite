'use client'

import { ArrowUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

/** The round button in the bottom right corner that comes up once the page has moved a screen down. */
export function ToTop() {
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const on = () => setShown(window.scrollY > window.innerHeight * 0.8)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  // fixed by a wrapper: on touch screens the site makes every button position: relative (for its bigger tap target)
  return (
    <div className={cn('fixed bottom-6 right-6 z-40 transition-all duration-300', shown ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0')}>
      <button
        type="button"
        aria-label="Back to the top"
        tabIndex={shown ? 0 : -1}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="grid size-11 place-items-center rounded-full border border-white/12 bg-[#0b0b0c]/90 text-white/75 backdrop-blur transition-colors hover:text-white"
      >
        <ArrowUp className="size-4" />
      </button>
    </div>
  )
}
