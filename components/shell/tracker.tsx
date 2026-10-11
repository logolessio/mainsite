'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

const send = (payload: Record<string, unknown>) => {
  try {
    const body = JSON.stringify(payload)
    if (!navigator.sendBeacon?.('/api/track', new Blob([body], { type: 'application/json' }))) {
      void fetch('/api/track', { method: 'POST', headers: { 'content-type': 'application/json' }, body, keepalive: true })
    }
  } catch {
    /* tracking must never get in the way */
  }
}

/** Tells the activity log which pages were opened and which browser errors happened. */
export function Tracker() {
  const pathname = usePathname()
  useEffect(() => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
    send({ path: pathname, w: window.innerWidth, lang: navigator.language, tz: Intl.DateTimeFormat().resolvedOptions().timeZone, ms: nav ? nav.loadEventEnd || nav.domContentLoadedEventEnd : undefined })
  }, [pathname])

  useEffect(() => {
    const onError = (e: ErrorEvent) => send({ t: 'error', path: location.pathname, msg: `${e.message} (${e.filename?.split('/').pop() ?? ''}:${e.lineno})` })
    const onRejection = (e: PromiseRejectionEvent) => send({ t: 'error', path: location.pathname, msg: `Unhandled: ${String((e.reason as Error)?.message ?? e.reason)}` })
    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [])
  return null
}
