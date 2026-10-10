'use client'

import { useReducedMotion } from 'framer-motion'
import { usePathname, useRouter } from 'next/navigation'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { Campaign } from '@/lib/campaigns'

type Phase = 'idle' | 'exiting'

type TransitionContextValue = {
  phase: Phase
  navigate: (href: string) => void
  expand: (campaign: Campaign) => void
  /** Navigates while the cover art of campaign `id` glides from where it is to where it lands. */
  morph: (href: string, id: string) => void
}

const TransitionContext = createContext<TransitionContextValue | null>(null)

const EXIT_MS = 170

export function TransitionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const reduced = useReducedMotion()
  const [phase, setPhase] = useState<Phase>('idle')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setPhase('idle')
  }, [pathname])

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])

  const navigate = useCallback(
    (href: string) => {
      const [path, hash] = href.split('#')
      const target = path || pathname
      if (target === pathname && !href.includes('?')) {
        if (hash) document.getElementById(hash)?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' })
        else window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })
        return
      }
      if (reduced) {
        router.push(href)
        return
      }
      setPhase('exiting')
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => router.push(href), EXIT_MS)
    },
    [pathname, reduced, router],
  )

  // Shared-element transition: the browser keeps the cover art as one object and animates it between the two pages,
  // while everything else cross-fades. Browsers without the View Transitions API (and reduced motion) get the plain fade.
  const morph = useCallback(
    (href: string, id: string) => {
      const doc = document as Document & { startViewTransition?: (cb: () => Promise<void>) => { finished: Promise<unknown>; ready?: Promise<unknown>; updateCallbackDone?: Promise<unknown> } }
      const sel = `[data-vt-cover="${CSS.escape(id)}"]`
      const old = document.querySelector<HTMLElement>(sel)
      if (reduced || !doc.startViewTransition || !old) {
        navigate(href)
        return
      }
      const target = href.split(/[?#]/)[0]
      document.documentElement.dataset.vt = '1'
      old.style.setProperty('view-transition-name', 'cover')
      const run = doc.startViewTransition(async () => {
        router.push(href)
        await new Promise<void>((resolve) => {
          const t0 = performance.now()
          const poll = () => {
            const el = document.querySelector<HTMLElement>(sel)
            if (window.location.pathname === target && el && el !== old) {
              old.style.removeProperty('view-transition-name')
              el.style.setProperty('view-transition-name', 'cover')
              return resolve()
            }
            if (performance.now() - t0 > 3000) return resolve()
            window.setTimeout(poll, 40) // a timer, not rAF, so a tab in the background cannot stall the transition
          }
          poll()
        })
      })
      run.ready?.catch(() => {})
      run.updateCallbackDone?.catch(() => {})
      run.finished.catch(() => {}).finally(() => {
        delete document.documentElement.dataset.vt
        document.querySelectorAll<HTMLElement>(sel).forEach((e) => e.style.removeProperty('view-transition-name'))
      })
    },
    [navigate, reduced, router],
  )

  const expand = useCallback(
    (campaign: Campaign) => {
      router.prefetch(`/campaign/${campaign.id}`)
      morph(`/campaign/${campaign.id}`, campaign.id)
    },
    [morph, router],
  )

  const value = useMemo(() => ({ phase, navigate, expand, morph }), [phase, navigate, expand, morph])

  return <TransitionContext.Provider value={value}>{children}</TransitionContext.Provider>
}

export function useTransitions() {
  const ctx = useContext(TransitionContext)
  if (!ctx) throw new Error('useTransitions must be used inside TransitionProvider')
  return ctx
}
