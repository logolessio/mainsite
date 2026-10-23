'use client'

import { Loader2 } from 'lucide-react'
import { signIn } from 'next-auth/react'
import { useEffect, useRef, useState } from 'react'
import { BrandIcon } from '@/components/brand-icon'
import { IntroLogo } from '@/components/logo-intro'
import { GradientField } from '@/components/shell/gradient-field'
import { signInWithProvider } from '@/lib/auth'
import { RingButton } from './ring'

/**
 * The hop between beta.logoless.io and Discord or Google. The quick human check runs here, then the sign-in starts on its own (so it is one press on the
 * sign-up page and no more). If anything stops it, the button is still here to try again. Adding Google to an existing account skips the check: the
 * person is already signed in and was checked then.
 */
export function JoinHop({ then, provider }: { then: string; provider: 'discord' | 'google' }) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(true)
  const started = useRef(false)

  const go = async () => {
    setBusy(true)
    setError('')
    try {
      if (provider === 'google') await signIn('google', { callbackUrl: then })
      else await signInWithProvider('discord', undefined, then)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'We could not start the sign-in. Please try again.')
      setBusy(false)
    }
  }

  useEffect(() => {
    if (started.current) return
    started.current = true
    void go()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const name = provider === 'google' ? 'Google' : 'Discord'
  return (
    <main className="relative isolate grid min-h-dvh place-items-center overflow-x-clip px-4 py-10">
      <GradientField />
      <div className="relative z-10 flex w-full max-w-[380px] flex-col items-center gap-8 text-center">
        <IntroLogo className="h-[clamp(34px,8vw,48px)]" />
        <p className="font-display text-[clamp(1.6rem,6vw,2.1rem)] leading-tight text-paper">{busy ? `Opening ${name}…` : `Continue with ${name}`}</p>
        <div className="w-full" aria-live="polite">
          <RingButton onClick={() => void go()} busy={busy}>
            {busy ? <Loader2 aria-hidden="true" className="size-5 animate-spin" /> : <BrandIcon name={provider} className="size-5" />}
            {busy ? 'One moment' : `Continue with ${name}`}
          </RingButton>
          {error && (
            <p role="alert" className="mt-4 text-[13px] leading-snug text-red-300">
              {error}
            </p>
          )}
        </div>
      </div>
    </main>
  )
}
