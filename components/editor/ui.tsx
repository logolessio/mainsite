'use client'

import { type CSSProperties, type ReactNode, useId } from 'react'
import { cn } from '@/lib/utils'

/** A titled group of controls. */
export function Group({ title, hint, children, className }: { title?: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn('border-b border-[var(--ed-line)] px-5 py-5', className)}>
      {title && <h3 className="mb-1 text-[0.8rem] font-medium tracking-[-0.005em] text-white">{title}</h3>}
      {hint && <p className="mb-3 text-[0.76rem] leading-snug text-[var(--ed-mute)]">{hint}</p>}
      <div className={cn('space-y-4', !title && !hint && '')}>{children}</div>
    </section>
  )
}

export function Row({ label, value, children }: { label: string; value?: ReactNode; children: ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between text-[0.76rem]">
        <span className="text-[var(--ed-mute)]">{label}</span>
        {value !== undefined && <span className="tabular-nums text-[var(--ed-dim)]">{value}</span>}
      </div>
      {children}
    </div>
  )
}

/** A row of choices; exactly one is on. */
export function Seg<T extends string>({ value, options, onChange, cols }: { value: T; options: readonly { id: T; name: string }[]; onChange: (v: T) => void; cols?: number }) {
  return (
    <div role="radiogroup" className={cn('grid gap-1 rounded-xl border border-[var(--ed-line)] bg-black p-1')} style={{ gridTemplateColumns: `repeat(${cols ?? options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={value === o.id} onClick={() => onChange(o.id)} className={cn('h-8 rounded-lg px-2 text-[0.76rem] whitespace-nowrap transition-colors', value === o.id ? 'bg-white text-black' : 'text-[var(--ed-mute)] hover:text-white')}>
          {o.name}
        </button>
      ))}
    </div>
  )
}

export function Slider({ value, min = 0, max = 100, step = 1, onChange, tone, label }: { value: number; min?: number; max?: number; step?: number; onChange: (v: number) => void; tone?: boolean; label: string }) {
  const p = ((value - min) / (max - min)) * 100
  return <input type="range" aria-label={label} className={tone ? 'tone' : undefined} min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ '--p': `${p}%` } as CSSProperties} />
}

export function Switch({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  const id = useId()
  return (
    <div className="flex items-center justify-between gap-4">
      <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer">
        <span className="block text-[0.82rem] text-white">{label}</span>
        {hint && <span className="mt-0.5 block text-[0.74rem] leading-snug text-[var(--ed-mute)]">{hint}</span>}
      </label>
      <button id={id} type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={cn('relative h-6 w-10 shrink-0 rounded-full border transition-colors', checked ? 'border-white bg-white' : 'border-[var(--ed-line2)] bg-transparent')}>
        <span className={cn('absolute top-[3px] size-4 rounded-full transition-all duration-300', checked ? 'left-[19px] bg-black' : 'left-[3px] bg-white/60')} />
      </button>
    </div>
  )
}

const field = 'w-full rounded-xl border border-[var(--ed-line)] bg-black px-3.5 text-[0.88rem] text-white outline-none transition-colors placeholder:text-white/25 focus:border-white/50'
export function Input({ className, ...p }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...p} className={cn(field, 'h-10', className)} />
}
export function Area({ className, ...p }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...p} className={cn(field, 'min-h-[5.5rem] resize-y py-2.5 leading-relaxed', className)} />
}

export function Btn({ children, variant = 'ghost', className, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'solid' | 'ghost' | 'quiet' }) {
  return (
    <button
      type="button"
      {...p}
      className={cn(
        'inline-flex h-9 items-center justify-center gap-2 rounded-full px-4 text-[0.8rem] font-medium whitespace-nowrap transition-all disabled:pointer-events-none disabled:opacity-35',
        variant === 'solid' && 'bg-white text-black hover:opacity-85',
        variant === 'ghost' && 'border border-[var(--ed-line2)] text-white hover:bg-white/10',
        variant === 'quiet' && 'text-[var(--ed-mute)] hover:text-white',
        className,
      )}
    >
      {children}
    </button>
  )
}
