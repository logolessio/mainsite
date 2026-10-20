'use client'

import { Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { openSearch } from './spotlight'

const round = 'grid size-11 shrink-0 place-items-center rounded-pill bg-[#1a1a1d] text-paper/75 transition-colors hover:bg-[#242428] hover:text-paper'

/** "?" opens the list of shortcuts for the page you are on (see components/shell/keyboard.tsx). */
export function HelpButton({ className }: { className?: string }) {
  return (
    <button type="button" onClick={() => window.dispatchEvent(new Event('logoless:help'))} aria-label="Keyboard shortcuts and help" aria-keyshortcuts="?" title="Shortcuts and help (?)" className={cn(round, 'font-mono text-[15px]', className)}>
      ?
    </button>
  )
}

/**
 * The search button and the "?" button in the top bar, so the ⌘K box and the shortcuts can be found without knowing the keys. On a wide
 * screen the search button says what it is and shows its key; on a phone it is just the magnifier.
 */
export function SearchHelpButtons() {
  const [mod, setMod] = useState('⌘')
  useEffect(() => setMod(/mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent) ? '⌘' : 'Ctrl'), [])
  return (
    <>
      <button type="button" onClick={openSearch} aria-label="Search, or do something" aria-keyshortcuts="Meta+K /" className={cn(round, 'lg:w-auto lg:grid-flow-col lg:gap-2.5 lg:pr-2 lg:pl-4')}>
        <Search aria-hidden="true" className="size-[18px]" />
        <span className="hidden text-sm lg:inline">Search</span>
        <kbd className="hidden rounded-pill bg-white/[0.08] px-2 py-1 font-mono text-[11px] text-paper/60 lg:inline">{mod} K</kbd>
      </button>
      <HelpButton className="hidden sm:grid" />
    </>
  )
}
