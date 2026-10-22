'use client'

import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
import { LiquidGlass } from '@/components/ui/liquid-glass'
import { useFeature } from './features-provider'

const KEY = 'logoless:theme'
const SIZE = 'size-11'

/**
 * The sun and moon button beside Search (switch "light-theme"). It sets data-theme="light" on the page, which globals.css turns into the light
 * look, and remembers the choice on this device; the small script in the page head puts it back before anything is drawn, so there is no flash.
 * It shows where it will take you: a sun while the site is dark, a moon while it is light.
 */
export function ThemeToggle() {
  const on = useFeature('light-theme')
  const [light, setLight] = useState(false)
  useEffect(() => setLight(document.documentElement.dataset.theme === 'light'), [])
  if (!on) return null

  const flip = () => {
    const next = !light
    setLight(next)
    const html = document.documentElement
    if (next) html.dataset.theme = 'light'
    else delete html.dataset.theme
    try {
      localStorage.setItem(KEY, next ? 'light' : 'dark')
    } catch {
      /* the choice just is not remembered */
    }
  }

  return (
    <LiquidGlass
      as="button"
      type="button"
      onClick={flip}
      aria-label={light ? 'Switch to dark mode' : 'Switch to light mode'}
      aria-pressed={light}
      title={light ? 'Dark mode' : 'Light mode'}
      rootClassName="pointer-events-auto"
      className={`${SIZE} grid place-items-center text-mute transition-colors hover:text-paper`}
      look={{ zRadius: 12 }}
    >
      {light ? <Moon aria-hidden="true" className="size-[18px]" /> : <Sun aria-hidden="true" className="size-[18px]" />}
    </LiquidGlass>
  )
}
