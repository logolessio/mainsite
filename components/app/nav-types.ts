import type { IconName } from '@/components/icons'

/** `match` lists other pages that belong to this item, so the sidebar stays lit while you move between its tabs. */
export type AppNavItem = { label: string; href: string; icon: IconName; exact?: boolean; match?: string[] }

export const isActive = (pathname: string, it: AppNavItem) =>
  it.exact ? pathname === it.href : [it.href, ...(it.match ?? [])].some((h) => pathname === h || pathname.startsWith(`${h}/`))
