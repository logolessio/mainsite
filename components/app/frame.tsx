'use client'

import { DashShell } from './dash-shell'
import type { AppNavItem } from './nav-types'
import { StaffRoles } from './staff-roles'

export type { AppNavItem } from './nav-types'

/** The shell around every working area (clipper, brand, admin). `roles` is for the owner dashboard: which team tabs to show. */
export function AppFrame({ roles = [], ...props }: { area: string; items: AppNavItem[]; roles?: readonly string[]; children: React.ReactNode }) {
  return (
    <StaffRoles value={roles}>
      <DashShell {...props} />
    </StaffRoles>
  )
}
