'use client'

import { Moon, Sun } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useEffect, useSyncExternalStore } from 'react'
import { applyTheme, getLight, keepsDark, setLight, subscribeTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'
import { useFeature } from './features-provider'

/** Keeps the page in step with the saved choice, including after moving to another page. Renders nothing. */
export function ThemeApply() {
  const on = useFeature('light-mode')
  const pathname = usePathname()
  const light = useSyncExternalStore(subscribeTheme, getLight, () => false)
  useEffect(() => {
    applyTheme(on && light && !keepsDark(pathname))
  }, [on, light, pathname])
  return null
}

/** Swaps black and white. `hero` sits under the big logo on the home page, `footer` is the small one at the bottom. */
export function ThemeToggle({ variant = 'footer' }: { variant?: 'hero' | 'footer' }) {
  const on = useFeature('light-mode')
  const light = useSyncExternalStore(subscribeTheme, getLight, () => false)
  if (!on) return null
  const Icon = light ? Moon : Sun
  return (
    <button
      type="button"
      onClick={() => setLight(!light)}
      aria-label={light ? 'Switch to dark mode' : 'Switch to light mode'}
      className={cn(
        'inline-flex items-center gap-2 transition-all',
        variant === 'hero' ? 'glass-liquid h-11 rounded-full px-5 text-sm hover:brightness-125' : 'h-10 rounded-full border border-line-strong px-4 text-sm text-paper/60 hover:text-paper',
      )}
    >
      <Icon className="size-4" aria-hidden="true" />
      {light ? 'Dark mode' : 'Light mode'}
    </button>
  )
}
