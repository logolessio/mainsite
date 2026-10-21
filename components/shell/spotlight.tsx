'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { isInvitePath } from '@/lib/invite-shared'
import { CommandPalette } from './command-palette'

// The dashboards have their own copy of the box (with their pages in it), so this one stays out of them.
const HIDDEN = ['/dashboard', '/brand', '/admin', '/owner', '/dev', '/onboarding', '/@', '/u/', '/links', '/launch']

/** Anything on the page can open the search box by sending this event (the search button in the top bar does). */
export const OPEN_SEARCH_EVENT = 'logoless:search'
export const openSearch = () => window.dispatchEvent(new Event(OPEN_SEARCH_EVENT))

/** ⌘K (or /) opens the box that finds a campaign, a page, an answer or something to do. ? lists the shortcuts. */
export function Spotlight() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const active = !HIDDEN.some((p) => pathname.startsWith(p)) && !isInvitePath(pathname)

  useEffect(() => {
    if (!active) return
    const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      } else if (e.key === '/' && !typing(e.target) && !e.metaKey && !e.ctrlKey && !document.querySelector('[aria-modal="true"]')) {
        e.preventDefault()
        setOpen(true)
      }
    }
    const onOpen = () => setOpen(true)
    window.addEventListener('keydown', onKey)
    window.addEventListener(OPEN_SEARCH_EVENT, onOpen)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener(OPEN_SEARCH_EVENT, onOpen)
    }
  }, [active])

  useEffect(() => setOpen(false), [pathname])

  if (!active) return null
  return <CommandPalette open={open} onClose={() => setOpen(false)} />
}
