import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { StatsBoard } from '@/components/stats/stats-board'
import { featureOn } from '@/lib/features'
import { CONTAINER } from '@/lib/layout'
import { isRange, statsBoard } from '@/lib/stats-board'

export const metadata: Metadata = { title: 'Stats | logoless', description: 'Live totals and leaderboards: top creators, most viewed clips, biggest campaigns and artists on logoless.' }

export default async function Page({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  await connection()
  if (!(await featureOn('stats-page'))) notFound()
  const { range } = await searchParams
  const board = await statsBoard(isRange(range) ? range : 'month')
  return (
    <main className={`${CONTAINER} pt-32 pb-40 md:pt-40`}>
      <StatsBoard initial={board} />
    </main>
  )
}
