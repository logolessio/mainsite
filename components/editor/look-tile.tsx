'use client'

import { Check, CloudRain, Cloud, Flame, Film, Flower2, Leaf, PartyPopper, Rocket, Snowflake, Sparkles, Star, Sun, Terminal, Tv, Waves, Wind, Zap, Bug, Circle, Ban } from 'lucide-react'
import { type CSSProperties, memo } from 'react'
import { type BioOverlay, type BioPreset } from '@/lib/bio'
import { cn } from '@/lib/utils'

/** One small mark for each effect. */
export const EFFECT_ICON: Record<BioOverlay, typeof Flame> = {
  none: Ban,
  snow: Snowflake,
  rain: CloudRain,
  embers: Flame,
  sparkle: Sparkles,
  stars: Star,
  aurora: Wind,
  fireflies: Bug,
  petals: Flower2,
  bubbles: Circle,
  lightning: Zap,
  smoke: Cloud,
  leaves: Leaf,
  confetti: PartyPopper,
  fireworks: Rocket,
  rays: Sun,
  caustics: Waves,
  code: Terminal,
  film: Film,
  vhs: Tv,
}

const dots = (color: string, n: number, seed: number, r = 1.6) =>
  Array.from({ length: n }, (_, i) => {
    const x = (i * 37 + seed * 11) % 100
    const y = (i * 53 + seed * 7) % 100
    return `radial-gradient(circle at ${x}% ${y}%, ${color} ${r}px, transparent ${r + 0.8}px)`
  }).join(',')

/** A still hint of what an effect looks like, drawn with gradients only (nothing runs, so a long list of these costs nothing). */
export function fxBackdrop(effect: BioOverlay, a: string, b: string): CSSProperties {
  switch (effect) {
    case 'none':
      return {}
    case 'rain':
      return { backgroundImage: `repeating-linear-gradient(105deg, ${a}66 0 1px, transparent 1px 9px)`, maskImage: 'linear-gradient(#000 40%, transparent)' }
    case 'smoke':
    case 'aurora':
    case 'rays':
    case 'caustics':
      return { backgroundImage: `radial-gradient(60% 40% at 25% 70%, ${a}55, transparent 70%), radial-gradient(55% 45% at 78% 35%, ${b}44, transparent 70%)` }
    case 'code':
      return { backgroundImage: `repeating-linear-gradient(90deg, ${a}88 0 2px, transparent 2px 8px)`, maskImage: 'linear-gradient(transparent, #000 60%, transparent)' }
    case 'vhs':
    case 'film':
      return { backgroundImage: `repeating-linear-gradient(0deg, ${a}33 0 1px, transparent 1px 4px)` }
    case 'embers':
    case 'fireflies':
    case 'sparkle':
      return { backgroundImage: `${dots(b, 8, 3, 1.4)}, ${dots(a, 10, 5, 1.8)}` }
    case 'lightning':
      return { backgroundImage: `linear-gradient(120deg, transparent 45%, ${a}88 49%, transparent 53%), radial-gradient(50% 40% at 50% 10%, ${b}33, transparent 70%)` }
    default:
      return { backgroundImage: `${dots(a, 11, 4, 1.8)}, ${dots(b, 7, 9, 1.3)}` }
  }
}

const rgb = (hex: string, a: number) => {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.replace(/(.)/g, '$1$1') : h, 16)
  return `rgb(${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255} / ${a})`
}

/** A look as a picture of the page it makes: its own background, a card with a picture, a name, icons and a link, and a hint of its effect. */
export const LookTile = memo(function LookTile({ p, on, onClick, name = 'you' }: { p: BioPreset; on?: boolean; onClick: () => void; name?: string }) {
  const [bg, bg2, a, b] = p.hues
  const c = p.set.colors as { text?: string } | undefined
  const text = c?.text ?? '#f5f5f7'
  const Icon = EFFECT_ICON[p.effect]
  return (
    <button type="button" onClick={onClick} aria-pressed={on} title={p.note} className="group block w-full text-left">
      <span
        className={cn('relative block aspect-[4/5] overflow-hidden rounded-2xl border transition-[transform,border-color,box-shadow] duration-200 group-hover:-translate-y-0.5 group-hover:shadow-[0_18px_40px_-18px_rgb(0_0_0/0.9)]', on ? 'border-white' : 'border-[var(--ed-line)] group-hover:border-white/40')}
        style={{ background: `radial-gradient(120% 90% at 50% 18%, ${bg2} 0%, ${bg} 72%)` }}
      >
        <span aria-hidden="true" className="absolute inset-0" style={fxBackdrop(p.effect, a, b)} />
        <span className="absolute inset-x-[13%] top-[19%] bottom-[15%] flex flex-col items-center rounded-[14px] border px-3 pt-[9%]" style={{ background: rgb(bg, 0.6), borderColor: rgb(text, 0.14), boxShadow: '0 18px 30px -14px rgb(0 0 0 / 0.7)' }}>
          <span className="aspect-square w-[26%] rounded-full" style={{ background: `linear-gradient(135deg, ${a}, ${b})`, boxShadow: `0 0 0 3px ${rgb(text, 0.08)}, 0 6px 16px -4px ${rgb(a, 0.6)}` }} />
          <span className="mt-[7%] max-w-full truncate text-[0.74rem] leading-none font-semibold" style={{ color: text, textShadow: `0 0 10px ${rgb(a, 0.7)}` }}>
            {name}
          </span>
          <span className="mt-[6%] block h-[3px] w-[58%] rounded-full" style={{ background: rgb(text, 0.3) }} />
          <span className="mt-[3.5%] block h-[3px] w-[40%] rounded-full" style={{ background: rgb(text, 0.18) }} />
          <span className="mt-[8%] flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <span key={i} className="block size-[0.55rem] rounded-full" style={{ background: text, opacity: 0.85, boxShadow: `0 0 6px ${rgb(a, 0.8)}` }} />
            ))}
          </span>
          <span className="mt-auto mb-[8%] block h-[0.9rem] w-full rounded-full border" style={{ background: rgb(text, 0.07), borderColor: rgb(a, 0.4) }} />
        </span>
        {p.effect !== 'none' && (
          <span className="absolute top-2 left-2 grid size-6 place-items-center rounded-full" style={{ background: 'rgb(0 0 0 / 0.45)', color: '#fff' }}>
            <Icon className="size-3.5" strokeWidth={1.8} />
          </span>
        )}
        {on && (
          <span className="absolute top-2 right-2 grid size-5 place-items-center rounded-full bg-white text-black">
            <Check className="size-3" strokeWidth={3} />
          </span>
        )}
      </span>
      <span className="mt-2 block truncate text-[0.78rem] text-white">{p.name}</span>
      <span className="block truncate text-[0.68rem] text-[var(--ed-dim)]">{p.note}</span>
    </button>
  )
}, (a, b) => a.p === b.p && a.on === b.on && a.name === b.name)

/** An effect as a tile: its mark, its name, and a still hint of it on black. */
export function EffectTile({ id, name, on, onClick }: { id: BioOverlay; name: string; on: boolean; onClick: () => void }) {
  const Icon = EFFECT_ICON[id]
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cn('group relative flex aspect-[1/0.82] flex-col items-center justify-end overflow-hidden rounded-xl border px-1 pb-2 text-[0.72rem] transition-[transform,border-color,background] duration-200 hover:-translate-y-px', on ? 'border-white bg-white/[0.09] text-white' : 'border-[var(--ed-line)] bg-white/[0.02] text-white/70 hover:border-white/35 hover:text-white')}
    >
      <span aria-hidden="true" className="absolute inset-0 opacity-70" style={fxBackdrop(id, '#ffffff', '#9a9a9a')} />
      <Icon className="relative mb-1.5 size-[1.15rem]" strokeWidth={1.6} />
      <span className="relative">{name}</span>
    </button>
  )
}
