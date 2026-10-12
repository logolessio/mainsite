import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { StatusBoard } from '@/components/marketing/status-board'
import { featureOn } from '@/lib/features'
import { runHealth } from '@/lib/health'
import { CONTAINER } from '@/lib/layout'

export const metadata: Metadata = { title: 'Status | logoless', description: 'Whether logoless is running right now.' }

export default async function Page() {
  await connection()
  if (!(await featureOn('status-page'))) notFound()
  const h = await runHealth()
  return (
    <main className={`${CONTAINER} pt-32 pb-40 md:pt-44`}>
      <StatusBoard initial={h} />
    </main>
  )
}
