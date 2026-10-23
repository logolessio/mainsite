'use client'

import { MotionConfig } from 'framer-motion'
import { useSyncExternalStore } from 'react'
import { getCalm, subscribeCalm } from '@/lib/calm'
import { AutoCalm, CalmApply } from './calm-toggle'
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
import { PageRails } from './pillar-rails'
import { NavUserProvider } from './nav-user'
import { Tracker } from './tracker'
import { AnnouncementBar } from './announcement-bar'
import { StickyCta } from './sticky-cta'
import { NavProgress } from './nav-progress'
import { Keyboard } from './keyboard'
import { Toaster } from './toaster'
import { CampaignModalProvider } from '@/components/campaign/campaign-modal'
import type { LinkItem } from '@/lib/socials'

export function AppShell({ children, announcement = null, dots = false, links = [], signedIn }: { children: React.ReactNode; announcement?: { text: string; href: string } | null; dots?: boolean; links?: LinkItem[]; signedIn?: boolean }) {
  const calm = useSyncExternalStore(subscribeCalm, getCalm, () => false)
  return (
    <MotionConfig reducedMotion={calm ? 'always' : 'user'}>
      <TransitionProvider>
        <PreviewProvider>
        <NavUserProvider signedIn={signedIn}>
        <CampaignModalProvider>
        <NavProgress />
        <Toaster />
        <Keyboard />
        <Tracker />
        <CalmApply />
        <AutoCalm />
        <Spotlight />
        <LiveToasts />
        <BadgeCelebration />
        <GradientField rails={false} />
        {dots && <RidgeField />}
        <LightField />
        <PageRails />
        <SiteNav />
        <StickyCta />
        {announcement && <AnnouncementBar text={announcement.text} href={announcement.href} />}
        <PageFrame>
          {children}
          <SiteFooter links={links} />
        </PageFrame>
        </CampaignModalProvider>
        </NavUserProvider>
        </PreviewProvider>
      </TransitionProvider>
    </MotionConfig>
  )
}
