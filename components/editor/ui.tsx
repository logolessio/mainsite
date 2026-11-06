'use client'

import { ChevronDown } from 'lucide-react'
import { type CSSProperties, type ReactNode, useEffect, useId, useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * A numbered section of controls: a big title, what it does in a line, and "Close" to fold it away (a long page is much easier to get round that way; how
 * each one was left is remembered). `fold` starts it folded. The numbers (01, 02 ...) count by themselves, and the search jumps to a section by its title.
 */
export function Group({ title, hint, children, className, fold = false }: { title?: string; hint?: string; children: ReactNode; className?: string; fold?: boolean }) {
  const key = title ? `ll:fold:${title}` : ''
  const [open, setOpen] = useState(!fold)
  useEffect(() => {
    if (!key) return
    try {
      const v = window.localStorage.getItem(key)
      if (v === '1') setOpen(true)
      else if (v === '0') setOpen(false)
    } catch {
      /* the choice is not kept */
    }
  }, [key])
  // the search asks a section to open when it takes you to it
  useEffect(() => {
    if (!title) return
    const on = (e: Event) => (e as CustomEvent<string>).detail === title && setOpen(true)
    window.addEventListener('ll:open', on)
    return () => window.removeEventListener('ll:open', on)
  }, [title])
  const toggle = () => {
    setOpen((v) => {
      try {
        window.localStorage.setItem(key, v ? '0' : '1')
      } catch {
        /* the choice is not kept */
      }
      return !v
    })
  }
  return (
    <section data-sec={title || undefined} className={cn('ed-sec scroll-mt-24 border-b border-[var(--ed-line)] px-6', open || !title ? 'py-8' : 'py-6', className)}>
      {title && (
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <span aria-hidden="true" className="ed-sec-num mono block text-[0.66rem] tracking-[0.18em] text-white/45" />
            <h3 className="mt-2 text-[1.65rem] leading-none font-semibold tracking-[-0.035em] text-white">{title}</h3>
          </div>
          <button type="button" onClick={toggle} aria-expanded={open} aria-label={`${open ? 'Close' : 'Open'} ${title}`} className="mt-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[0.78rem] text-white/50 transition-colors hover:bg-white/[0.06] hover:text-white">
            {open ? 'Close' : 'Open'}
            <ChevronDown className={cn('size-3.5 transition-transform duration-300', open && 'rotate-180')} />
          </button>
        </div>
      )}
      {(open || !title) && (
        <div className={title ? 'mt-3' : ''}>
          {hint && <p className="mb-5 max-w-[34rem] text-[0.88rem] leading-snug text-white/60">{hint}</p>}
          <div className="space-y-5">{children}</div>
        </div>
      )}
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
    <div role="radiogroup" className="grid gap-1 rounded-xl border border-[var(--ed-line)] bg-white/[0.02] p-1" style={{ gridTemplateColumns: `repeat(${cols ?? options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={value === o.id} onClick={() => onChange(o.id)} className={cn('h-8 rounded-lg px-2 text-[0.76rem] whitespace-nowrap transition-colors duration-200', value === o.id ? 'bg-[#ececec] text-[#0a0a0a]' : 'text-[var(--ed-mute)] hover:text-white')}>
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
        <span className="block text-[0.84rem] text-white">{label}</span>
        {hint && <span className="mt-0.5 block text-[0.74rem] leading-snug text-[var(--ed-mute)]">{hint}</span>}
      </label>
      <button id={id} type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={cn('relative h-6 w-10 shrink-0 rounded-full border transition-colors duration-300', checked ? 'border-transparent bg-[#ececec]' : 'border-[var(--ed-line2)] bg-transparent')}>
        <span className={cn('absolute top-[3px] size-4 rounded-full transition-all duration-300 ease-out', checked ? 'left-[19px] bg-[#0a0a0a]' : 'left-[3px] bg-white/60')} />
      </button>
    </div>
  )
}

const field = 'w-full rounded-xl border border-[var(--ed-line)] bg-white/[0.03] px-3.5 text-[0.88rem] text-white outline-none transition-colors duration-200 placeholder:text-white/25 focus:border-white/40'
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
        'cap inline-flex h-9 items-center justify-center gap-2 rounded-full px-4 whitespace-nowrap transition-[background,color,border-color,transform] duration-200 hover:-translate-y-px disabled:pointer-events-none disabled:opacity-35',
        variant === 'solid' && 'bg-[#ececec] text-[#0a0a0a] hover:bg-white',
        variant === 'ghost' && 'border border-[var(--ed-line2)] text-white hover:border-white/30 hover:bg-white/[0.06]',
        variant === 'quiet' && 'text-[var(--ed-mute)] hover:text-white',
        className,
      )}
    >
      {children}
    </button>
  )
}

/** A colour: a swatch that opens the picker, and the code, which can be typed or pasted. */
export function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [text, setText] = useState(value)
  useEffect(() => setText(value), [value])
  const commit = (v: string) => {
    const t = v.startsWith('#') ? v : `#${v}`
    if (/^#[0-9a-f]{6}$/i.test(t)) onChange(t.toLowerCase())
  }
  return (
    <div className="flex items-center gap-3">
      <label className="relative size-10 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-[var(--ed-line2)] transition-transform duration-200 hover:-translate-y-px" style={{ background: value }}>
        <input type="color" value={value} onChange={(e) => onChange(e.target.value.toLowerCase())} aria-label={`${label}, colour picker`} className="absolute inset-0 size-full cursor-pointer opacity-0" />
      </label>
      <div className="min-w-0 flex-1">
        <p className="text-[0.76rem] text-[var(--ed-mute)]">{label}</p>
        <input
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            commit(e.target.value)
          }}
          spellCheck={false}
          maxLength={7}
          aria-label={`${label}, code`}
          className="mt-0.5 h-8 w-full rounded-lg border border-transparent bg-transparent px-1 text-[0.84rem] uppercase outline-none transition-colors hover:border-[var(--ed-line)] focus:border-white/40"
        />
      </div>
    </div>
  )
}
