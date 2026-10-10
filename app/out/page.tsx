import type { Metadata } from 'next'
import { connection } from 'next/server'
import { ExternalNotice } from '@/components/profile/external-notice'
import { verifyExternal } from '@/lib/profile'

export const metadata: Metadata = { title: 'Leaving logoless', robots: { index: false, follow: false }, referrer: 'no-referrer' }

export default async function OutPage({ searchParams }: { searchParams: Promise<{ u?: string; s?: string }> }) {
  await connection()
  const { u = '', s = '' } = await searchParams
  const ok = u && s && (await verifyExternal(u, s))
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center px-5 py-32 text-center">
      <ExternalNotice url={ok ? u : null} />
    </main>
  )
}
