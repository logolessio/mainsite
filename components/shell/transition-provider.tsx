'use client'

import { useReducedMotion } from 'framer-motion'
import { usePathname, useRouter } from 'next/navigation'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { confirmLeave } from '@/hooks/use-unsaved-guard'
import type { Campaign } from '@/lib/campaigns'

type Phase = 'idle' | 'exiting'

type TransitionContextValue = {
  phase: Phase
  /** A page has been asked for and has not arrived yet. */
  pending: boolean
  navigate: (href: string) => void
  expand: (campaign: Campaign) => void
  /** Kept for older callers: it is an ordinary navigation now (there is no shared-element morph any more). */
  morph: (href: string, id: string) => void
  /** True once the person has moved to another page since the site opened (the first page never animates in: it is simply there). */
  hasNavigated: () => boolean
}

const TransitionContext = createContext<TransitionContextValue | null>(null)

/**
 * Changing page is one calm move: the page you are on blurs and fades away upwards while the next is on its way, and the next one
 * rises into place out of a blur (see .page-leave and .page-enter in globals.css). Nothing else moves, there is no cross-fade of two
 * pages on top of each other and no shared element gliding between them, so there is never a moment where the old words change into the new.
 */
export function TransitionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const reduced = useReducedMotion()
  // the page we are leaving, or null. Derived against the current path, so the new page never inherits the exit.
  const [leaving, setLeaving] = useState<string | null>(null)
  const phase: Phase = leaving === pathname ? 'exiting' : 'idle'
  const [pending, setPending] = useState(false)

  // has any page change happened yet? Set while rendering, so the page that has just arrived already knows it must animate in.
  const last = useRef(pathname)
  const moved = useRef(false)
  if (last.current !== pathname) {
    moved.current = true
    last.current = pathname
  }

  useEffect(() => {
    setLeaving(null)
    setPending(false)
  }, [pathname])
  // never leave the progress line running or the page hidden if a page never came (a query-only change, or a failed request)
  useEffect(() => {
    if (!pending) return
    const t = setTimeout(() => setPending(false), 9000)
    return () => clearTimeout(t)
  }, [pending])
  useEffect(() => {
    if (leaving === null) return
    const t = setTimeout(() => setLeaving(null), 1800)
    return () => clearTimeout(t)
  }, [leaving])

  const navigate = useCallback(
    (href: string) => {
      const [path, hash] = href.split('#')
      const target = path || pathname
      if (target === pathname && !href.includes('?')) {
        if (hash) document.getElementById(hash)?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' })
        else window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })
        return
      }
      if (!confirmLeave()) return // there is work in the page that has not been saved
      if (target !== pathname) {
        setPending(true)
        if (!reduced) setLeaving(pathname)
      }
      router.push(href)
    },
    [pathname, reduced, router],
  )

  const morph = useCallback((href: string) => navigate(href), [navigate])
  const expand = useCallback(
    (campaign: Campaign) => {
      router.prefetch(`/campaign/${campaign.id}`)
      navigate(`/campaign/${campaign.id}`)
    },
    [navigate, router],
  )
  const hasNavigated = useCallback(() => moved.current, [])

  const value = useMemo(() => ({ phase, pending, navigate, expand, morph, hasNavigated }), [phase, pending, navigate, expand, morph, hasNavigated])

  return <TransitionContext.Provider value={value}>{children}</TransitionContext.Provider>
}

export function useTransitions() {
  const ctx = useContext(TransitionContext)
  if (!ctx) throw new Error('useTransitions must be used inside TransitionProvider')
  return ctx
}
