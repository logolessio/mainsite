import type { Metadata } from 'next'
import { PageHeader } from '@/components/app/ui'
import { AchievementsView } from '@/components/profile/achievements-view'

export const metadata: Metadata = { title: 'Achievements | logoless', robots: { index: false } }

export default function Page() {
  return (
    <>
      <PageHeader title="Achievements" sub="Unlock badges as you use logoless, then equip up to five on your profile." />
      <AchievementsView />
    </>
  )
}
