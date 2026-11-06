'use client'

import '@/components/editor/editor.css'
import { MotionConfig } from 'framer-motion'
import { Suspense } from 'react'
import { cn } from '@/lib/utils'
import { AuthCard } from './auth-card'

/**
 * Signing in, creating a page and resetting a password on the link-in-bio product: a still dark background behind a small panel, in black and white. The
 * panel is the same form as everywhere else (Google, Discord, a passkey, email and password) in a frame of its own.
 */
export function BioAuth({ mode, claim }: { mode: 'login' | 'signup' | 'forgot'; claim?: string }) {
  return (
    <MotionConfig reducedMotion="user">
        <div className={cn('ed relative isolate min-h-dvh overflow-x-clip')} style={{ ['--color-signal' as string]: '#d6d6d6' }}>
          <div aria-hidden="true" className="fixed inset-0 -z-10 bg-[radial-gradient(120%_90%_at_50%_18%,#17171a,#050505_72%)]" />
          <header className="fixed inset-x-0 top-0 z-20 flex h-16 items-center justify-end px-5 md:px-10">
            <a href="/" className="inline-flex h-10 items-center rounded-full px-5 text-[0.8rem] text-white/60 transition-colors hover:bg-white/[0.07] hover:text-white">
              Back
            </a>
          </header>
          <main className="grid min-h-dvh place-items-center px-5 pt-24 pb-16">
            <div className="relative w-full max-w-[420px] rounded-[28px] border border-white/12 bg-black/70 p-7 shadow-[var(--ed-lift)] [filter:grayscale(1)] backdrop-blur-xl sm:p-9">
              <Suspense>
                <AuthCard mode={mode} claim={claim} />
              </Suspense>
            </div>
          </main>
        </div>
    </MotionConfig>
  )
}
