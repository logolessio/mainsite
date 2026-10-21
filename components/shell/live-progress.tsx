'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useFeature } from './features-provider'

/** The pages that show campaign progress (budget left, views, earnings). Pages with forms in them are left alone. */
const LIVE = /^\/(campaign\/[^/]+|brand|brand\/(overview|campaigns|submissions)|dashboard|dashboard\/(overview|earnings|submissions)|leaderboard|stats|submissions)?\/?$/

const EVERY_MS = 30_000

/**
 * Every 30 seconds, asks the server for the page again, so the numbers on it (what is left of a campaign's budget, views, earnings) are the
 * latest the scan has found. The page keeps everything the person has done on it: nothing reloads, scrolls or closes. It waits while the tab is
 * hidden, while someone is typing, and while a window is open.
 */
export function LiveProgress() {
  const on = useFeature('live-progress')
  const path = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (!on || !LIVE.test(path)) return
    const busy = () => {
      const a = document.activeElement
      const typing = a instanceof HTMLElement && (a.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))
      return typing || Boolean(document.querySelector('[aria-modal="true"]'))
    }
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible' && !busy()) router.refresh()
    }, EVERY_MS)
    return () => window.clearInterval(id)
  }, [on, path, router])

  return null
}
