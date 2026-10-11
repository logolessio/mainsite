'use client'

import { Wind } from 'lucide-react'
import { useEffect, useSyncExternalStore } from 'react'
import { getCalm, setCalm, subscribeCalm } from '@/lib/calm'
import { cn } from '@/lib/utils'
import { useFeature } from './features-provider'

/** Applies the saved choice to the page. Renders nothing. */
export function CalmApply() {
  const on = useFeature('calm-mode')
  useEffect(() => {
    document.documentElement.classList.toggle('calm', on && getCalm())
  }, [on])
  return null
}

/** A small switch for the footer. */
export function CalmToggle() {
  const feature = useFeature('calm-mode')
  const calm = useSyncExternalStore(subscribeCalm, getCalm, () => false)
  if (!feature) return null
  return (
    <button type="button" role="switch" aria-checked={calm} onClick={() => setCalm(!calm)} className={cn('inline-flex h-10 items-center gap-2.5 rounded-full border px-4 text-sm transition-colors', calm ? 'border-paper bg-paper text-ink' : 'border-line-strong text-mute hover:text-paper')}>
      <Wind className="size-4" aria-hidden="true" />
      Calm mode: {calm ? 'on' : 'off'}
    </button>
  )
}
