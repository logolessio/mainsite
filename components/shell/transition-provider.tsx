'use client'

import { useReducedMotion } from 'framer-motion'
import { usePathname, useRouter } from 'next/navigation'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { appArea } from '@/lib/app-areas'
import { confirmLeave } from '@/hooks/use-unsaved-guard'
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
  // the page we are leaving, or null. Derived against the current path, so the new page never inherits the fade.
  const [leaving, setLeaving] = useState<string | null>(null)
  const phase: Phase = leaving === pathname ? 'exiting' : 'idle'
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => setLeaving(null), [pathname])

  // a navigation that keeps the same path (only the query changes) must not leave the page faded
  useEffect(() => {
    if (leaving === null) return
    const t = setTimeout(() => setLeaving(null), 1500)
    return () => clearTimeout(t)
  }, [leaving])

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
      if (!confirmLeave()) return // there is work in the page that has not been saved
      if (reduced) {
        router.push(href)
        return
      }

      // Where the browser can do it, the page changes with a view transition: the old page stays up while the new one is on its way,
      // then the two cross-fade on the graphics card. There is no wait before the click is answered and no empty moment in between.
      const doc = document as Document & { startViewTransition?: (cb: () => Promise<void>) => { finished: Promise<unknown>; ready?: Promise<unknown>; updateCallbackDone?: Promise<unknown> } }
      const html = document.documentElement
      if (doc.startViewTransition && target !== pathname && html.dataset.vt !== '1' && html.dataset.vtPage !== '1' && !html.classList.contains('calm')) {
        html.dataset.vtPage = '1'
        let arrived = false
        const run = doc.startViewTransition(async () => {
          router.push(href)
          await new Promise<void>((resolve) => {
            const t0 = performance.now()
            const poll = () => {
              if (window.location.pathname === target) {
                arrived = true
                return resolve()
              }
              // a slow answer must not freeze the page: after a moment, carry on with the plain fade and the progress line
              if (performance.now() - t0 > 1400) return resolve()
              window.setTimeout(poll, 24) // a timer, not rAF, so a tab in the background cannot stall it
            }
            poll()
          })
          if (!arrived) setLeaving(pathname)
        })
        run.ready?.catch(() => {})
        run.updateCallbackDone?.catch(() => {})
        const clear = () => delete html.dataset.vtPage
        run.finished.catch(() => {}).finally(clear)
        window.setTimeout(clear, 2600) // never leave the flag set if the browser lost track of the transition
        return
      }

      setLeaving(pathname)
      if (timer.current) clearTimeout(timer.current)
      // inside a working area the page only dims while the next one loads: no wait before going
      if (appArea(pathname) && appArea(pathname) === appArea(target)) {
        router.push(href)
        return
      }
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
