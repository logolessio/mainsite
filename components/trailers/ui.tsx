'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { GlassSurface } from '@/components/glass/glass'
import { cn } from '@/lib/utils'
import { useTrailers } from './ctx'

export const EASE = [0.22, 1, 0.36, 1] as const

/** The logoless mark, top left, on every screen. */
export function Mark({ className }: { className?: string }) {
  return (
    <a href="https://logoless.io" aria-label="logoless" className={cn('tr-ui fixed top-7 left-8 z-[60] block', className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-sm.png" alt="logoless" width={347} height={260} className="h-[46px] w-auto" draggable={false} />
    </a>
  )
}

/** A button of glass. "primary" is the bright paper one; "glass" is clear. */
export function GButton({
  children,
  variant = 'glass',
  size = 'md',
  busy,
  className,
  icon,
  ...rest
}: Omit<React.ComponentProps<typeof motion.button>, 'children'> & { children?: React.ReactNode; variant?: 'primary' | 'glass'; size?: 'sm' | 'md' | 'lg'; busy?: boolean; icon?: React.ReactNode }) {
  const h = size === 'lg' ? 'h-14 px-9 text-[17px]' : size === 'sm' ? 'h-10 px-5 text-[14px]' : 'h-12 px-7 text-[15.5px]'
  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.025 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 520, damping: 26 }}
      className={cn('relative inline-flex items-center justify-center gap-2.5 rounded-full font-medium outline-none disabled:pointer-events-none disabled:opacity-45 focus-visible:ring-2 focus-visible:ring-paper/60', h, variant === 'primary' ? 'text-ink' : 'text-paper', className)}
      {...rest}
    >
      <GlassSurface
        shine
        flat
        className="pointer-events-none absolute inset-0"
        tint={variant === 'primary' ? 'linear-gradient(180deg, rgb(255 255 255 / 0.98), rgb(236 235 230 / 0.92))' : undefined}
      />
      <span className="relative z-10 inline-flex items-center gap-2.5">
        {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : icon}
        {children}
      </span>
    </motion.button>
  )
}

/** A line typed out one letter at a time, in the display face. */
export function Typed({ text, className, onDone, speed = 28 }: { text: string; className?: string; onDone?: () => void; speed?: number }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    setN(0)
    let i = 0
    const t = setInterval(() => {
      i++
      setN(i)
      if (i >= text.length) {
        clearInterval(t)
        onDone?.()
      }
    }, speed)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text])
  return (
    <h1 aria-label={text} className={cn('font-display', className)}>
      <span aria-hidden="true">
        {text.slice(0, n)}
        <span className="invisible">{text.slice(n)}</span>
      </span>
    </h1>
  )
}

/** The little messages that rise from the bottom ("Link copied"). */
export function Toasts() {
  const { toasts } = useTrailers()
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-32 z-[120] flex flex-col items-center gap-2">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div key={t.id} initial={{ opacity: 0, y: 24, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.95, transition: { duration: 0.2 } }} transition={{ type: 'spring', stiffness: 420, damping: 30 }}>
            <GlassSurface className="w-fit" inner="px-6 py-3 text-[14.5px] text-paper" flat>
              <span className="relative z-10">{t.text}</span>
            </GlassSurface>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

/** A placeholder light that moves across while something loads. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('relative overflow-hidden bg-white/[0.05]', className)}><div className="absolute inset-0 -translate-x-full animate-[tr-shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-white/[0.07] to-transparent" /></div>
}

/** True on a computer: a wide screen, a mouse. */
export function useDesktop() {
  const [ok, setOk] = useState<boolean | null>(null)
  useEffect(() => {
    const q = matchMedia('(min-width: 1000px) and (hover: hover) and (pointer: fine)')
    const f = () => setOk(q.matches)
    f()
    q.addEventListener('change', f)
    return () => q.removeEventListener('change', f)
  }, [])
  return ok
}
