import { createElement } from 'react'
import type { BadgeDef, Rarity } from '../badges-defs'
import { BADGE_SHAPES } from './badge-icons'

/**
 * A badge as a medallion for the picture cards: the same black and white struck metal as the one on the site (components/badges/badge-art),
 * drawn without hooks or React components so the card renderer can use it. Rarity shows in how the medal is made: a plain rim (common),
 * a milled edge (rare), a milled edge and engraved face (epic), a sunburst edge (legendary).
 */
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
const sunburst = (n: number, rOut: number, rIn: number) => `M${Array.from({ length: n * 2 }, (_, i) => polar(i % 2 === 0 ? rOut : rIn, (i * 180) / n).map((v) => v.toFixed(2)).join(' ')).join('L')}Z`

export function Medal({ badge, size }: { badge: BadgeDef; size: number }) {
  const r = badge.rarity
  const shapes = BADGE_SHAPES[badge.icon] ?? BADGE_SHAPES.Star
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="rim" x1="0.1" y1="0" x2="0.9" y2="1">
          {RIM[r].map(([o, c]) => (
            <stop key={o} offset={o} stopColor={c} />
          ))}
        </linearGradient>
        <radialGradient id="face" cx="0.32" cy="0.2" r="1">
          <stop offset="0" stopColor="#3a3a40" />
          <stop offset="0.5" stopColor="#18181b" />
          <stop offset="1" stopColor="#060607" />
        </radialGradient>
        <linearGradient id="shine" x1="0" y1="0" x2="0.7" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.4" />
          <stop offset="0.55" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {r === 'legendary' && <path d={sunburst(36, 49, 45.4)} fill="url(#rim)" />}
      <circle cx="50" cy="50" r="44.4" fill="none" stroke="url(#rim)" strokeWidth="3.6" />
      <circle cx="50" cy="50" r="42.4" fill="none" stroke="#000000" strokeOpacity="0.55" strokeWidth="0.8" />
      <circle cx="50" cy="50" r="42" fill="url(#face)" />
      {TICKS[r] > 0 && <path d={ticks(TICKS[r], 38.6, 41.2)} stroke="#ffffff" strokeOpacity="0.34" strokeWidth="0.55" fill="none" />}
      <circle cx="50" cy="50" r={TICKS[r] > 0 ? 36.4 : 38} fill="none" stroke="#ffffff" strokeOpacity="0.2" strokeWidth="0.6" />
      <ellipse cx="34" cy="24" rx="34" ry="19" transform="rotate(-24 34 24)" fill="url(#shine)" />
      <g transform="translate(30 30) scale(1.667)" fill="none" stroke="#f3f2ee" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        {shapes.map(([tag, attrs], i) => createElement(tag, { key: i, ...attrs }))}
      </g>
    </svg>
  )
}
