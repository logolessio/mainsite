'use client'

import '@/components/editor/editor.css'
import { MotionConfig, useMotionValue } from 'framer-motion'
import { Suspense } from 'react'
import { ShaderRunner } from '@/components/bio/gl'
import { useMotionPrefs } from '@/hooks/use-motion-prefs'
import { cn } from '@/lib/utils'
import { AuthCard } from './auth-card'

/**
 * Signing in, creating a page and resetting a password on the link-in-bio product: the home page's liquid behind a small panel, in black and white. The
 * panel is the same form as everywhere else (Google, Discord, a passkey, email and password) in a frame of its own.
 */
export function BioAuth({ mode, claim }: { mode: 'login' | 'signup' | 'forgot'; claim?: string }) {
  const { reduced } = useMotionPrefs()
  const px = useMotionValue(0)
  const py = useMotionValue(0)
  const level = useMotionValue(0)
  return (
    <MotionConfig reducedMotion="user">
        <div className={cn('ed relative isolate min-h-dvh overflow-x-clip')} style={{ ['--color-signal' as string]: '#d6d6d6' }}>
          <div aria-hidden="true" className="fixed inset-0 -z-10">
            <ShaderRunner id="liquid" tone={1} intensity={60} speed={34} px={px} py={py} level={level} reduced={reduced} />
            <div className="absolute inset-0 bg-black/55" />
            <div className="speed absolute top-1/2 left-1/2 aspect-square w-[130vmax] -translate-x-1/2 -translate-y-1/2 opacity-40" />
          </div>
          <header className="fixed inset-x-0 top-0 z-20 flex h-16 items-center justify-end px-5 md:px-10">
            <a href="/" className="cap text-white/60 transition-colors hover:text-white">
              back
            </a>
          </header>
          <main className="grid min-h-dvh place-items-center px-5 pt-24 pb-16">
            <div className="relative w-full max-w-[420px] border border-white/25 bg-black/70 p-7 [filter:grayscale(1)] backdrop-blur-xl sm:p-9">
              <Suspense>
                <AuthCard mode={mode} claim={claim} />
              </Suspense>
            </div>
          </main>
        </div>
    </MotionConfig>
  )
}
