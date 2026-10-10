import type { Metadata } from 'next'
import { DashboardView } from '@/components/browse/dashboard-view'
import { campaigns } from '@/lib/campaigns'
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
  const { tour } = await searchParams
  return (
    <main className={`${CONTAINER} pt-18 pb-32`}>
      <DashboardView campaigns={campaigns} startTour={tour === '1'} />
    </main>
  )
}
