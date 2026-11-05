'use client'

import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { Crown, Eye, Hash, MapPin, Sparkles } from 'lucide-react'
import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { useBio } from './context'

/** The panel the profile sits in: frosted glass that leans towards the pointer, with a soft light that slides over it. */
export function GlassCard({ children, className, always = false, radius }: { children: ReactNode; className?: string; /** show the frosted panel even when the page's panel is set to none */ always?: boolean; radius?: string }) {
  const { cfg, reduced, mode, level } = useBio()
  const ref = useRef<HTMLDivElement>(null)
  const rx = useMotionValue(0)
  const ry = useMotionValue(0)
  const gx = useMotionValue(50)
  const gy = useMotionValue(30)
  const on = cfg.fx.tilt && !reduced && mode !== 'mini'
  const spring = { stiffness: 160, damping: 20, mass: 0.5 }
  const srx = useSpring(rx, spring)
  const sry = useSpring(ry, spring)
  const glare = useMotionTemplate`radial-gradient(520px circle at ${gx}% ${gy}%, rgb(var(--bio-fg-rgb) / 0.16), transparent 55%)`
  const edge = useMotionTemplate`radial-gradient(260px circle at ${gx}% ${gy}%, rgb(var(--bio-fg-rgb) / 0.55), transparent 70%)`
  const pulse = useTransform(level, (v) => 1 + v * 0.012)
  const move = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return
    const r = ref.current?.getBoundingClientRect()
    if (!r) return
    const nx = (e.clientX - r.left) / r.width
    const ny = (e.clientY - r.top) / r.height
    gx.set(nx * 100)
    gy.set(ny * 100)
    if (on) {
      ry.set((nx - 0.5) * 9)
      rx.set(-(ny - 0.5) * 9)
    }
  }
  const leave = () => {
    rx.set(0)
    ry.set(0)
    gx.set(50)
    gy.set(30)
  }
  const unset = always && cfg.card.style === 'none'
  const c = unset ? { ...cfg.card, style: 'glass' as const } : cfg.card
  const plate: CSSProperties = unset
    ? {
        // no panel chosen: a dark (or light) card in the page's own tone, see-through enough for the background to glow round it
        background: 'color-mix(in srgb, var(--bio-bg) 76%, transparent)',
        border: '1px solid var(--bio-line)',
        backdropFilter: `blur(${Math.max(12, c.blur)}px) saturate(1.4)`,
        WebkitBackdropFilter: `blur(${Math.max(12, c.blur)}px) saturate(1.4)`,
        boxShadow: '0 40px 100px rgb(0 0 0 / 0.5), inset 0 1px 0 rgb(var(--bio-fg-rgb) / 0.1)',
      }
    : c.style === 'none'
      ? {}
      : c.style === 'outline'
        ? { border: '1px solid var(--bio-line)' }
        : c.style === 'solid'
          ? { background: `rgb(var(--bio-fg-rgb) / ${0.06 + (c.opacity / 100) * 0.12})`, border: '1px solid var(--bio-line)', boxShadow: '0 40px 120px rgb(0 0 0 / 0.45)' }
          : {
              background: `rgb(var(--bio-fg-rgb) / ${(c.opacity / 100) * 0.1})`,
              border: '1px solid var(--bio-line)',
              backdropFilter: `blur(${c.blur}px) saturate(1.5)`,
              WebkitBackdropFilter: `blur(${c.blur}px) saturate(1.5)`,
              boxShadow: '0 40px 120px rgb(0 0 0 / 0.4), inset 0 1px 0 rgb(var(--bio-fg-rgb) / 0.12)',
            }
  return (
    <motion.div ref={ref} onPointerMove={move} onPointerLeave={leave} className={cn('relative', className)} style={{ ...plate, rotateX: srx, rotateY: sry, scale: pulse, transformPerspective: 1100, borderRadius: radius ?? 'calc(var(--bio-r) * 1.7)' }}>
      {c.glare && c.style !== 'none' && !reduced && mode !== 'mini' && (
        <>
          <motion.span aria-hidden="true" className="pointer-events-none absolute inset-0 z-0" style={{ background: glare, borderRadius: 'inherit' }} />
          <motion.span aria-hidden="true" className="pointer-events-none absolute inset-0 z-0" style={{ background: edge, borderRadius: 'inherit', padding: 1, WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)', WebkitMaskComposite: 'xor', mask: 'linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0)' }} />
        </>
      )}
      <div className="relative z-10">{children}</div>
    </motion.div>
  )
}

/** The small marks beside a name: the account number, OG, founding member, where they are. */
export function Badges({ className, center = true }: { className?: string; center?: boolean }) {
  const { data, cfg } = useBio()
  const list = cfg.meta.badges ? data.badges ?? [] : []
  const where = cfg.meta.location
  if (!list.length && !where) return null
  const icon = (id: string) => (id === 'uid' ? <Hash className="size-3" strokeWidth={2} /> : id === 'og' ? <Crown className="size-3" strokeWidth={1.8} /> : <Sparkles className="size-3" strokeWidth={1.8} />)
  return (
    <ul data-in style={{ '--i': 2 } as CSSProperties} className={cn('flex flex-wrap gap-1.5', center ? 'justify-center' : 'justify-start', className)}>
      {list.map((b) => (
        <li key={b.id} title={b.hint} className="inline-flex h-6 items-center gap-1 rounded-[var(--bio-r)] border border-[var(--bio-line)] bg-[var(--bio-soft)] px-2.5 text-[0.7rem] font-medium tracking-[0.02em] text-[var(--bio-fg)]">
          {icon(b.id)}
          {b.label}
        </li>
      ))}
      {where && (
        <li className="inline-flex h-6 items-center gap-1 rounded-[var(--bio-r)] border border-[var(--bio-line)] px-2.5 text-[0.7rem] text-[var(--bio-mute)]">
          <MapPin className="size-3" strokeWidth={1.8} />
          {where}
        </li>
      )}
    </ul>
  )
}

/** The bio, typed out a letter at a time once the page is entered. */
export function Typewriter({ text, className }: { text: string; className?: string }) {
  const { entered, reduced } = useBio()
  const [n, setN] = useState(reduced ? text.length : 0)
  useEffect(() => {
    if (reduced) return setN(text.length)
    if (!entered) return setN(0)
    let i = 0
    setN(0)
    const id = window.setInterval(() => {
      i++
      setN(i)
      if (i >= text.length) window.clearInterval(id)
    }, 28)
    return () => window.clearInterval(id)
  }, [text, entered, reduced])
  return (
    <p className={className} aria-label={text}>
      <span aria-hidden="true">{text.slice(0, n)}</span>
      {n < text.length && <span aria-hidden="true" style={{ animation: 'bio-blink 0.9s steps(1) infinite' }}>▍</span>}
    </p>
  )
}

export function ViewCount({ className }: { className?: string }) {
  const { data } = useBio()
  if (data.views === null) return null
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <Eye className="size-3.5" strokeWidth={1.6} />
      {data.views.toLocaleString('en-US')}
    </span>
  )
}
