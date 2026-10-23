'use client'

import { Search } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { usePillPointer } from '@/components/app/pill-pointer'
import { Key } from '@/components/app/search-pill'
import { LiquidGlass } from '@/components/ui/liquid-glass'
import { isInvitePath } from '@/lib/invite-shared'
import { cn } from '@/lib/utils'
import { useFeature } from './features-provider'
import { useSignedIn } from './nav-user'
import { openSearch } from './spotlight'
import { ThemeToggle } from './theme-toggle'

/** Pages that are one small flow of their own and have no search box to open. */
const HIDDEN = ['/onboarding', '/@', '/u/', '/links', '/launch']
/** The dashboards have a bar of tabs along the bottom of a phone: the buttons sit above it. */
const DASH = /^\/(dashboard|brand|admin|owner|dev)(\/|$)/

/** The information pages that keep a full width Get started button at the bottom of a phone for visitors without an account (see sticky-cta.tsx). */
const STICKY = ['/for-creators', '/for-brands', '/about', '/pricing', '/faq', '/case-studies']

const SIZE = 'size-11'

/**
 * The search button and the "?" button, floating in the bottom right corner of every page as two pieces of liquid glass, and staying there
 * wherever you scroll. Search opens the box that finds a page or does something (⌘K, or /), "?" lists the shortcuts. On a wide screen the search
 * button says what it is and shows its key; on a phone it is just the magnifier. `raised` lifts them over the dev site's push button.
 */
export function FloatingSearch({ raised = false }: { raised?: boolean }) {
  const on = useFeature('command-actions')
  const path = usePathname()
  const signedIn = useSignedIn()
  const [mod, setMod] = useState('⌘')
  const pill = usePillPointer()
  useEffect(() => setMod(/mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent) ? '⌘' : 'Ctrl'), [])

  if (!on || HIDDEN.some((p) => path.startsWith(p)) || isInvitePath(path)) return null
  const dash = DASH.test(path)
  // phone: above the tab bar of a dashboard; the dev push button sits at 8.75rem on a phone, so lift over that. Computer: bottom corner, above the push button.
  const bottom = raised
    ? 'bottom-[12.25rem] md:bottom-[5.25rem]'
    : dash
      ? 'bottom-[calc(5.75rem+env(safe-area-inset-bottom))] md:bottom-5'
      : !signedIn && STICKY.includes(path)
        ? 'bottom-[calc(5rem+env(safe-area-inset-bottom))] md:bottom-5'
        : 'bottom-[calc(1rem+env(safe-area-inset-bottom))] md:bottom-5'

  return (
    <div data-floating-search className={cn('pointer-events-none fixed right-3 z-[60] flex items-center gap-2 md:right-5', bottom)}>
      {/* the same animated bar as the one in the dashboard's top bar (.sp-* in globals.css): the arc of colour round the edge, the light that follows the pointer, the leaning chip, the keys */}
      <div ref={pill.wrap} className="sp pointer-events-auto relative" {...pill.bind}>
        <span aria-hidden="true" className="sp-under pointer-events-none absolute inset-x-4 -bottom-3 h-6 rounded-full blur-xl" />
        <div className="sp-edge relative rounded-pill p-px">
          <span aria-hidden="true" className="sp-ring" />
          <button
            type="button"
            onClick={openSearch}
            data-search-pill
            aria-label="Search, or do something"
            aria-keyshortcuts="Meta+K /"
            title={`Search (${mod} K)`}
            className="sp-body relative flex h-[42px] items-center gap-2.5 overflow-hidden rounded-pill py-0 pr-2.5 pl-[5px] text-sm text-paper/65 outline-none max-lg:w-[42px] max-lg:justify-center max-lg:pr-[5px]"
          >
            <span aria-hidden="true" className="sp-spot pointer-events-none absolute inset-0" />
            <span aria-hidden="true" data-sheen className="sp-sheen pointer-events-none absolute inset-y-0 -left-1/3 w-1/3" />
            <span ref={pill.chip} className="sp-chip relative grid size-8 shrink-0 place-items-center rounded-full">
              <Search aria-hidden="true" className="sp-lens size-[15px]" />
            </span>
            <span className="relative hidden lg:inline">Search</span>
            <span aria-hidden="true" className="sp-keys relative hidden shrink-0 items-center gap-1 lg:flex">
              <Key>{mod}</Key>
              <Key>K</Key>
            </span>
          </button>
        </div>
      </div>
      <ThemeToggle />
      <LiquidGlass
        as="button"
        type="button"
        onClick={() => window.dispatchEvent(new Event('logoless:help'))}
        aria-label="Keyboard shortcuts and help"
        aria-keyshortcuts="?"
        title="Shortcuts and help (?)"
        rootClassName="pointer-events-auto"
        className={cn(SIZE, 'grid place-items-center text-mute transition-colors hover:text-paper')}
        look={{ zRadius: 12 }}
      >
        {/* drawn, not typed: a typed question mark sits off centre in a monospace font */}
        <svg aria-hidden="true" viewBox="0 -0.5 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9.09 9a3 3 0 0 1 5.82 1c0 2-3 3-3 3" />
          <path d="M12 17h.01" />
        </svg>
      </LiquidGlass>
    </div>
  )
}
