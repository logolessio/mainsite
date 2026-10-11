'use client'

import { motion } from 'framer-motion'
import { Icon, type IconName } from '@/components/icons'
import { EASE_OUT } from '@/lib/layout'
import { CountUp } from './count-up'
import { cn } from '@/lib/utils'

export function PageHeader({
  title,
  sub,
  actions,
}: {
  title: string
  sub?: string
  actions?: React.ReactNode
}) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE_OUT }}
      className="mb-8 flex flex-col gap-4 md:mb-10 md:flex-row md:items-end md:justify-between"
    >
      <div>
        <h1 className="font-display text-5xl leading-[0.98] md:text-7xl">{title}</h1>
        {sub && <p className="mt-3 max-w-xl text-mute">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </motion.header>
  )
}

export function Card({ className, children, title, action }: { className?: string; children: React.ReactNode; title?: string; action?: React.ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: EASE_OUT }}
      className={cn('overflow-hidden rounded-[24px] border border-line bg-surface/80', className)}
    >
      {title && (
        <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
          <h2 className="font-display text-2xl">{title}</h2>
          {action}
        </div>
      )}
      <div className="p-5">{children}</div>
    </motion.section>
  )
}

/** Values are rendered exactly as passed. Pass real data from your API; empty accounts show 0 or an em dash. */
export function StatCard({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: EASE_OUT }}
      data-spot
      className="spot relative rounded-[24px] border border-line bg-surface/80 p-5"
    >
      <p className="font-mono text-xs text-mute">{label}</p>
      <p className="mt-3 font-display text-5xl leading-none"><CountUp value={value} /></p>
      {note && <p className="mt-2 text-xs text-mute">{note}</p>}
    </motion.div>
  )
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn('relative h-7 w-12 shrink-0 rounded-full border transition-colors', checked ? 'border-paper bg-paper' : 'border-line-strong bg-ink')}
    >
      <span
        aria-hidden="true"
        className={cn('absolute top-[3px] left-[3px] size-5 rounded-full transition-all duration-200', checked ? 'translate-x-5 bg-ink' : 'translate-x-0 bg-mute')}
      />
    </button>
  )
}

export function ActionButton({ className, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'solid' | 'ghost' | 'danger' }) {
  const { variant = 'solid', ...rest } = p as React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string }
  return (
    <button
      {...rest}
      className={cn(
        'inline-flex h-10 items-center justify-center gap-2 px-4 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40',
        variant === 'solid' && 'bg-paper font-medium text-ink hover:bg-paper/85',
        variant === 'ghost' && 'border border-line-strong hover:bg-paper/10',
        variant === 'danger' && 'border border-signal/50 text-signal hover:bg-signal/10',
        className,
      )}
    />
  )
}
