'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

type Icon = React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>

/**
 * The email part of signing in, one calm block instead of separate boxes: the fields sit in a single rounded group with a hairline
 * between them, each with its icon and a small label above what is typed. The whole group lights up while one of its fields is used.
 */
export function FieldGroup({ children }: { children: React.ReactNode }) {
  return <div className="overflow-hidden rounded-[calc(1.5rem*var(--round,1))] border border-line-strong bg-ink/60 transition-colors duration-200 focus-within:border-paper/70 [&>*+*]:border-t [&>*+*]:border-line">{children}</div>
}

export function FieldRow({ icon: Icon, label, right, children }: { icon: Icon; label: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="group/row flex items-center transition-colors duration-200 focus-within:bg-white/[0.04]">
      <label className="flex min-w-0 flex-1 cursor-text items-center gap-3.5 py-3 pl-4">
        <Icon aria-hidden className="size-[18px] shrink-0 text-mute transition-colors duration-200 group-focus-within/row:text-paper" />
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] leading-none text-mute">{label}</span>
          {children}
        </span>
      </label>
      {right ?? <span className="w-4 shrink-0" />}
    </div>
  )
}

/** The text field inside a row. It draws no ring of its own: the group does. */
export function RowInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input data-bare {...props} className={cn('mt-1.5 block h-6 w-full bg-transparent text-[16px] text-paper placeholder:text-mute/50 disabled:opacity-50', props.className)} />
}

/**
 * The six digit code as six boxes. There is one real field underneath (so pasting, autofill from a text message and the number
 * keyboard all work as usual) and the boxes only show what it holds, with the next empty one marked.
 */
export function OtpInput({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const [focus, setFocus] = useState(false)
  const at = Math.min(value.length, 5)
  return (
    <div className="relative mx-auto w-full max-w-[21rem]">
      <div className="grid grid-cols-6 gap-2" aria-hidden="true">
        {Array.from({ length: 6 }, (_, i) => {
          const ch = value[i]
          const active = focus && i === at
          return (
            <span
              key={i}
              className={cn(
                'grid h-14 place-items-center rounded-[calc(1rem*var(--round,1))] border bg-ink/60 font-mono text-2xl transition-[border-color,background-color,translate] duration-200 md:h-16',
                ch ? 'border-paper/45' : 'border-line-strong',
                active && '-translate-y-0.5 border-paper bg-white/[0.06]',
              )}
            >
              {ch ?? (active ? <span className="h-6 w-px bg-paper motion-safe:animate-pulse" /> : null)}
            </span>
          )
        })}
      </div>
      <input
        data-bare
        autoFocus
        disabled={disabled}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        aria-label="6-digit code"
        className="absolute inset-0 h-full w-full cursor-text opacity-0"
      />
    </div>
  )
}
