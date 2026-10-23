'use client'

import { signOut } from 'next-auth/react'
import { Suspense } from 'react'
import { AuthCard } from '@/components/auth/auth-card'
import { Logo } from '@/components/logo'

/** The dev site is for admins only. Everyone else sees this and nothing behind it. */
export function DevGate({ email }: { email: string | null }) {
  return (
    <div className="fixed inset-0 z-[200] overflow-y-auto bg-ink">
      <div className="mx-auto flex min-h-full max-w-md flex-col items-center px-5 py-12 text-center">
        <Logo play className="h-7" />
        <p className="mt-6 inline-flex rounded-pill border border-line-strong px-3.5 py-1.5 font-mono text-[11px] tracking-[0.2em] text-mute uppercase">Test site · admins only</p>
        <h1 className="mt-5 font-display text-4xl tracking-tight">This is where we try things first.</h1>
        <p className="mt-3 text-mute">Sign in with an admin account to see what is coming. The public site is at logoless.io.</p>
        {email ? (
          <div className="mt-8 w-full rounded-3xl border border-line bg-white/[0.03] p-6">
            <p className="text-sm">
              Signed in as <span className="text-paper">{email}</span>, which is not an admin account.
            </p>
            <button type="button" onClick={() => signOut({ callbackUrl: '/' })} className="mt-4 inline-flex h-11 items-center rounded-pill bg-paper px-6 text-sm font-medium text-ink hover:bg-paper/85">
              Sign out
            </button>
            <a href="https://logoless.io" className="mt-3 block text-sm text-mute underline underline-offset-4 hover:text-paper">
              Go to logoless.io
            </a>
          </div>
        ) : (
          <div className="mt-6 w-full text-left">
            <Suspense>
              <AuthCard mode="login" />
            </Suspense>
          </div>
        )}
      </div>
    </div>
  )
}
