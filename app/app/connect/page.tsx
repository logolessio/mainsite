import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { connection } from 'next/server'
import { ConnectApp } from '@/components/auth/connect-app'
import { APP_REDIRECT } from '@/lib/app-auth'
import { getSession } from '@/lib/session'

export const metadata: Metadata = { title: 'Connect the Mac app | logoless', robots: { index: false } }

/** Where the Mac app sends its sign-in sheet. Sign in as usual, then confirm to hand the app a one-use code. */
export default async function Page({ searchParams }: { searchParams: Promise<{ state?: string; challenge?: string; redirect?: string }> }) {
  await connection()
  const { state = '', challenge = '', redirect: to = '' } = await searchParams
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(state) || !/^[A-Za-z0-9_-]{43}$/.test(challenge) || (to && !APP_REDIRECT.test(to))) {
    return (
      <main className="grid min-h-dvh place-items-center px-5 pt-28 pb-16">
        <p className="max-w-sm text-center text-paper/70">This page opens from the logoless app. Open the app and choose Sign in.</p>
      </main>
    )
  }
  const session = await getSession()
  const back = `/app/connect?state=${state}&challenge=${challenge}${to ? `&redirect=${encodeURIComponent(to)}` : ''}`
  if (!session?.user?.email) redirect(`/login?next=${encodeURIComponent(back)}`)
  return (
    <main className="grid min-h-dvh place-items-center px-5 pt-28 pb-16">
      <ConnectApp email={session.user.email} state={state} challenge={challenge} redirect={to || undefined} back={back} />
    </main>
  )
}
