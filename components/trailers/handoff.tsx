'use client'

import { Loader2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { signInWithProvider } from '@/lib/auth'
import { Mark } from './ui'

/** The page between scroll and Google or Discord: it starts the sign-in at once and sends the person back to scroll afterwards. */
export function ScrollSignIn({ provider }: { provider: 'google' | 'discord' }) {
  const [error, setError] = useState('')
  const started = useRef(false)
  const label = provider === 'google' ? 'Google' : 'Discord'

  useEffect(() => {
    if (started.current) return
    started.current = true
    signInWithProvider(provider, undefined, 'https://scroll.logoless.io/').catch((e) => setError(e instanceof Error ? e.message : 'Something went wrong.'))
  }, [provider])

  return (
    <div className="fixed inset-0 grid place-items-center bg-black px-8 text-center text-paper">
      <Mark />
      {error ? (
        <div className="max-w-sm">
          <p className="font-display text-3xl">That did not work.</p>
          <p className="mt-3 text-paper/60">{error}</p>
          <a href="https://scroll.logoless.io/" className="mt-6 inline-block text-paper underline underline-offset-4">Back to scroll</a>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-5">
          <Loader2 className="size-7 animate-spin text-paper/70" aria-hidden="true" />
          <p className="text-[17px] text-paper/65">Taking you to {label}…</p>
        </div>
      )}
    </div>
  )
}
