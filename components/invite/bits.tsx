'use client'

import { motion } from 'framer-motion'
import { Check, ImagePlus, Loader2 } from 'lucide-react'
import { useId, useMemo } from 'react'
import { EASE_OUT } from '@/lib/layout'
import { cn } from '@/lib/utils'

/** The big question at the top of a step. Words rise in one after another. */
export function Ask({ children, sub }: { children: string; sub?: string }) {
  const words = children.split(' ')
  return (
    <div className="mb-8 md:mb-10">
      <h1 className="font-display text-[2.1rem] leading-[1.05] font-medium tracking-tight md:text-6xl">
        {words.map((w, i) => (
          <span key={i} className="inline-block overflow-hidden pb-[0.12em] align-top">
            <motion.span initial={{ y: '110%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.7, delay: 0.05 + i * 0.045, ease: EASE_OUT }} className="inline-block">
              {w}&nbsp;
            </motion.span>
          </span>
        ))}
      </h1>
      {sub && (
        <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.25 + words.length * 0.04, ease: EASE_OUT }} className="mt-4 max-w-xl text-base leading-relaxed text-mute md:text-lg">
          {sub}
        </motion.p>
      )}
    </div>
  )
}

/** Fades its children up, staggered by `i`. */
export function Rise({ i = 0, children, className }: { i?: number; children: React.ReactNode; className?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 + i * 0.07, ease: EASE_OUT }} className={className}>
      {children}
    </motion.div>
  )
}

const box = 'w-full rounded-2xl border border-line-strong bg-white/[0.035] px-5 text-lg text-paper placeholder:text-mute/70 transition-colors focus:border-paper/60 focus:bg-white/[0.06] focus:outline-none'

export function Label({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <span className="mb-2 flex items-baseline justify-between gap-3">
      <span className="text-xs tracking-wide text-mute">{children}</span>
      {hint && <span className="shrink-0 text-xs text-mute/80">{hint}</span>}
    </span>
  )
}

export function BigInput({ label, hint, prefix, error, className, ...p }: { label: string; hint?: string; prefix?: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId()
  return (
    <div className={className}>
      <label htmlFor={id}>
        <Label hint={hint}>{label}</Label>
      </label>
      <div className={cn('flex h-16 items-center', box, 'focus-within:border-paper/60 focus-within:bg-white/[0.06]', error && 'border-signal/60')}>
        {prefix && <span className="mr-0.5 shrink-0 text-mute">{prefix}</span>}
        <input id={id} {...p} className="h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-mute/70" />
      </div>
      {error && <p className="mt-2 text-sm text-signal">{error}</p>}
    </div>
  )
}

export function BigArea({ label, hint, className, ...p }: { label: string; hint?: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId()
  return (
    <div className={className}>
      <label htmlFor={id}>
        <Label hint={hint}>{label}</Label>
      </label>
      <textarea id={id} {...p} className={cn(box, 'min-h-32 py-4 leading-relaxed')} />
    </div>
  )
}

export function Chip({ on, onClick, children, disabled }: { on: boolean; onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button type="button" aria-pressed={on} disabled={disabled} onClick={onClick} className={cn('inline-flex h-12 items-center gap-2 rounded-full border px-5 text-[15px] transition-all duration-200 active:scale-95 disabled:opacity-40', on ? 'border-paper bg-paper text-ink' : 'border-line-strong text-mute hover:border-paper/50 hover:text-paper')}>
      {on && <Check className="size-4" />}
      {children}
    </button>
  )
}

/** A square or round drop area that shows the picture once it is chosen. */
export function UploadTile({ label, hint, preview, round, busy, onFile, error }: { label: string; hint: string; preview: string | null; round?: boolean; busy: boolean; onFile: (f: File) => void; error?: string }) {
  const id = useId()
  return (
    <div>
      <Label>{label}</Label>
      <label
        htmlFor={id}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          const f = e.dataTransfer.files?.[0]
          if (f) onFile(f)
        }}
        className={cn('group relative grid cursor-pointer place-items-center overflow-hidden border border-dashed border-line-strong bg-white/[0.03] transition-colors hover:border-paper/60 hover:bg-white/[0.06]', round ? 'size-44 rounded-full' : 'size-44 rounded-[2rem] sm:size-56')}
      >
        {preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="absolute inset-0 size-full object-cover" />
        )}
        <span className={cn('relative z-10 flex flex-col items-center gap-2 px-4 text-center text-sm', preview ? 'rounded-full bg-black/60 px-4 py-2 opacity-0 backdrop-blur transition-opacity group-hover:opacity-100' : 'text-mute')}>
          {busy ? <Loader2 className="size-6 animate-spin" /> : <ImagePlus className="size-6" />}
          {busy ? 'Uploading…' : preview ? 'Change' : hint}
        </span>
        <input id={id} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      </label>
      {error && <p className="mt-2 text-sm text-signal">{error}</p>}
    </div>
  )
}

/** A burst of small pieces that fall once. Plain CSS-sized motion, no library. */
export function Confetti({ count = 46 }: { count?: number }) {
  const bits = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const r = (n: number) => {
          const x = Math.sin(i * 91.7 + n * 17.3) * 43758.5453
          return x - Math.floor(x)
        }
        return { x: (r(1) - 0.5) * 900, y: -120 - r(2) * 360, rot: (r(3) - 0.5) * 900, size: 6 + r(4) * 8, delay: r(5) * 0.25, round: r(6) > 0.5, tone: ['#ffffff', '#c9c9cf', '#8a8a92', '#f3f2ee'][Math.floor(r(7) * 4)] }
      }),
    [count],
  )
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-1/3 z-0 flex justify-center">
      {bits.map((b, i) => (
        <motion.span
          key={i}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0.4 }}
          animate={{ x: b.x, y: [0, b.y, b.y + 720], opacity: [1, 1, 0], rotate: b.rot, scale: 1 }}
          transition={{ duration: 2.4, delay: b.delay, ease: [0.2, 0.7, 0.3, 1], times: [0, 0.35, 1] }}
          style={{ width: b.size, height: b.round ? b.size : b.size * 2, background: b.tone, borderRadius: b.round ? 999 : 2 }}
          className="absolute"
        />
      ))}
    </div>
  )
}
