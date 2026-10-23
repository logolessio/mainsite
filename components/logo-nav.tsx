'use client'

import { useEffect, useState } from 'react'
import { IntroLogo } from './logo-intro'

/** Set once the logo has played in this tab, so it does not run again each time the menu bar comes back after a page without it. */
let played = false

/** The logo in the top bar: it plays its animation when the site first loads, and again when the pointer rests on it. */
export function NavLogo({ className }: { className?: string }) {
  const [initial] = useState<'playing' | 'done'>(() => (played ? 'done' : 'playing'))
  useEffect(() => {
    played = true
  }, [])
  return <IntroLogo replay initial={initial} className={className} />
}
