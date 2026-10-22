'use client'

import { motion } from 'framer-motion'
import { Check, Plus, RotateCcw } from 'lucide-react'
import { useId } from 'react'
import { ColorPicker } from '@/components/ui/color-picker'
import { cn } from '@/lib/utils'

/** A titled block of controls inside a studio panel. */
export function Group({ title, hint, action, children, className }: { title: string; hint?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={className}>
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-medium">{title}</h3>
        {action ?? (hint && <p className="text-right text-xs text-mute">{hint}</p>)}
      </div>
      {children}
    </section>
  )
}

/** A 0 to 100 slider with its value, and an optional reset to the usual value. */
export function Slider({ label, hint, value, onChange, min = 0, max = 100, step = 1, unit = '', normal }: { label: string; hint?: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; unit?: string; normal?: number }) {
  const id = useId()
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm">
          {label} {hint && <span className="text-xs text-mute">{hint}</span>}
        </label>
        <span className="flex items-center gap-1.5">
          {normal !== undefined && value !== normal && (
            <button type="button" onClick={() => onChange(normal)} aria-label={`Reset ${label}`} className="grid size-6 place-items-center rounded-pill text-mute hover:bg-white/10 hover:text-paper">
              <RotateCcw className="size-3" />
            </button>
          )}
          <span className="min-w-8 text-right font-mono text-xs text-mute tabular-nums">
            {value}
            {unit}
          </span>
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ background: `linear-gradient(90deg, color-mix(in srgb, var(--color-white) 85%, transparent) ${pct}%, color-mix(in srgb, var(--color-white) 12%, transparent) ${pct}%)` }}
        className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-pill [&::-moz-range-thumb]:size-5 [&::-moz-range-thumb]:rounded-pill [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-paper [&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-pill [&::-webkit-slider-thumb]:bg-paper [&::-webkit-slider-thumb]:shadow-[0_0_0_4px_rgb(255_255_255/0.12)]"
      />
    </div>
  )
}

/** Round colour swatches with a custom colour at the end. `extra` sits in the same row (for example recent banners). */
export function Swatches({ label, value, options, onChange, extra }: { label?: string; value: string; options: string[]; onChange: (v: string) => void; extra?: React.ReactNode }) {
  const v = value.toLowerCase()
  const custom = !options.includes(v)
  return (
    <div>
      {label && <p className="mb-2 text-xs text-mute">{label}</p>}
      <div className="flex flex-wrap items-center gap-2">
        {options.map((c) => (
          <button key={c} type="button" onClick={() => onChange(c)} aria-label={`Colour ${c}`} aria-pressed={v === c} className={cn('grid size-8 place-items-center rounded-pill border-2 transition-transform hover:scale-110', v === c ? 'border-paper' : 'border-white/10')} style={{ background: c }}>
            {v === c && <Check className="size-3.5 mix-blend-difference" />}
          </button>
        ))}
        <ColorPicker
          value={value}
          onChange={onChange}
          label={label}
          className={cn('relative grid size-8 cursor-pointer place-items-center overflow-hidden rounded-pill border-2 text-mute transition-transform hover:scale-110', custom ? 'border-paper' : 'border-dashed border-line-strong')}
          style={custom ? { background: value } : undefined}
        >
          {!custom && <Plus aria-hidden="true" className="size-3.5" />}
        </ColorPicker>
        {extra}
      </div>
    </div>
  )
}

/** A row of choices where exactly one is on, with a sliding highlight. */
export function Segmented<T extends string>({ value, options, onChange, label, layoutId }: { value: T; options: { id: T; label: string; icon?: React.ReactNode }[]; onChange: (v: T) => void; label: string; layoutId: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="no-scrollbar flex gap-1 overflow-x-auto rounded-pill border border-line bg-ink p-1">
      {options.map((o) => {
        const on = o.id === value
        return (
          <button key={o.id} type="button" role="radio" aria-checked={on} onClick={() => onChange(o.id)} className={cn('relative inline-flex h-8 shrink-0 items-center gap-1.5 rounded-pill px-3 text-xs transition-colors', on ? 'text-ink' : 'text-mute hover:text-paper')}>
            {on && <motion.span layoutId={layoutId} transition={{ type: 'spring', stiffness: 460, damping: 36 }} className="absolute inset-0 rounded-pill bg-paper" />}
            <span className="relative inline-flex items-center gap-1.5">
              {o.icon}
              {o.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/** A tile in a grid of choices (effects, fonts). */
export function Tile({ on, onClick, children, className, label }: { on: boolean; onClick: () => void; children: React.ReactNode; className?: string; label?: string }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} aria-label={label} className={cn('relative rounded-panel border transition-all hover:-translate-y-0.5', on ? 'border-paper bg-paper/10' : 'border-line text-mute hover:bg-paper/5 hover:text-paper', className)}>
      {children}
      {on && <Check className="absolute top-1.5 right-1.5 size-3.5 text-paper" />}
    </button>
  )
}
