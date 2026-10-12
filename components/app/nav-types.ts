import type { IconName } from '@/components/icons'

export type AppNavItem = { label: string; href: string; icon: IconName; exact?: boolean }

export const isActive = (pathname: string, it: AppNavItem) => (it.exact ? pathname === it.href : pathname === it.href || pathname.startsWith(`${it.href}/`))
