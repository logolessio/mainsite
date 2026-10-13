import type { Metadata } from 'next'
import { SectionTabs } from '@/components/app/section-tabs'
import { PageHeader } from '@/components/app/ui'
import { AchievementsView } from '@/components/profile/achievements-view'

export const metadata: Metadata = { title: 'Achievements | logoless', robots: { index: false } }

export default function Page() {
  return (
    <>
      <SectionTabs group="profile" />
      <PageHeader title="Achievements" sub="The badges you've earned. Pick up to five to show on your profile." />
      <AchievementsView />
    </>
  )
}
