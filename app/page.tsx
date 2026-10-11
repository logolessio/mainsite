import type { Metadata } from 'next'
import { DashboardView } from '@/components/browse/dashboard-view'
import { connection } from 'next/server'
import { LiveNumbers } from '@/components/marketing/live-numbers'
import { liveCampaigns } from '@/lib/campaigns-db'
import { featureOn, featureState } from '@/lib/features'
import { publicStats, worthShowing } from '@/lib/public-stats'
import { CONTAINER } from '@/lib/layout'

export const metadata: Metadata = {
  title: 'logoless — views have value',
  description: 'Browse live clip campaigns and get paid for every thousand views.',
}

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ tour?: string }>
}) {
  await connection()
  const { tour } = await searchParams
  const campaigns = await liveCampaigns()
  const stats = (await featureOn('live-numbers')) ? await publicStats() : null
  const dev = (await featureState()).dev
  return (
    <main className={`${CONTAINER} pt-18 pb-32`}>
      <DashboardView campaigns={campaigns} startTour={tour === '1'} />
      {stats && (dev || worthShowing(stats)) && <LiveNumbers stats={stats} preview={dev && !worthShowing(stats)} />}
    </main>
  )
}
