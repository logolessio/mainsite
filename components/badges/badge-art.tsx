'use client'

import { useId, type ReactNode } from 'react'
import type { BadgeDef, Rarity } from '@/lib/badges-defs'
import { cn } from '@/lib/utils'

/**
 * Badges in the spirit of the ones beside a name on Discord: one clear silhouette, one bold symbol, a little depth.
 * The outline says how rare it is (a bronze ring, a silver hexagon, an amethyst shield, a gold seal), the body colour and the
 * symbol say which badge it is. Everything is flat vector with soft gradients, so it stays sharp from 18 pixels to 240.
 */

/** Each badge has its own hue, so a row of them is easy to tell apart at a glance. */
const HUE: Record<string, number> = {
  'first-clip': 24, 'clip-10': 196, 'clip-50': 262, 'clip-250': 8,
  'first-approved': 146, 'approved-25': 172, 'views-1k': 208, 'views-100k': 322, 'views-1m': 44,
  'first-earn': 42, 'earn-1k': 292, banner: 220, palette: 338, accent: 190, typeface: 250, bio: 18,
  linked: 156, collector: 350, showcase: 46, week: 100, month: 234, founding: 40, launched: 2, completionist: 280,
  'views-10m': 268, 'earn-10k': 152, 'clip-1000': 46, year: 196, team: 350,
}

/** Everything is black, white and grey except the legendary badges, which keep their gold rim and their own colour. */
const RIM: Record<Rarity, [string, string]> = {
  common: ['#cfcfd6', '#5c5c65'],
  rare: ['#ededf1', '#8a8a95'],
  epic: ['#ffffff', '#b4b4be'],
  legendary: ['#fff6c2', '#d58f14'],
}

/** The outline of each rarity, in a 64 by 64 box. */
function outline(r: Rarity): string {
  if (r === 'common') return 'M32 2a30 30 0 1 0 0 60a30 30 0 1 0 0-60Z'
  if (r === 'rare') return 'M32 1.5 58.8 17v30L32 62.5 5.2 47V17Z'
  if (r === 'epic') return 'M32 2 58 11.5V32c0 15-11 25.5-26 30C17 57.5 6 47 6 32V11.5Z'
  // a twelve point seal
  const pts: string[] = []
  for (let i = 0; i < 24; i++) {
    const a = ((i * 15 - 90) * Math.PI) / 180
    const rad = i % 2 === 0 ? 31 : 27
    pts.push(`${(32 + rad * Math.cos(a)).toFixed(2)} ${(32 + rad * Math.sin(a)).toFixed(2)}`)
  }
  return `M${pts.join('L')}Z`
}
const SCALE: Record<Rarity, number> = { common: 0.83, rare: 0.82, epic: 0.8, legendary: 0.8 }

const W = '#fff'
type G = { ink: string }
const stroke = { fill: 'none', stroke: W, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

/** The symbol for each badge, drawn in a 24 by 24 box with plain shapes. `ink` is the dark tone cut out of the white. */
const GLYPH: Record<string, (g: G) => ReactNode> = {
  'first-clip': ({ ink }) => (
    <g>
      <rect x="3" y="10" width="18" height="11" rx="2.2" fill={W} />
      <g transform="rotate(-9 3 9)">
        <rect x="3" y="4.6" width="18" height="4.6" rx="1.4" fill={W} />
        <path d="M7.6 4.6 5.8 9.2M12.4 4.6 10.6 9.2M17.2 4.6 15.4 9.2" stroke={ink} strokeWidth="1.5" />
      </g>
    </g>
  ),
  'clip-10': ({ ink }) => (
    <g>
      <rect x="2.5" y="5" width="19" height="14" rx="2.6" fill={W} />
      {[5, 9.2, 13.4, 17.6].map((x) => (
        <g key={x}>
          <rect x={x} y="6.4" width="1.7" height="1.6" rx=".5" fill={ink} />
          <rect x={x} y="16" width="1.7" height="1.6" rx=".5" fill={ink} />
        </g>
      ))}
      <rect x="6.6" y="9.6" width="10.8" height="4.8" rx="1.2" fill={ink} />
    </g>
  ),
  'clip-50': () => (
    <g>
      <path d="M12 2.8 22 8 12 13.2 2 8Z" fill={W} />
      <path d="M2.8 12.2 12 17l9.2-4.8" {...stroke} strokeWidth="2.4" />
      <path d="M2.8 16.4 12 21.2l9.2-4.8" {...stroke} strokeWidth="2.4" />
    </g>
  ),
  'clip-250': ({ ink }) => (
    <g>
      <path d="M12 2.2c.7 3.4 5.4 5.8 5.4 10.8A5.4 5.4 0 0 1 12 18.6 5.4 5.4 0 0 1 6.6 13c0-2.4 1-4.2 2.5-5.6.2 1.7 1 2.7 2.1 3.3C10.8 8.2 10.7 4.9 12 2.2Z" fill={W} />
      <path d="M12 21.8a3.3 3.3 0 0 1-3.3-3.3c0-1.3 1-2.4 3.3-4.3 2.3 1.9 3.3 3 3.3 4.3a3.3 3.3 0 0 1-3.3 3.3Z" fill={W} />
      <path d="M12 19.8a1.5 1.5 0 0 1-1.5-1.5c0-.6.5-1.2 1.5-2 1 .8 1.5 1.4 1.5 2a1.5 1.5 0 0 1-1.5 1.5Z" fill={ink} />
    </g>
  ),
  'first-approved': () => <path d="m5 12.8 4.6 4.6L19.2 7" {...stroke} strokeWidth="3.6" />,
  'approved-25': ({ ink }) => (
    <g>
      <path d="m8 2.5 4 7.2M16 2.5l-4 7.2" {...stroke} strokeWidth="2.6" />
      <circle cx="12" cy="15" r="6.6" fill={W} />
      <path d="m12 11.4.9 2.1 2.3.2-1.7 1.5.5 2.3-2-1.2-2 1.2.5-2.3-1.7-1.5 2.3-.2Z" fill={ink} />
    </g>
  ),
  'views-1k': ({ ink }) => (
    <g>
      <path d="M1.8 12C4.3 7.2 8 5 12 5s7.7 2.2 10.2 7c-2.5 4.8-6.2 7-10.2 7S4.3 16.8 1.8 12Z" fill={W} />
      <circle cx="12" cy="12" r="4.2" fill={ink} />
      <circle cx="13.2" cy="10.8" r="1.4" fill={W} />
    </g>
  ),
  'views-100k': () => (
    <g>
      <circle cx="12" cy="12" r="2.6" fill={W} />
      <path d="M8 8a5.6 5.6 0 0 0 0 8M16 8a5.6 5.6 0 0 1 0 8M5 5a9.8 9.8 0 0 0 0 14M19 5a9.8 9.8 0 0 1 0 14" {...stroke} strokeWidth="2.2" />
    </g>
  ),
  'views-1m': ({ ink }) => (
    <g>
      <path d="m3 8 4.6 4.6L12 5l4.4 7.6L21 8l-2 11H5Z" fill={W} stroke={W} strokeWidth="1.6" strokeLinejoin="round" />
      <rect x="5.6" y="16.6" width="12.8" height="1.8" rx=".9" fill={ink} />
    </g>
  ),
  'first-earn': ({ ink }) => (
    <g>
      <circle cx="12" cy="12" r="9.6" fill={W} />
      <path d="M14.8 8.8c-.4-1.1-1.5-1.6-2.8-1.6-1.6 0-2.8.8-2.8 2.1 0 3 5.8 1.7 5.8 4.8 0 1.4-1.4 2.2-3 2.2-1.5 0-2.7-.7-3.1-1.9M12 5.6v1.6M12 16.8v1.6" fill="none" stroke={ink} strokeWidth="1.8" strokeLinecap="round" />
    </g>
  ),
  'earn-1k': ({ ink }) => (
    <g>
      <path d="M6.2 3h11.6l4.2 6L12 21 2 9Z" fill={W} stroke={W} strokeWidth="1" strokeLinejoin="round" />
      <path d="M2 9h20M8.4 3 6.8 9 12 21 17.2 9 15.6 3" fill="none" stroke={ink} strokeWidth="1.3" strokeLinejoin="round" opacity=".42" />
    </g>
  ),
  banner: ({ ink }) => (
    <g>
      <rect x="2.5" y="4.5" width="19" height="15" rx="2.8" fill={W} />
      <circle cx="16.6" cy="9.4" r="2" fill={ink} />
      <path d="m4.6 18 4.9-6.4 3.5 4.4 2.4-2.8L19.4 18Z" fill={ink} />
    </g>
  ),
  palette: ({ ink }) => (
    <g>
      <path d="M12 2.5C6.5 2.5 2.5 6.5 2.5 11.5S6.5 21.5 11 21.5c1.4 0 2-.9 2-1.9 0-1.4-1.3-1.6-1.3-3 0-1.1.9-1.9 2-1.9h2.6c2.7 0 5.2-2 5.2-5 0-4.1-4.4-7.2-9.5-7.2Z" fill={W} />
      <circle cx="7.3" cy="10.8" r="1.5" fill={ink} />
      <circle cx="10.3" cy="7" r="1.5" fill={ink} />
      <circle cx="15.3" cy="7" r="1.5" fill={ink} />
      <circle cx="18" cy="10.4" r="1.5" fill={ink} />
    </g>
  ),
  accent: ({ ink }) => (
    <g>
      <path d="M12 2.4S5.2 10 5.2 14.8a6.8 6.8 0 0 0 13.6 0C18.8 10 12 2.4 12 2.4Z" fill={W} />
      <path d="M8.8 15a3.4 3.4 0 0 0 2.6 3.3" fill="none" stroke={ink} strokeWidth="1.7" strokeLinecap="round" opacity=".5" />
    </g>
  ),
  typeface: () => (
    <g fill={W}>
      <rect x="3.6" y="4" width="16.8" height="4.2" rx="1.6" />
      <rect x="9.9" y="4" width="4.2" height="16.6" rx="1.6" />
    </g>
  ),
  bio: ({ ink }) => (
    <g>
      <path d="m16.2 3.6 4.2 4.2L8.6 19.6 3.2 20.8l1.2-5.4Z" fill={W} />
      <path d="m14 5.8 4.2 4.2" stroke={ink} strokeWidth="1.7" strokeLinecap="round" opacity=".5" />
    </g>
  ),
  linked: () => (
    <g transform="rotate(-45 12 12)" {...stroke} strokeWidth="2.4">
      <rect x="1.6" y="8.4" width="12.2" height="7.2" rx="3.6" />
      <rect x="10.2" y="8.4" width="12.2" height="7.2" rx="3.6" />
    </g>
  ),
  collector: () => <path d="M12 21.2S3.4 15.8 3.4 9.8A4.8 4.8 0 0 1 12 7.2a4.8 4.8 0 0 1 8.6 2.6c0 6-8.6 11.4-8.6 11.4Z" fill={W} />,
  showcase: () => <path d="m12 2 2.9 6.6 7.1.7-5.4 4.7 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 9.3l7.1-.7Z" fill={W} stroke={W} strokeWidth="1.2" strokeLinejoin="round" />,
  week: ({ ink }) => (
    <g>
      <rect x="3" y="5" width="18" height="16" rx="3.2" fill={W} />
      <rect x="6.8" y="2.6" width="2.2" height="5" rx="1.1" fill={W} />
      <rect x="15" y="2.6" width="2.2" height="5" rx="1.1" fill={W} />
      <path d="M3 10h18" stroke={ink} strokeWidth="1.4" opacity=".4" />
      <path d="M9.8 12.8h4.6l-2.6 6" fill="none" stroke={ink} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  ),
  month: ({ ink }) => (
    <g>
      <rect x="3" y="5" width="18" height="16" rx="3.2" fill={W} />
      <rect x="6.8" y="2.6" width="2.2" height="5" rx="1.1" fill={W} />
      <rect x="15" y="2.6" width="2.2" height="5" rx="1.1" fill={W} />
      <path d="M3 10h18" stroke={ink} strokeWidth="1.4" opacity=".4" />
      <path d="m8.6 15.2 2.5 2.5 4.5-4.8" fill="none" stroke={ink} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  ),
  founding: () => (
    <g fill={W}>
      <path d="m10.5 3.8 2.2 6.7 6.8 2.2-6.8 2.2-2.2 6.7-2.2-6.7-6.8-2.2 6.8-2.2Z" />
      <path d="m19 2.4.9 2.7 2.7.9-2.7.9-.9 2.7-.9-2.7-2.7-.9 2.7-.9Z" />
      <path d="m19.4 15.4.6 1.8 1.8.6-1.8.6-.6 1.8-.6-1.8-1.8-.6 1.8-.6Z" />
    </g>
  ),
  launched: () => (
    <g>
      <path d="M3 10v4a1.6 1.6 0 0 0 1.6 1.6H7l5.6 4V4.4L7 8.4H4.6A1.6 1.6 0 0 0 3 10Z" fill={W} />
      <path d="M16 8.6a5 5 0 0 1 0 6.8M19.2 5.6a9.4 9.4 0 0 1 0 12.8" {...stroke} strokeWidth="2.2" />
    </g>
  ),
  completionist: () => (
    <g>
      <path d="M7 3.4h10V10a5 5 0 0 1-10 0Z" fill={W} />
      <path d="M7 5.6H4.2c0 3 1.4 4.8 3.6 5.2M17 5.6h2.8c0 3-1.4 4.8-3.6 5.2" {...stroke} strokeWidth="2" />
      <rect x="10.9" y="14.6" width="2.2" height="3.4" fill={W} />
      <rect x="7.6" y="17.8" width="8.8" height="3" rx="1.2" fill={W} />
    </g>
  ),
  'views-10m': ({ ink }) => (
    <g>
      <path d="M12 2.4c3.1 2.4 4.7 5.9 4.7 9.8l-2 3.4H9.3l-2-3.4c0-3.9 1.6-7.4 4.7-9.8Z" fill={W} />
      <circle cx="12" cy="9.2" r="1.9" fill={ink} />
      <path d="M7.4 11.6 4.6 16l3.9-1ZM16.6 11.6 19.4 16l-3.9-1Z" fill={W} />
      <path d="M10.2 17.4h3.6L12 21.8Z" fill={W} />
    </g>
  ),
  'earn-10k': ({ ink }) => (
    <g>
      <path d="M7 3.6h10l4.6 5.6L12 21 2.4 9.2Z" fill={W} />
      <path d="M2.4 9.2h19.2M9.2 3.6 7.6 9.2 12 21l4.4-11.8-1.6-5.6" fill="none" stroke={ink} strokeWidth="1.2" strokeLinejoin="round" />
    </g>
  ),
  'clip-1000': () => <path d="M13.8 2 5 13.6h5.6L9.4 22 19 9.6h-5.8Z" fill={W} />,
  year: ({ ink }) => (
    <g>
      <rect x="3.4" y="4.6" width="17.2" height="16" rx="2.6" fill={W} />
      <rect x="3.4" y="4.6" width="17.2" height="4.2" rx="2" fill={ink} opacity=".55" />
      <path d="m12 10.2 1.5 3 3.3.5-2.4 2.3.6 3.3-3-1.6-3 1.6.6-3.3-2.4-2.3 3.3-.5Z" fill={ink} />
    </g>
  ),
  team: ({ ink }) => (
    <g>
      <path d="M12 2.4 20 5.6v5.9c0 4.9-3.3 8.4-8 10-4.7-1.6-8-5.1-8-10V5.6Z" fill={W} />
      <path d="m8.2 12.2 2.8 2.8 4.9-5.4" fill="none" stroke={ink} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  ),
}

export function BadgeArt({ badge, size = 40, locked = false, className }: { badge: BadgeDef; size?: number; locked?: boolean; animated?: boolean; className?: string }) {
  const uid = useId().replace(/:/g, '')
  const r = badge.rarity
  const h = HUE[badge.id] ?? 210
  const rim = locked ? ['#5a5a63', '#33333a'] : RIM[r]
  const colour = r === 'legendary' && !locked
  const top = locked ? '#43434b' : colour ? `hsl(${h} 78% 63%)` : '#55555d'
  const bottom = locked ? '#27272d' : colour ? `hsl(${h} 72% 36%)` : '#26262b'
  const ink = locked ? '#1c1c21' : colour ? `hsl(${h} 70% 21%)` : '#151518'
  const glyph = GLYPH[badge.id]
  const s = SCALE[r]
  const inner = `translate(32 32) scale(${s}) translate(-32 -32)`
  return (
    <span className={cn('relative inline-block shrink-0 align-middle', className)} style={{ width: size, height: size }}>
      <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true" className="absolute inset-0">
        <defs>
          <linearGradient id={`${uid}r`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={rim[0]} />
            <stop offset="1" stopColor={rim[1]} />
          </linearGradient>
          <linearGradient id={`${uid}b`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={top} />
            <stop offset="1" stopColor={bottom} />
          </linearGradient>
          <linearGradient id={`${uid}g`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity={locked ? 0.08 : 0.4} />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <clipPath id={`${uid}c`}>
            <path d={outline(r)} transform={inner} />
          </clipPath>
        </defs>
        <path d={outline(r)} fill={`url(#${uid}r)`} stroke={rim[1]} strokeWidth="1.2" strokeLinejoin="round" />
        <path d={outline(r)} transform={inner} fill={`url(#${uid}b)`} />
        <g clipPath={`url(#${uid}c)`}>
          <ellipse cx="32" cy="14" rx="26" ry="19" fill={`url(#${uid}g)`} />
        </g>
        <path d={outline(r)} transform={inner} fill="none" stroke="#fff" strokeOpacity={locked ? 0.06 : 0.28} strokeWidth="1" strokeLinejoin="round" />
        {glyph && (
          <g transform="translate(32 33) scale(1.18) translate(-12 -12)" opacity={locked ? 0.3 : 1}>
            {glyph({ ink })}
          </g>
        )}
        {r === 'legendary' && !locked && <path d="m52 10 1.2 3.2L56.4 14.4 53.2 15.6 52 18.8 50.8 15.6 47.6 14.4 50.8 13.2Z" fill="#fffbe0" />}
        {locked && (
          <g transform="translate(42 42)">
            <circle cx="9" cy="9" r="9" fill="#0e0e11" stroke="#3a3a42" strokeWidth="1.5" />
            <rect x="5.2" y="8.8" width="7.6" height="5.6" rx="1.4" fill="#9a9aa4" />
            <path d="M6.8 8.8V7.2a2.2 2.2 0 0 1 4.4 0v1.6" fill="none" stroke="#9a9aa4" strokeWidth="1.4" strokeLinecap="round" />
          </g>
        )}
      </svg>
      <span className="sr-only">{badge.name}</span>
    </span>
  )
}

export const RARITY_STYLE: Record<Rarity, { label: string; text: string; ring: string; glow: string }> = {
  common: { label: 'Common', text: 'text-[#9d9da6]', ring: 'border-[#9d9da6]/35', glow: 'rgb(157 157 166 / 0.16)' },
  rare: { label: 'Rare', text: 'text-[#cfcfd6]', ring: 'border-[#cfcfd6]/45', glow: 'rgb(207 207 214 / 0.18)' },
  epic: { label: 'Epic', text: 'text-white', ring: 'border-white/55', glow: 'rgb(255 255 255 / 0.22)' },
  legendary: { label: 'Legendary', text: 'text-[#ffd45c]', ring: 'border-[#ffd45c]/60', glow: 'rgb(255 212 92 / 0.34)' },
}
