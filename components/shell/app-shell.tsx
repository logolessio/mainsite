'use client'

import { MotionConfig } from 'framer-motion'
import { usePathname } from 'next/navigation'
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

/** Working areas get a calm, plain background. The animated dots stay on the public pages. */
const CALM = ['/dashboard', '/brand', '/admin']

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const calm = CALM.some((p) => pathname.startsWith(p))
  return (
    <MotionConfig reducedMotion="user">
      <TransitionProvider>
        <PreviewProvider>
        <NavUserProvider>
        <Tracker />
        <Ambient />
        {!calm && <RidgeField />}
        {!calm && <LightField />}
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
