import type { IconName } from '@/components/icons'

/** `match` lists other pages that belong to this item, so the sidebar stays lit while you move between its tabs. */
/** `section` puts a small heading above the first item of each group in the sidebar. */
export type AppNavItem = { label: string; href: string; icon: IconName; exact?: boolean; match?: string[]; section?: string; /** the letter that follows "g" to go here */ key?: string; /** a special highlight (Recap, until it has been opened) */ glow?: 'gold' }

export const isActive = (pathname: string, it: AppNavItem) =>
  it.exact ? pathname === it.href : [it.href, ...(it.match ?? [])].some((h) => pathname === h || pathname.startsWith(`${h}/`))
