'use client'

import { CommandPalette } from '@/components/shell/command-palette'
import type { AppNavItem } from './nav-types'

/**
 * ⌘K or / inside a dashboard: the same box as on the public site (components/shell/command-palette.tsx), with this dashboard's pages in
 * it and its own most-used actions first. `handle` and `onHelp` are kept so callers do not need to change.
 */
export function Palette({ open, onClose, items, area, onLogout, recents }: { open: boolean; onClose: () => void; items: AppNavItem[]; area: string; onLogout: () => void; recents: string[]; handle?: string; onHelp?: () => void }) {
  return <CommandPalette open={open} onClose={onClose} area={area} items={items} recents={recents} onLogout={onLogout} />
}
