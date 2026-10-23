'use client'

import { MotionConfig } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Logo } from '@/components/logo'
import { GradientField } from '@/components/shell/gradient-field'
import { TransitionProvider } from '@/components/shell/transition-provider'
import { LEGAL_LINKS } from '@/lib/site'

/**
 * The legal pages on beta.logoless.io (the pre-launch sign-up). That address has no site around it, so these pages get a small frame of their own: the
 * logo and a way back to the sign-up on top, the moving gradient behind, and every legal document linked at the bottom. The pages themselves are the same
 * ones logoless.io serves (app/legal).
 */
export function BetaLegalFrame({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <TransitionProvider>
        <GradientField />
        <div className="relative isolate min-h-dvh">
          <header className="fixed inset-x-0 top-0 z-30 flex h-16 items-center justify-between border-b border-white/10 bg-black/50 px-5 backdrop-blur-xl md:px-10">
            <Link href="/onboarding" aria-label="logoless, back to the sign-up">
              <Logo className="h-6" />
            </Link>
            <Link href="/onboarding" className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[14px] text-paper/60 transition-colors hover:text-paper">
              <ArrowLeft aria-hidden="true" className="size-4" /> Back to sign-up
            </Link>
          </header>
          {children}
          <footer className="relative z-10 mx-auto w-full max-w-[1400px] border-t border-white/10 px-5 py-10 md:px-10">
            <p className="mb-4 text-[13px] text-paper/40">All legal documents</p>
            <ul className="flex flex-wrap gap-x-6 gap-y-2.5 text-[14px] text-paper/60">
              {LEGAL_LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="transition-colors hover:text-paper">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </footer>
        </div>
      </TransitionProvider>
    </MotionConfig>
  )
}
