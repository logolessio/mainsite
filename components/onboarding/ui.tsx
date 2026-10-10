'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export function StepTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="text-center">
      <h1 className="font-display text-4xl leading-[1.02] md:text-5xl">{title}</h1>
      {sub && <p className="mx-auto mt-3 max-w-md text-pretty text-sm leading-relaxed text-mute md:text-base">{sub}</p>}
    </div>
  )
}

export function Chip({ on, onClick, children, className }: { on: boolean; onClick: () => void; children: React.ReactNode; className?: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        'inline-flex h-10 items-center gap-1.5 rounded-full border px-4 text-sm transition-colors',
        on ? 'border-paper bg-paper text-ink' : 'border-line-strong text-mute hover:border-paper/40 hover:text-paper',
        className,
      )}
    >
      {on && <Check aria-hidden="true" className="size-3.5" />}
      {children}
    </button>
  )
}

export function toggleIn(list: string[], v: string) {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v]
}

export function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('rounded-[24px] border border-white/10 bg-white/[0.04] p-5', className)}>{children}</div>
}

export function PrimaryBtn({ className, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...p}
      className={cn(
        'inline-flex h-12 items-center justify-center gap-2 rounded-full bg-paper px-6 text-sm font-medium text-ink transition-colors hover:bg-paper/85 disabled:cursor-not-allowed disabled:opacity-40',
        className,
      )}
    />
  )
}

export function GhostBtn({ className, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...p}
      className={cn(
        'inline-flex h-12 items-center justify-center gap-2 rounded-full border border-line-strong px-6 text-sm transition-colors hover:bg-paper/10 disabled:opacity-40',
        className,
      )}
    />
  )
}
