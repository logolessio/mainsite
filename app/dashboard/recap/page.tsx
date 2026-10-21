import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { RecapStory } from '@/components/app/recap-story'
import { markRecapSeen } from '@/lib/dashboard-state'
import { featureOn } from '@/lib/features'
import { recapFor } from '@/lib/recap'
import { pageUser } from '@/lib/user'

export const metadata: Metadata = { title: 'Your recap | logoless', robots: { index: false } }

export default async function Page() {
  if (!(await featureOn('recap'))) notFound()
  const user = await pageUser()
  // opened: the gold in the sidebar goes until three months from now
  if (await featureOn('recap-sidebar')) await markRecapSeen(user.id).catch(() => {})
  return <RecapStory recap={await recapFor(user)} />
}
