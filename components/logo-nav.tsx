'use client'

import { useEffect, useRef, useState } from 'react'
import { Logo } from './logo'

/** Set once the logo has played in this tab, so it does not run again each time the menu bar comes back after a page without it. */
let played = false

/**
 * The logo in the top bar: it plays its animation when the site first loads, and again when the pointer rests on it (at most once while it is
 * still running).
 */
export function NavLogo({ className }: { className?: string }) {
  const [play, setPlay] = useState(() => !played)
  const [run, setRun] = useState(0)
  const startedAt = useRef(0)

  useEffect(() => {
    played = true
    startedAt.current = Date.now()
  }, [])

  const replay = () => {
    if (Date.now() - startedAt.current < 2500) return
    startedAt.current = Date.now()
    setPlay(true)
    setRun((r) => r + 1)
  }

  return (
    <span key={run} onMouseEnter={replay} className="block">
      <Logo play={play} className={className} />
    </span>
  )
}
