import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { RecapStory } from '@/components/app/recap-story'
import { featureOn } from '@/lib/features'
import { recapFor } from '@/lib/recap'
import { pageUser } from '@/lib/user'

export const metadata: Metadata = { title: 'Your recap | logoless', robots: { index: false } }

export default async function Page() {
  if (!(await featureOn('recap'))) notFound()
  const user = await pageUser()
  return <RecapStory recap={await recapFor(user)} />
}
