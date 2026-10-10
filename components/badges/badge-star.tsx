'use client'

import {
  BadgeCheck,
  Calendar,
  CalendarCheck,
  CircleDollarSign,
  Clapperboard,
  Crown,
  Droplet,
  Eye,
  Film,
  Flame,
  Gem,
  Heart,
  Image as ImageIcon,
  Layers,
  Link2,
  Lock,
  Medal,
  Megaphone,
  Palette,
  PenLine,
  Radio,
  Sparkles,
  Star,
  Trophy,
  Type,
  type LucideIcon,
} from 'lucide-react'
import { useId } from 'react'
import type { BadgeDef, Rarity } from '@/lib/badges-defs'
import { cn } from '@/lib/utils'

const ICONS: Record<string, LucideIcon> = {
  BadgeCheck, Calendar, CalendarCheck, CircleDollarSign, Clapperboard, Crown, Droplet, Eye, Film, Flame, Gem, Heart,
  Image: ImageIcon, Layers, Link2, Medal, Megaphone, Palette, PenLine, Radio, Sparkles, Star, Trophy, Type,
}

// Monochrome to match the site. Rarer badges get brighter, then a tint.
const TONES: Record<Rarity, { a: string; b: string; c: string; ink: string }> = {
  common: { a: '#8d8d95', b: '#d0d0d6', c: '#6b6b72', ink: '#0b0b0c' },
  rare: { a: '#cfd0d6', b: '#ffffff', c: '#9c9da6', ink: '#0b0b0c' },
  epic: { a: '#8da2ff', b: '#e4e9ff', c: '#9a7bff', ink: '#0b0b14' },
  legendary: { a: '#ffcf70', b: '#fff4d0', c: '#e0a030', ink: '#140d00' },
}

/** Points of a star with `n` tips. The more tips, the rounder it gets, so a 12-point badge looks like a seal. */
function starPath(n: number, outer = 48, cx = 50, cy = 50) {
  const inner = outer * (0.62 + Math.min(Math.max(n - 5, 0), 8) * 0.03)
  const pts: string[] = []
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? outer : inner
    const a = (Math.PI * i) / n - Math.PI / 2
    pts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`)
  }
  return pts.join(' ')
}

export function BadgeStar({
  badge,
  size = 88,
  locked = false,
  className,
}: {
  badge: BadgeDef
  size?: number
  locked?: boolean
  className?: string
}) {
  const id = useId().replace(/:/g, '')
  const tone = TONES[badge.rarity]
  const Glyph = ICONS[badge.icon] ?? Star
  const pts = starPath(badge.points)
  return (
    <span className={cn('relative inline-grid place-items-center', locked && 'opacity-45 grayscale', className)} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true" className="absolute inset-0">
        <defs>
          <linearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={tone.b} />
            <stop offset="0.5" stopColor={tone.a} />
            <stop offset="1" stopColor={tone.c} />
          </linearGradient>
          <radialGradient id={`s${id}`} cx="0.35" cy="0.3" r="0.8">
            <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
            <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
        </defs>
        <polygon points={pts} fill={`url(#g${id})`} stroke={`url(#g${id})`} strokeWidth="3" strokeLinejoin="round" />
        <polygon points={pts} fill={`url(#s${id})`} />
        <circle cx="50" cy="50" r="25" fill={tone.ink} fillOpacity="0.9" />
        <circle cx="50" cy="50" r="25" fill="none" stroke={tone.b} strokeOpacity="0.55" strokeWidth="1" />
      </svg>
      <span className="relative" style={{ color: tone.b }}>
        {locked ? <Lock style={{ width: size * 0.26, height: size * 0.26 }} /> : <Glyph style={{ width: size * 0.3, height: size * 0.3 }} strokeWidth={1.7} />}
      </span>
    </span>
  )
}
