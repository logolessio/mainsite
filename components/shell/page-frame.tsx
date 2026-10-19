'use client'

import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { appArea } from '@/lib/app-areas'
import { cn } from '@/lib/utils'
import { useTransitions } from './transition-provider'

/**
 * Holds one page. When a page is replaced by another, the new one is a fresh element that rises into place out of a blur, and the old one
 * leaves the same way upwards (see .page-enter and .page-leave in globals.css). Whether to animate in is decided once, when the element is
 * made: the first page of a visit never animates, and a page that stays (the dashboard's frame) never replays it.
 */
export function PageEnter({ className, exiting, children, ...rest }: { className?: string; exiting?: boolean; children: React.ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  const { hasNavigated } = useTransitions()
  const [enter] = useState(() => hasNavigated())
  return (
    <div className={cn(className, enter && 'page-enter', exiting && 'page-leave')} {...rest}>
      {children}
    </div>
  )
}

export function PageFrame({ children }: { children: React.ReactNode }) {
  const { phase } = useTransitions()
  const pathname = usePathname()
  const area = appArea(pathname)
  // the dashboards change only their own page (see DashShell), so the sidebar never blinks: their frame stays, keyed by the area
  const exiting = phase === 'exiting' && !area

  return (
    <PageEnter key={area ?? pathname} exiting={exiting} data-vt-frame="" className="relative z-10 min-h-dvh">
      {children}
    </PageEnter>
  )
}
