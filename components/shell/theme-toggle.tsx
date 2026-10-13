'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useSyncExternalStore } from 'react'
import { applyTheme, getLight, keepsDark, setLight, subscribeTheme } from '@/lib/theme'

/** Keeps the page in step with the saved choice, including after moving to another page. Renders nothing. */
export function ThemeApply() {
  const pathname = usePathname()
  const light = useSyncExternalStore(subscribeTheme, getLight, () => true)
  useEffect(() => {
    applyTheme(light && !keepsDark(pathname))
  }, [light, pathname])
  return null
}

export function useTheme() {
  const light = useSyncExternalStore(subscribeTheme, getLight, () => true)
  return { light, set: (v: 'light' | 'dark') => setLight(v === 'light') }
}
