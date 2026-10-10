'use client'

import { usePathname } from 'next/navigation'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

type PreviewContextValue = {
  playingId: string | null
  toggle: (id: string, url: string) => void
  stop: () => void
  /** Current position, 0..1, read on demand so components can animate it without re-rendering the tree. */
  progress: () => number
  seek: (fraction: number) => void
  duration: () => number
}

const PreviewContext = createContext<PreviewContextValue | null>(null)

/** One audio element for the whole site, so only one preview plays at a time. */
export function PreviewProvider({ children }: { children: React.ReactNode }) {
  const audio = useRef<HTMLAudioElement | null>(null)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const pathname = usePathname()

  useEffect(() => {
    const el = new Audio()
    el.preload = 'none'
    el.volume = 0.8
    el.addEventListener('ended', () => setPlayingId(null))
    audio.current = el
    return () => {
      el.pause()
      el.src = ''
    }
  }, [])

  // leaving a page ends its preview
  useEffect(() => {
    audio.current?.pause()
    setPlayingId(null)
  }, [pathname])

  const toggle = useCallback((id: string, url: string) => {
    const el = audio.current
    if (!el) return
    if (playingId === id) {
      el.pause()
      setPlayingId(null)
      return
    }
    el.src = url
    el.currentTime = 0
    el.play().then(() => setPlayingId(id)).catch(() => setPlayingId(null))
  }, [playingId])

  const stop = useCallback(() => {
    audio.current?.pause()
    setPlayingId(null)
  }, [])

  const value = useMemo<PreviewContextValue>(
    () => ({
      playingId,
      toggle,
      stop,
      progress: () => {
        const el = audio.current
        return el && el.duration ? el.currentTime / el.duration : 0
      },
      seek: (f) => {
        const el = audio.current
        if (el && el.duration) el.currentTime = f * el.duration
      },
      duration: () => audio.current?.duration || 0,
    }),
    [playingId, toggle, stop],
  )

  return <PreviewContext.Provider value={value}>{children}</PreviewContext.Provider>
}

export function usePreview() {
  const ctx = useContext(PreviewContext)
  if (!ctx) throw new Error('usePreview must be used inside PreviewProvider')
  return ctx
}
