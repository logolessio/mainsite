'use client'

import { MotionConfig } from 'framer-motion'
import { PreviewProvider } from './preview-provider'
import { SiteFooter } from './site-footer'
import { PageFrame } from './page-frame'
import { SiteNav } from './site-nav'
import { TransitionProvider } from './transition-provider'
import { RidgeField } from './ridge-field'
import { LightField } from './light-field'
import { NavUserProvider } from './nav-user'

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <TransitionProvider>
        <PreviewProvider>
        <NavUserProvider>
        <RidgeField />
        <LightField />
        <SiteNav />
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
