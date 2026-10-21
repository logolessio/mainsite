'use client'

import { motion, useMotionValue, useReducedMotion, useSpring, useTransform, type MotionValue } from 'framer-motion'
import { createContext, useContext, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

/** True inside a client's page: the shared form pieces (bits.tsx) draw themselves in the heavy grotesk and the small monospace. */
export const StageCtx = createContext(false)
export const useStage = () => useContext(StageCtx)

/** Every client page gets its own colour, always the same one for the same name. */
export function hueFor(slug: string): number {
  let h = 0
  for (let i = 0; i < slug.length; i++) h = (Math.imul(h, 31) + slug.charCodeAt(i)) >>> 0
  return 232 + (h % 104) // indigo through violet to magenta: dark and rich on black, and never a muddle of unrelated colours
}

/** The pointer, as two smooth numbers from -1 to 1, for things that lean towards it. */
export function usePointer() {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, { stiffness: 55, damping: 18, mass: 0.7 })
  const sy = useSpring(y, { stiffness: 55, damping: 18, mass: 0.7 })
  useEffect(() => {
    const move = (e: PointerEvent) => {
      x.set((e.clientX / window.innerWidth - 0.5) * 2)
      y.set((e.clientY / window.innerHeight - 0.5) * 2)
    }
    window.addEventListener('pointermove', move, { passive: true })
    return () => window.removeEventListener('pointermove', move)
  }, [x, y])
  return { x: sx, y: sy }
}

const grain = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .55 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`

/**
 * The background of a client's page: a slow, clean gradient that never stops moving. Four soft colours drift on their own, an aurora ring
 * turns behind them, and the whole thing leans a little towards the pointer and sways as the page scrolls. Quiet grain on top keeps it from
 * banding. Set `hue` and it slides to the new colours.
 */
export function MovingGradient({ hue, pointer, scroll, className }: { hue: number; pointer?: { x: MotionValue<number>; y: MotionValue<number> }; scroll?: MotionValue<number>; className?: string }) {
  const reduced = useReducedMotion()
  const fallbackX = useMotionValue(0)
  const fallbackY = useMotionValue(0)
  const px = pointer?.x ?? fallbackX
  const py = pointer?.y ?? fallbackY
  const sc = useMotionValue(0)
  const s = scroll ?? sc
  // each layer moves by its own amount, so the colours slide past one another instead of as one sheet
  const aX = useTransform(px, (v) => v * -40)
  const aY = useTransform([py, s] as MotionValue<number>[], ([v, y]: number[]) => v * -30 - y * 0.06)
  const bX = useTransform(px, (v) => v * 70)
  const bY = useTransform([py, s] as MotionValue<number>[], ([v, y]: number[]) => v * 50 - y * 0.12)
  const cX = useTransform(px, (v) => v * -90)
  const cY = useTransform([py, s] as MotionValue<number>[], ([v, y]: number[]) => v * -60 - y * 0.2)
  const ring = useTransform(s, (y) => y * 0.03)
  const c = (o: number, sat: number, l: number, a: number) => `hsl(calc(var(--stage-h) + ${o}) ${sat}% ${l}% / ${a})`
  const anim = (name: string, sec: number) => (reduced ? undefined : { animation: `${name} ${sec}s ease-in-out infinite` })
  return (
    <div aria-hidden="true" className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)} style={{ ['--stage-h' as string]: hue }}>
      {/* a deep base, so everything above has something dark to sit on */}
      <div className="absolute inset-0" style={{ background: `radial-gradient(120% 90% at 50% 0%, ${c(0, 60, 14, 1)}, #05050a 70%)` }} />
      <motion.div className="absolute inset-0" style={{ x: aX, y: aY }}>
        <div className="stage-blob -top-[18%] -left-[12%] size-[72vmax]" style={{ background: `radial-gradient(closest-side, ${c(0, 86, 52, 0.6)}, transparent)`, ...anim('stage-drift-a', 34) }} />
      </motion.div>
      <motion.div className="absolute inset-0" style={{ x: bX, y: bY }}>
        <div className="stage-blob -right-[18%] top-[8%] size-[64vmax]" style={{ background: `radial-gradient(closest-side, ${c(26, 90, 54, 0.5)}, transparent)`, ...anim('stage-drift-b', 42) }} />
      </motion.div>
      <motion.div className="absolute inset-0" style={{ x: cX, y: cY }}>
        <div className="stage-blob -bottom-[26%] left-[18%] size-[70vmax]" style={{ background: `radial-gradient(closest-side, ${c(-34, 84, 48, 0.5)}, transparent)`, ...anim('stage-drift-c', 50) }} />
        <div className="stage-blob bottom-[4%] -left-[10%] size-[42vmax]" style={{ background: `radial-gradient(closest-side, ${c(52, 90, 56, 0.34)}, transparent)`, ...anim('stage-drift-b', 58) }} />
      </motion.div>
      {/* a thin ring of light turning very slowly behind it all */}
      <motion.div className="absolute top-1/2 left-1/2 size-[110vmax] -translate-x-1/2 -translate-y-1/2" style={{ rotate: ring }}>
        <div className="size-full rounded-full opacity-[0.22] blur-[60px]" style={{ background: `conic-gradient(from 0deg, ${c(0, 90, 55, 0)}, ${c(40, 95, 60, 0.9)}, ${c(-20, 85, 52, 0)}, ${c(-48, 90, 58, 0.8)}, ${c(0, 90, 55, 0)})`, maskImage: 'radial-gradient(closest-side, transparent 52%, #000 66%, transparent 78%)', WebkitMaskImage: 'radial-gradient(closest-side, transparent 52%, #000 66%, transparent 78%)', ...(reduced ? {} : { animation: 'stage-spin 90s linear infinite' }) }} />
      </motion.div>
      {/* the edges fall away to black, which is what makes the middle glow */}
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 42%, transparent 30%, rgba(3,3,8,0.55) 75%, rgba(3,3,8,0.9) 100%)' }} />
      <div className="absolute inset-0 opacity-[0.07] mix-blend-overlay" style={{ backgroundImage: grain, backgroundSize: '220px 220px' }} />
    </div>
  )
}

/** The page's own kind of button: a round one that leans towards the pointer as it gets close. */
export function Orb({ children, filled, size = 'md', className, ...p }: { children: React.ReactNode; filled?: boolean; size?: 'md' | 'lg'; className?: string } & React.AnchorHTMLAttributes<HTMLAnchorElement> & { href?: string; onClick?: () => void; disabled?: boolean; as?: 'a' | 'button' }) {
  const ref = useRef<HTMLElement>(null)
  const x = useSpring(useMotionValue(0), { stiffness: 220, damping: 16, mass: 0.5 })
  const y = useSpring(useMotionValue(0), { stiffness: 220, damping: 16, mass: 0.5 })
  const { as = p.href ? 'a' : 'button', ...rest } = p
  const dim = size === 'lg' ? 'size-44 md:size-[12.5rem]' : 'size-32 md:size-[9rem]'
  const lean = (e: React.PointerEvent) => {
    const r = ref.current?.getBoundingClientRect()
    if (!r) return
    x.set((e.clientX - (r.left + r.width / 2)) * 0.28)
    y.set((e.clientY - (r.top + r.height / 2)) * 0.28)
  }
  const common = {
    onPointerMove: lean,
    onPointerLeave: () => (x.set(0), y.set(0)),
    style: { x, y },
    whileTap: { scale: 0.94 },
    className: cn('stage-mono group relative grid place-items-center rounded-full text-center text-[11px] leading-snug transition-colors duration-500 md:text-[12px]', dim, filled ? 'bg-paper text-ink hover:bg-white' : 'border border-white/70 text-paper hover:bg-white/10', className),
  }
  const inner = (
    <>
      {filled && <span aria-hidden="true" className="stage-pulse pointer-events-none absolute inset-0 rounded-full border border-white/50" style={{ animation: 'stage-pulse 3.2s ease-out infinite' }} />}
      <span className="relative px-3">{children}</span>
    </>
  )
  return as === 'a' ? (
    <motion.a ref={ref as React.Ref<HTMLAnchorElement>} href={rest.href} {...common}>
      {inner}
    </motion.a>
  ) : (
    <motion.button ref={ref as React.Ref<HTMLButtonElement>} type="button" onClick={rest.onClick} disabled={rest.disabled} {...common}>
      {inner}
    </motion.button>
  )
}
