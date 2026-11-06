import type { Metadata } from 'next'
import { PreferencesView } from '@/components/site/preferences'
import { PageHead, SiteFrame } from '@/components/site/site-frame'

export const metadata: Metadata = { title: 'Preferences | logoless', description: 'Motion, music and data choices for every logoless page, kept on this device.', robots: { index: false } }

export default function Page() {
  return (
    <SiteFrame>
      <PageHead kicker="preferences" title="your way" lead="choices for every logoless page you open, kept in this browser only. they work whether or not you have an account." />
      <PreferencesView />
    </SiteFrame>
  )
}
