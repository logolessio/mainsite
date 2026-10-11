'use client'

import { MotionConfig } from 'framer-motion'
import { useSyncExternalStore } from 'react'
import { getCalm, subscribeCalm } from '@/lib/calm'
import { useFeature } from './features-provider'
import { CalmApply } from './calm-toggle'
import { LiveToasts } from './live-toasts'
import { Spotlight } from './spotlight'
import { BadgeCelebration } from './badge-celebration'
import { PreviewProvider } from './preview-provider'
import { SiteFooter } from './site-footer'
import { PageFrame } from './page-frame'
import { SiteNav } from './site-nav'
import { TransitionProvider } from './transition-provider'
import { RidgeField } from './ridge-field'
import { LightField } from './light-field'
import { NavUserProvider } from './nav-user'
import { Ambient } from './ambient'
import { Tracker } from './tracker'
import { AnnouncementBar } from './announcement-bar'

export function AppShell({ children, announcement = null }: { children: React.ReactNode; announcement?: { text: string; href: string } | null }) {
  const calmOn = useFeature('calm-mode')
  const calm = useSyncExternalStore(subscribeCalm, getCalm, () => false)
  return (
    <MotionConfig reducedMotion={calmOn && calm ? 'always' : 'user'}>
      <TransitionProvider>
        <PreviewProvider>
        <NavUserProvider>
        <Tracker />
        <CalmApply />
        <Spotlight />
        <LiveToasts />
        <BadgeCelebration />
        <Ambient />
        <RidgeField />
        <LightField />
        <SiteNav />
        {announcement && <AnnouncementBar text={announcement.text} href={announcement.href} />}
        <PageFrame>
          {children}
          <SiteFooter />
        </PageFrame>
        </NavUserProvider>
        </PreviewProvider>
      </TransitionProvider>
    </MotionConfig>
  )
}
