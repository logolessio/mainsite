import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { Reels } from '@/components/marketing/reels'
import { liveCampaigns } from '@/lib/campaigns-db'
import { featureOn } from '@/lib/features'

export const metadata: Metadata = { title: 'Reels | logoless', description: 'Swipe through live campaigns, hear the track, and make content for the one you love.' }

export default async function Page() {
  await connection()
  if (!(await featureOn('reels'))) notFound()
  return <Reels campaigns={await liveCampaigns()} />
}
