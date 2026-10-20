import type { Metadata } from 'next'
import { PageHeader } from '@/components/app/ui'
import { AchievementsView } from '@/components/profile/achievements-view'
import { featureOn } from '@/lib/features'

export const metadata: Metadata = { title: 'Achievements | logoless', robots: { index: false } }

export default async function Page() {
  const board = await featureOn('badge-board')
  return (
    <>
      <PageHeader title="Achievements" sub={board ? 'The badges you have earned. Drag up to five onto your profile, in the order you like.' : "The badges you've earned. Pick up to five to show on your profile."} />
      <AchievementsView board={board} />
    </>
  )
}
