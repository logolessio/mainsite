'use client'

import { DashShell } from './dash-shell'
import type { AppNavItem } from './nav-types'

export type { AppNavItem } from './nav-types'

/** The shell around every working area (clipper, brand, admin). */
export function AppFrame(props: { area: string; items: AppNavItem[]; children: React.ReactNode }) {
  return <DashShell {...props} />
}
