'use client'

import { useEffect, useState } from 'react'
import type { NavCounts } from '@/lib/nav-counts'

/** The little numbers in the sidebar. They are fetched again whenever you move to another page, so they are never stale. */
export function useNavCounts(area: string, pathname: string, enabled: boolean): NavCounts {
  const [counts, setCounts] = useState<NavCounts>({})
  useEffect(() => {
    if (!enabled) return
    const which = area === 'Creator' ? 'creator' : area === 'Brand' ? 'brand' : 'owner'
    const ctl = new AbortController()
    fetch(`/api/nav-counts?area=${which}`, { signal: ctl.signal, cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { counts?: NavCounts } | null) => j?.counts && setCounts(j.counts))
      .catch(() => {})
    return () => ctl.abort()
  }, [area, pathname, enabled])
  return counts
}
