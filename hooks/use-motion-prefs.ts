'use client'

import { useReducedMotion } from 'framer-motion'
import { useCallback, useSyncExternalStore } from 'react'

function useMedia(query: string, serverValue: boolean) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const media = window.matchMedia(query)
      media.addEventListener('change', onChange)
      return () => media.removeEventListener('change', onChange)
    },
    [query],
  )
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => serverValue,
  )
}

export function useMotionPrefs() {
  const reduced = Boolean(useReducedMotion())
  const wide = useMedia('(min-width: 768px)', true)
  const canHover = useMedia('(hover: hover) and (pointer: fine)', true)
  return { reduced, wide, canHover, rich: wide && !reduced }
}

const noopSubscribe = () => () => {}
export function useMounted() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  )
}
