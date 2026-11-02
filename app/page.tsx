import type { Metadata } from 'next'
import { DashboardView } from '@/components/browse/dashboard-view'
import { ClipOfTheWeek } from '@/components/extras/clip-of-week'
import { LiveTicker } from '@/components/extras/live-ticker'
import { connection } from 'next/server'
import { Home } from '@/components/home/home'
import { LiveNumbers } from '@/components/marketing/live-numbers'
import { endedCampaigns, liveCampaigns } from '@/lib/campaigns-db'
import { featureOn, featureState } from '@/lib/features'
import { publicStats, worthShowing } from '@/lib/public-stats'
import { CONTAINER } from '@/lib/layout'

export async function generateMetadata(): Promise<Metadata> {
  if (await featureOn('bio-site')) return { title: 'logoless | link in bio that moves', description: 'The link in bio for editors: a full-screen page with shaders, music, ten layouts and a cursor of your own. Claim logoless.io/you.' }
  return { title: 'logoless | views have value', description: 'Browse live content campaigns and get paid for every thousand views.' }
}

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ tour?: string }>
}) {
  await connection()
  // with the link-in-bio switch on, logoless.io is the new home page
  if (await featureOn('bio-site')) return <Home />
  const { tour } = await searchParams
  const [campaigns, ended] = await Promise.all([liveCampaigns(), endedCampaigns(60)])
  const stats = (await featureOn('live-numbers')) ? await publicStats() : null
  const dev = (await featureState()).dev
  return (
    <main className={`${CONTAINER} pt-18 pb-32`}>
      <DashboardView campaigns={campaigns} ended={ended} startTour={tour === '1'} />
      <LiveTicker />
      <ClipOfTheWeek />
      {stats && (dev || worthShowing(stats)) && <LiveNumbers stats={stats} preview={dev && !worthShowing(stats)} />}
    </main>
  )
}
