'use client'

import { Award, BadgeCheck, Calendar, CalendarCheck, CircleDollarSign, Clapperboard, Crown, Droplet, Eye, Film, Flame, Gem, Heart, Image as ImageIcon, Layers, Link2, Lock, Medal, Megaphone, Palette, PenLine, Radio, Sparkles, Star, Trophy, Type, type LucideIcon } from 'lucide-react'
import type { BadgeDef, Rarity } from '@/lib/badges-defs'
import { cn } from '@/lib/utils'

/**
 * Badges look like the ones next to a name on Discord: a flat, single-colour shape with one plain symbol. The shape tells
 * the rarity (circle, rounded square, hexagon, seal), the colour and symbol tell which badge it is. No gradients, no shine.
 */

const ICON: Record<string, LucideIcon> = {
  Clapperboard, Film, Layers, Flame, BadgeCheck, Medal, Eye, Radio, Crown, CircleDollarSign, Gem, Image: ImageIcon, Palette, Droplet, Type, PenLine, Link2, Heart, Star, Calendar, CalendarCheck, Sparkles, Megaphone, Trophy,
}

/** Each badge has its own hue so they are easy to tell apart at a glance. */
const HUE: Record<string, number> = {
  'first-clip': 28, 'clip-10': 190, 'clip-50': 265, 'clip-250': 12,
  'first-approved': 140, 'approved-25': 168, 'views-1k': 205, 'views-100k': 322, 'views-1m': 46,
  'first-earn': 44, 'earn-1k': 300, banner: 218, palette: 336, accent: 196, typeface: 252, bio: 20,
  linked: 152, collector: 350, showcase: 48, week: 96, month: 232, founding: 42, launched: 4, completionist: 282,
}

const SHAPE: Record<Rarity, string> = {
  common: 'M12 1.5a10.5 10.5 0 1 0 0 21 10.5 10.5 0 0 0 0-21Z',
  rare: 'M8 2h8a6 6 0 0 1 6 6v8a6 6 0 0 1-6 6H8a6 6 0 0 1-6-6V8a6 6 0 0 1 6-6Z',
  epic: 'M12 1.2 21.6 6.6v10.8L12 22.8 2.4 17.4V6.6Z',
  legendary: 'm12 1 2.6 2.2 3.4-.4.9 3.3 3.1 1.5-.9 3.3 1.4 3.1-2.6 2.2-.4 3.4-3.4.9L12 23l-2.6-2.2-3.4.4-.9-3.3-3.1-1.5.9-3.3-1.4-3.1 2.6-2.2.4-3.4 3.4-.9Z',
}

export function BadgeArt({ badge, size = 40, locked = false, className }: { badge: BadgeDef; size?: number; locked?: boolean; animated?: boolean; className?: string }) {
  const Icon = ICON[badge.icon] ?? Award
  const fill = locked ? '#3a3a42' : `hsl(${HUE[badge.id] ?? 210} 62% 52%)`
  return (
    <span className={cn('relative inline-grid shrink-0 place-items-center align-middle', className)} style={{ width: size, height: size }}>
      <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" className="absolute inset-0">
        <path d={SHAPE[badge.rarity]} fill={fill} />
      </svg>
      {locked ? <Lock className="relative text-white/55" style={{ width: size * 0.42, height: size * 0.42 }} aria-hidden="true" /> : <Icon className="relative text-white" strokeWidth={2.4} style={{ width: size * 0.5, height: size * 0.5 }} aria-hidden="true" />}
      <span className="sr-only">{badge.name}</span>
    </span>
  )
}

export const RARITY_STYLE: Record<Rarity, { label: string; text: string; ring: string; glow: string }> = {
  common: { label: 'Common', text: 'text-[#e0a06a]', ring: 'border-[#c9803f]/40', glow: 'rgb(201 128 63 / 0.22)' },
  rare: { label: 'Rare', text: 'text-[#d7dbea]', ring: 'border-[#cfd2dd]/45', glow: 'rgb(207 210 221 / 0.2)' },
  epic: { label: 'Epic', text: 'text-[#b9a6ff]', ring: 'border-[#9b87ff]/55', glow: 'rgb(155 135 255 / 0.3)' },
  legendary: { label: 'Legendary', text: 'text-[#ffd45c]', ring: 'border-[#ffd45c]/60', glow: 'rgb(255 212 92 / 0.34)' },
}
