'use client'

import { ArrowRight, Loader2, Mail } from 'lucide-react'
import { useState } from 'react'
import { BrandIcon } from '@/components/brand-icon'
import { type Provider, signInWithProvider } from '@/lib/auth'
import type { PageCopy } from '@/lib/launch-page'
import { cn } from '@/lib/utils'
import s from './launch-home.module.css'

/** Once the site is open: the same ways in as the sign-in page (Google, Discord, email), or the dashboard for someone already signed in. */
export function GetStarted({ copy, signedIn }: { copy: PageCopy; signedIn: boolean }) {
  const [busy, setBusy] = useState<Provider | null>(null)
  const [error, setError] = useState('')

  const go = async (p: Provider) => {
    setBusy(p)
    setError('')
    try {
      await signInWithProvider(p, undefined, '/dashboard')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.')
      setBusy(null)
    }
  }

  const row = 'flex h-[52px] w-full items-center justify-center gap-2.5 rounded-pill text-[15px] font-medium transition-[transform,background-color,border-color] duration-300 active:scale-[0.98] disabled:opacity-60'
  return (
    <div className={cn(s.glass, 'w-full rounded-card p-5 text-left md:p-7')}>
      <p className="font-display text-[clamp(1.6rem,3.4vw,2.1rem)] leading-none">{copy.startTitle}</p>
      <p className="mt-2.5 text-[14.5px] leading-relaxed text-paper/55">{copy.startText}</p>
      {signedIn ? (
        <a href="/dashboard" className={cn(row, 'mt-6 bg-[var(--acc)] text-[var(--on-acc)] hover:brightness-110')}>
          Open your dashboard
          <ArrowRight className="size-4" aria-hidden="true" />
        </a>
      ) : (
        <>
          <div className="mt-6 grid gap-2.5">
            <button type="button" onClick={() => go('google')} disabled={busy !== null} className={cn(row, 'bg-paper text-ink hover:bg-white')}>
              {busy === 'google' ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <BrandIcon name="google" className="size-[18px]" />}
              Continue with Google
            </button>
            <button type="button" onClick={() => go('discord')} disabled={busy !== null} className={cn(row, 'border border-white/14 text-paper hover:border-white/30 hover:bg-white/[0.05]')}>
              {busy === 'discord' ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <BrandIcon name="discord" className="size-[18px]" />}
              Continue with Discord
            </button>
            <a href="/signup" className={cn(row, 'border border-white/14 text-paper hover:border-white/30 hover:bg-white/[0.05]')}>
              <Mail className="size-[18px]" aria-hidden="true" />
              {copy.signupLabel}
            </a>
          </div>
          {error && (
            <p role="alert" className="mt-3 text-center text-[13px] text-red-300">
              {error}
            </p>
          )}
          <p className="mt-5 text-center text-[14px] text-paper/50">
            Have an account?{' '}
            <a href="/login" className="text-paper underline decoration-paper/30 underline-offset-4 transition-colors hover:decoration-paper">
              {copy.loginLabel}
            </a>
          </p>
        </>
      )}
    </div>
  )
}
