import type { Metadata } from 'next'
import { Suspense } from 'react'
import { AuthCard } from '@/components/auth/auth-card'

export const metadata: Metadata = {
  title: 'Forgot password — logoless',
  description: 'Access your logoless account with Discord, Google or email.',
}

export default function Page() {
  return (
    <main className="grid min-h-dvh place-items-center px-5 pt-28 pb-16">
      <Suspense>
        <AuthCard mode="forgot" />
      </Suspense>
    </main>
  )
}
