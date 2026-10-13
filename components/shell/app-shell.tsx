'use client'

import { MotionConfig } from 'framer-motion'
import { useSyncExternalStore } from 'react'
import { getCalm, subscribeCalm } from '@/lib/calm'
import { AutoCalm, CalmApply } from './calm-toggle'
import { ThemeApply } from './theme-toggle'
import { LiveToasts } from './live-toasts'
import { Spotlight } from './spotlight'
import { BadgeCelebration } from './badge-celebration'
import { PreviewProvider } from './preview-provider'
import { SiteFooter } from './site-footer'
import { PageFrame } from './page-frame'
import { SiteNav } from './site-nav'
import { TransitionProvider } from './transition-provider'
import { GradientField } from './gradient-field'
import { RidgeField } from './ridge-field'
import { LightField } from './light-field'
import { NavUserProvider } from './nav-user'
import { Tracker } from './tracker'
import { AnnouncementBar } from './announcement-bar'
import { StickyCta } from './sticky-cta'

export function AppShell({ children, announcement = null }: { children: React.ReactNode; announcement?: { text: string; href: string } | null }) {
  const calm = useSyncExternalStore(subscribeCalm, getCalm, () => false)
  return (
    <MotionConfig reducedMotion={calm ? 'always' : 'user'}>
      <TransitionProvider>
        <PreviewProvider>
        <NavUserProvider>
        <Tracker />
        <CalmApply />
        <AutoCalm />
        <ThemeApply />
        <Spotlight />
        <LiveToasts />
        <BadgeCelebration />
        <GradientField />
        <RidgeField />
        <LightField />
        <SiteNav />
        <StickyCta />
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
