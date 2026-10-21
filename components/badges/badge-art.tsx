'use client'

import { BadgeCheck, Calendar, CalendarCheck, CircleDollarSign, Clapperboard, Crown, Droplet, Eye, Film, Flame, Gem, Heart, Image as ImageIcon, Layers, Link2, type LucideIcon, Medal, Megaphone, Palette, PenLine, Radio, Rocket, ShieldCheck, Sparkles, Star, Trophy, Type, Zap } from 'lucide-react'
import { useId } from 'react'
import type { BadgeDef, Rarity } from '@/lib/badges-defs'
import { cn } from '@/lib/utils'

/**
 * Badges, drawn like struck metal in black and white. Every badge is one medallion with a line symbol in the middle; how rare it is shows in
 * how the medallion is made, not in a colour: a plain rim (common), a milled edge (rare), a milled edge over an engraved rosette (epic), and a
 * sunburst edge with a double rosette and a halo (legendary). Locked ones are the same medallion, unlit. It is all vector, so it stays
 * sharp from 16 pixels to 240, and the finest detail drops away at small sizes instead of turning to mush.
 */

const ICONS: Record<string, LucideIcon> = {
  Clapperboard, Film, Layers, Flame, BadgeCheck, Medal, Eye, Radio, Crown, CircleDollarSign, Gem, Image: ImageIcon, Palette, Droplet, Type, PenLine, Link2, Heart, Star, Calendar, CalendarCheck, Sparkles, Megaphone, Trophy, Rocket, Zap, ShieldCheck,
}

const RIM: Record<Rarity, [number, string][]> = {
  common: [[0, '#dcdce1'], [0.5, '#8c8c94'], [1, '#48484e']],
  rare: [[0, '#f4f4f7'], [0.42, '#9d9da5'], [0.72, '#54545b'], [1, '#c9c9d0']],
  epic: [[0, '#ffffff'], [0.34, '#b6b6be'], [0.64, '#5a5a61'], [1, '#e6e6ec']],
  legendary: [[0, '#ffffff'], [0.3, '#dadae0'], [0.6, '#7b7b83'], [1, '#ffffff']],
}
const TICKS: Record<Rarity, number> = { common: 0, rare: 72, epic: 96, legendary: 120 }

const polar = (r: number, deg: number) => [50 + r * Math.cos(((deg - 90) * Math.PI) / 180), 50 + r * Math.sin(((deg - 90) * Math.PI) / 180)] as const
const ticks = (n: number, r1: number, r2: number) =>
  Array.from({ length: n }, (_, i) => {
    const [x1, y1] = polar(r1, (i * 360) / n)
    const [x2, y2] = polar(r2, (i * 360) / n)
    return `M${x1.toFixed(2)} ${y1.toFixed(2)}L${x2.toFixed(2)} ${y2.toFixed(2)}`
  }).join('')
const sunburst = (n: number, rOut: number, rIn: number) =>
  `M${Array.from({ length: n * 2 }, (_, i) => polar(i % 2 === 0 ? rOut : rIn, (i * 180) / n).map((v) => v.toFixed(2)).join(' ')).join('L')}Z`

/**
 * `fluid` makes it fill whatever holds it (as a square) instead of being a fixed number of pixels; `size` is then only how much detail
 * to draw, so give it roughly the size it will end up at.
 */
export function BadgeArt({ badge, size = 40, locked = false, animated = false, fluid = false, className }: { badge: BadgeDef; size?: number; locked?: boolean; animated?: boolean; fluid?: boolean; className?: string }) {
  const uid = useId().replace(/:/g, '')
  const r = badge.rarity
  const Glyph = ICONS[badge.icon] ?? Star
  const fine = size >= 44 // milling and the rosette only show up from here
  const rich = size >= 80 // the second rosette, the halo
  const rim = RIM[r]
  const stroke = size >= 140 ? 1.5 : size >= 72 ? 1.7 : size >= 40 ? 1.9 : 2.3
  const gs = Math.round(size * (size < 28 ? 0.5 : 0.4))

  return (
    <span className={cn('relative inline-block shrink-0 align-middle', fluid && 'block aspect-square w-full', className)} style={fluid ? undefined : { width: size, height: size }}>
      <svg viewBox="0 0 100 100" width={fluid ? '100%' : size} height={fluid ? '100%' : size} aria-hidden="true" className="absolute inset-0" style={size >= 56 && !locked ? { filter: 'drop-shadow(0 8px 14px rgb(0 0 0 / 0.55))' } : undefined}>
        <defs>
          <linearGradient id={`${uid}r`} x1="0.1" y1="0" x2="0.9" y2="1">
            {(locked ? ([[0, '#4a4a51'], [1, '#26262b']] as [number, string][]) : rim).map(([o, c]) => (
              <stop key={o} offset={o} stopColor={c} />
            ))}
          </linearGradient>
          <radialGradient id={`${uid}d`} cx="0.32" cy="0.2" r="1">
            <stop offset="0" stopColor={locked ? '#18181b' : '#3a3a40'} />
            <stop offset="0.5" stopColor={locked ? '#0f0f11' : '#18181b'} />
            <stop offset="1" stopColor={locked ? '#08080a' : '#060607'} />
          </radialGradient>
          <linearGradient id={`${uid}s`} x1="0" y1="0" x2="0.7" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity={locked ? 0.05 : 0.42} />
            <stop offset="0.55" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <radialGradient id={`${uid}h`} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0.7" stopColor="#fff" stopOpacity="0.2" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          <clipPath id={`${uid}c`}>
            <circle cx="50" cy="50" r="42" />
          </clipPath>
        </defs>

        {r === 'legendary' && !locked && rich && <circle cx="50" cy="50" r="50" fill={`url(#${uid}h)`} />}
        {r === 'legendary' && <path d={sunburst(36, 49, 45.4)} fill={`url(#${uid}r)`} opacity={locked ? 0.7 : 1} />}
        {/* the rim */}
        <circle cx="50" cy="50" r="44.4" fill="none" stroke={`url(#${uid}r)`} strokeWidth="3.6" />
        <circle cx="50" cy="50" r="46.3" fill="none" stroke="#fff" strokeOpacity={locked ? 0.1 : 0.28} strokeWidth="0.6" />
        <circle cx="50" cy="50" r="42.4" fill="none" stroke="#000" strokeOpacity="0.55" strokeWidth="0.8" />
        {/* the face */}
        <circle cx="50" cy="50" r="42" fill={`url(#${uid}d)`} />
        {TICKS[r] > 0 && fine && <path d={ticks(TICKS[r], 38.6, 41.2)} stroke="#fff" strokeOpacity={locked ? 0.1 : 0.34} strokeWidth="0.55" />}
        <circle cx="50" cy="50" r={TICKS[r] > 0 && fine ? 36.4 : 38} fill="none" stroke="#fff" strokeOpacity={locked ? 0.07 : 0.2} strokeWidth="0.6" />
        {(r === 'epic' || r === 'legendary') && fine && !locked && (
          <g clipPath={`url(#${uid}c)`} fill="none" stroke="#fff" strokeOpacity="0.11" strokeWidth="0.55">
            {Array.from({ length: 12 }, (_, i) => (
              <ellipse key={i} cx="50" cy="50" rx="25" ry="9.5" transform={`rotate(${i * 15} 50 50)`} />
            ))}
            {r === 'legendary' && rich && Array.from({ length: 12 }, (_, i) => <ellipse key={`b${i}`} cx="50" cy="50" rx="31" ry="5" transform={`rotate(${i * 15 + 7.5} 50 50)`} strokeOpacity="0.08" />)}
            <circle cx="50" cy="50" r="20" />
          </g>
        )}
        {/* light caught on the top left of the face */}
        <g clipPath={`url(#${uid}c)`}>
          <ellipse cx="34" cy="24" rx="34" ry="19" transform="rotate(-24 34 24)" fill={`url(#${uid}s)`} />
          {animated && !locked && <rect x="-30" y="-10" width="22" height="120" fill="#fff" opacity="0.2" transform="rotate(22 50 50)" className="badge-sweep" />}
        </g>
        {r === 'legendary' && !locked && <path d="m80 18 1.3 3.5 3.5 1.3-3.5 1.3L80 27.6 78.7 24.1 75.2 22.8l3.5-1.3Z" fill="#fff" />}
        {locked && (
          <g transform="translate(66 66)">
            <circle cx="12" cy="12" r="12" fill="#0b0b0d" stroke="#3a3a41" strokeWidth="1.2" />
            <rect x="7.2" y="11.4" width="9.6" height="7" rx="1.8" fill="#8e8e98" />
            <path d="M9.2 11.4V9.6a2.8 2.8 0 0 1 5.6 0v1.8" fill="none" stroke="#8e8e98" strokeWidth="1.5" strokeLinecap="round" />
          </g>
        )}
      </svg>
      <span aria-hidden="true" className="absolute inset-0 grid place-items-center" style={{ opacity: locked ? 0.3 : 1 }}>
        <Glyph width={fluid ? '40%' : gs} height={fluid ? '40%' : gs} strokeWidth={stroke} color="#f3f2ee" style={size >= 40 && !locked ? { filter: 'drop-shadow(0 1px 3px rgb(0 0 0 / 0.7))' } : undefined} />
      </span>
      <span className="sr-only">{badge.name}</span>
    </span>
  )
}

/** Colour is gone: how rare a badge is shows in the brightness of its words and rings, as well as in its construction. */
export const RARITY_STYLE: Record<Rarity, { label: string; text: string; ring: string; glow: string }> = {
  common: { label: 'Common', text: 'text-[#8f8f98]', ring: 'border-[#8f8f98]/30', glow: 'rgb(143 143 152 / 0.14)' },
  rare: { label: 'Rare', text: 'text-[#bcbcc4]', ring: 'border-[#bcbcc4]/40', glow: 'rgb(188 188 196 / 0.16)' },
  epic: { label: 'Epic', text: 'text-[#e8e8ee]', ring: 'border-[#e8e8ee]/50', glow: 'rgb(232 232 238 / 0.2)' },
  legendary: { label: 'Legendary', text: 'text-white', ring: 'border-white/70', glow: 'rgb(255 255 255 / 0.3)' },
}
