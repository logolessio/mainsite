'use client'

import { useReducedMotion } from 'framer-motion'
import { usePathname, useRouter } from 'next/navigation'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { Campaign } from '@/lib/campaigns'

type Phase = 'idle' | 'exiting'

type TransitionContextValue = {
  phase: Phase
  navigate: (href: string) => void
  expand: (campaign: Campaign) => void
}

const TransitionContext = createContext<TransitionContextValue | null>(null)

const EXIT_MS = 170

export function TransitionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const reduced = useReducedMotion()
  const [phase, setPhase] = useState<Phase>('idle')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setPhase('idle')
  }, [pathname])

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
      if (reduced) {
        router.push(href)
        return
      }
      setPhase('exiting')
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => router.push(href), EXIT_MS)
    },
    [pathname, reduced, router],
  )

  const expand = useCallback(
    (campaign: Campaign) => {
      router.prefetch(`/campaign/${campaign.id}`)
      navigate(`/campaign/${campaign.id}`)
    },
    [navigate, router],
  )

  const value = useMemo(() => ({ phase, navigate, expand }), [phase, navigate, expand])

  return <TransitionContext.Provider value={value}>{children}</TransitionContext.Provider>
}

export function useTransitions() {
  const ctx = useContext(TransitionContext)
  if (!ctx) throw new Error('useTransitions must be used inside TransitionProvider')
  return ctx
}
