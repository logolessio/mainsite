'use client'

import { motion } from 'framer-motion'
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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE_OUT }}
      className="mb-10 flex flex-col gap-5 border-b border-line pb-8 md:mb-12 md:flex-row md:items-end md:justify-between md:pb-10"
    >
      <div className="min-w-0">
        <h1 className="font-display text-4xl leading-[1] tracking-[-0.035em] md:text-[3.4rem]">{title}</h1>
        {sub && <p className="mt-4 max-w-xl text-[17px] leading-relaxed text-paper/55">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </motion.header>
  )
}

/**
 * A quiet panel. Tables placed inside it sit flush against its edges, so there are no boxes inside boxes.
 */
export function Card({ className, children, title, sub, action }: { className?: string; children: React.ReactNode; title?: string; sub?: string; action?: React.ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE_OUT }}
      className={cn('overflow-hidden rounded-3xl border border-line bg-[#09090a]', className)}
    >
      {title && (
        <div className="flex items-start justify-between gap-4 px-6 pt-6">
          <div className="min-w-0">
            <h2 className="text-lg font-normal tracking-[-0.01em]">{title}</h2>
            {sub && <p className="mt-1 text-sm text-mute">{sub}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={cn('p-6 has-[[data-table]]:px-0 has-[[data-table]]:pb-2 [&_[data-table]]:rounded-none [&_[data-table]]:border-0 [&_[data-table]]:bg-transparent', title && 'pt-5 has-[[data-table]]:pt-3')}>{children}</div>
    </motion.section>
  )
}

/** Values are rendered exactly as passed. Pass real data from your API; empty accounts show 0 or an em dash. */
export function StatCard({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: EASE_OUT }} className="border-t border-line-strong pt-5">
      <p className="text-[15px] text-paper/50">{label}</p>
      <p className="mt-6 font-display text-5xl leading-none tracking-[-0.045em] tabular-nums md:text-6xl">
        <CountUp value={value} />
      </p>
      {note && <p className="mt-5 text-[15px] text-paper/50">{note}</p>}
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
        'inline-flex h-10 items-center justify-center gap-2 rounded-full px-5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40',
        variant === 'solid' && 'bg-paper font-medium text-ink hover:bg-paper/85',
        variant === 'ghost' && 'bg-white/[0.06] text-paper hover:bg-white/[0.11]',
        variant === 'danger' && 'bg-signal/10 text-signal hover:bg-signal/20',
        className,
      )}
    />
  )
}
