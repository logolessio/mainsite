'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Icon, type IconName } from '@/components/icons'
import { LogOut, Menu, X } from 'lucide-react'
import { signOut } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Logo } from '@/components/logo'
import { TransitionLink } from '@/components/shell/transition-link'
import { EASE_OUT } from '@/lib/layout'
import { cn } from '@/lib/utils'

export type AppNavItem = { label: string; href: string; icon: IconName; exact?: boolean }

export function AppFrame({
  area,
  items,
  children,
}: {
  area: string
  items: AppNavItem[]
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const nav = (
    <nav aria-label={`${area} navigation`} className="flex flex-col gap-1">
      {items.map((it) => {
        const active = it.exact ? pathname === it.href : pathname === it.href || pathname.startsWith(`${it.href}/`)
        return (
          <TransitionLink
            key={it.href}
            href={it.href}
            onClick={() => setOpen(false)}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'relative flex h-11 items-center gap-3 px-3 text-sm transition-colors',
              active ? 'text-paper' : 'text-mute hover:text-paper',
            )}
          >
            {active && (
              <motion.span
                layoutId={`${area}-active`}
                transition={{ duration: 0.4, ease: EASE_OUT }}
                className="absolute inset-0 border border-line-strong bg-paper/[0.06] rounded-2xl"
              />
            )}
            <Icon name={it.icon} aria-hidden="true" className="relative size-4" />
            <span className="relative">{it.label}</span>
          </TransitionLink>
        )
      })}
    </nav>
  )

  const footer = (
    <div className="mt-auto flex flex-col gap-1 border-t border-line pt-4 text-sm">
      <TransitionLink href="/" className="flex h-10 items-center px-3 text-mute hover:text-paper">
        Back to site
      </TransitionLink>
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: '/' })}
        className="flex h-10 items-center gap-3 px-3 text-left text-mute hover:text-paper"
      >
        <LogOut aria-hidden="true" className="size-4" />
        Log out
      </button>
    </div>
  )

  return (
    <div className="relative z-10 min-h-dvh lg:grid lg:grid-cols-[250px_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col gap-8 border-r border-line bg-ink/90 p-5 lg:flex">
        <TransitionLink href="/" aria-label="logoless home">
          <Logo className="h-12" />
        </TransitionLink>
        <p className="-mb-5 px-3 font-mono text-xs text-mute">{area}</p>
        {nav}
        {footer}
      </aside>

      <div className="flex h-16 items-center justify-between border-b border-line bg-ink/90 px-5 lg:hidden">
        <TransitionLink href="/" aria-label="logoless home">
          <Logo className="h-10" />
        </TransitionLink>
        <button
          type="button"
          aria-label="Open menu"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          className="glass grid size-10 place-items-center"
        >
          <Menu className="size-4" />
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-ink/70 lg:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.4, ease: EASE_OUT }}
              className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col gap-6 border-r border-line bg-surface p-5 lg:hidden"
            >
              <div className="flex items-center justify-between">
                <p className="font-mono text-xs text-mute">{area}</p>
                <button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="grid size-9 place-items-center">
                  <X className="size-4" />
                </button>
              </div>
              {nav}
              {footer}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <main className="min-w-0 px-5 py-8 md:px-10 md:py-12">{children}</main>
    </div>
  )
}
