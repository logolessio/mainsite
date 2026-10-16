'use client'

import { cn } from '@/lib/utils'

/** A grid of tiles. */
export function Bento({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('grid gap-4 md:grid-cols-6 xl:grid-cols-12', className)}>{children}</div>
  )
}

/** One tile. It lifts a little when the pointer is over it. */
export function Tile({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('relative overflow-hidden rounded-3xl border border-line bg-black/45 transition-colors hover:border-line-strong', className)}>{children}</div>
  )
}
