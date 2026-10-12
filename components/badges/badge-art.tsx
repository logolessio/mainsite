'use client'

import { useId, type ReactNode } from 'react'
import type { BadgeDef, Rarity } from '@/lib/badges-defs'
import { cn } from '@/lib/utils'

/**
 * Every badge is its own little piece of art: a frame whose shape and metal come from its rarity (bronze disc,
 * silver hexagon, prismatic shield, golden sunburst seal), a face tinted in the badge's own colour, and a
 * hand-drawn emblem that is different for every single one. Rarer badges shine, drift and sparkle.
 */

type Pal = { h: number; l: string; m: string; d: string; i: string }
const hsl = (h: number, s: number, l: number) => `hsl(${h} ${s}% ${l}%)`
const pal = (h: number): Pal => ({ h, l: hsl(h, 92, 74), m: hsl(h, 86, 56), d: hsl(h, 78, 30), i: hsl(h, 70, 9) })
const LOCKED: Pal = { h: 0, l: '#5a5a62', m: '#43434a', d: '#2c2c32', i: '#16161a' }

/** Each badge's own colour (a hue) so no two look alike even within a rarity. */
const HUE: Record<string, number> = {
  'first-clip': 28, 'clip-10': 190, 'clip-50': 265, 'clip-250': 12,
  'first-approved': 140, 'approved-25': 168, 'views-1k': 205, 'views-100k': 322, 'views-1m': 46,
  'first-earn': 44, 'earn-1k': 300, banner: 218, palette: 336, accent: 196, typeface: 252, bio: 20,
  linked: 152, collector: 350, showcase: 48, week: 96, month: 232, founding: 42, launched: 4, completionist: 282,
}

function star(n: number, outer: number, inner: number, cx = 60, cy = 60, rot = -90) {
  const pts: string[] = []
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? outer : inner
    const a = ((rot + (180 / n) * i) * Math.PI) / 180
    pts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`)
  }
  return pts.join(' ')
}
const poly = (n: number, r: number, cx = 60, cy = 60, rot = -90) =>
  Array.from({ length: n }, (_, i) => {
    const a = ((rot + (360 / n) * i) * Math.PI) / 180
    return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`
  }).join(' ')

const SHIELD = 'M60 4 L106 20 V58 C106 87 85 105 60 117 C35 105 14 87 14 58 V20 Z'
const FONT = "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif"

type Ctx = { p: Pal; gl: string; ink: string; flat: boolean }

/** The emblem for each badge, drawn in a 120 by 120 box. */
const GLYPH: Record<string, (c: Ctx) => ReactNode> = {
  'first-clip': ({ p, gl, ink }) => (
    <g transform="translate(0 3)">
      <rect x="32" y="56" width="56" height="32" rx="4" fill={gl} stroke={ink} strokeWidth="2.5" />
      <rect x="40" y="68" width="26" height="3.5" rx="1.7" fill={ink} opacity=".55" />
      <rect x="40" y="76" width="17" height="3.5" rx="1.7" fill={ink} opacity=".55" />
      <g transform="rotate(-13 32 52)">
        <rect x="32" y="39" width="56" height="14" rx="3" fill={ink} />
        {[0, 1, 2, 3, 4].map((i) => (
          <polygon key={i} points={`${38 + i * 11},39 ${46 + i * 11},39 ${40 + i * 11},53 ${32 + i * 11},53`} fill={p.l} />
        ))}
      </g>
      <rect x="32" y="52" width="56" height="6" fill={ink} />
    </g>
  ),
  'clip-10': ({ p, gl, ink }) => (
    <g>
      <g transform="rotate(-8 60 60)">
        <rect x="26" y="40" width="68" height="40" rx="4" fill={ink} />
        {Array.from({ length: 7 }, (_, i) => (
          <g key={i}>
            <rect x={30 + i * 9} y="43" width="5" height="5" rx="1" fill={p.l} />
            <rect x={30 + i * 9} y="72" width="5" height="5" rx="1" fill={p.l} />
          </g>
        ))}
        {[0, 1, 2].map((i) => (
          <rect key={i} x={31 + i * 21} y="51" width="18" height="18" rx="2" fill={gl} />
        ))}
      </g>
      <circle cx="88" cy="84" r="14" fill={p.d} stroke={p.l} strokeWidth="2.5" />
      <text x="88" y="89.5" textAnchor="middle" fontSize="15" fontWeight="800" fill="#fff" fontFamily={FONT}>10</text>
    </g>
  ),
  'clip-50': ({ p, gl, ink, flat }) => (
    <g>
      <path d="M84 76 C98 82 96 98 80 98 L64 98" fill="none" stroke={ink} strokeWidth="8" strokeLinecap="round" />
      <path d="M84 76 C98 82 96 98 80 98 L64 98" fill="none" stroke={p.l} strokeWidth="2" strokeDasharray="3 5" strokeLinecap="round" />
      <g className={flat ? undefined : 'b-spin'}>
        <circle cx="60" cy="58" r="29" fill={p.l} stroke={ink} strokeWidth="2.5" />
        {Array.from({ length: 5 }, (_, i) => {
          const a = ((i * 72 - 90) * Math.PI) / 180
          return <circle key={i} cx={60 + 15 * Math.cos(a)} cy={58 + 15 * Math.sin(a)} r="6.5" fill={ink} />
        })}
        <circle cx="60" cy="58" r="5.5" fill={ink} />
        <circle cx="60" cy="58" r="2" fill={p.l} />
      </g>
    </g>
  ),
  'clip-250': ({ p, gl, ink, flat }) => (
    <g className={flat ? undefined : 'b-flicker'}>
      <path d="M60 26 C68 44 84 50 82 71 C81 85 71 94 60 94 C49 94 39 85 38 71 C37 58 47 52 52 39 C55 46 57 48 60 26 Z" fill={gl} stroke={ink} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M60 52 C65 61 72 66 71 77 C70 85 65 89 60 89 C55 89 50 85 49 77 C48 68 56 63 60 52 Z" fill={p.l} opacity=".92" />
      <path d="M63 58 L52 77 H60 L56 91 L69 71 H61 Z" fill={ink} />
    </g>
  ),
  'first-approved': ({ p, gl, ink }) => (
    <g>
      <polygon points="46,78 40,98 52,92 58,100 62,80" fill={p.d} stroke={ink} strokeWidth="2" strokeLinejoin="round" />
      <polygon points="74,78 80,98 68,92 62,100 58,80" fill={p.m} stroke={ink} strokeWidth="2" strokeLinejoin="round" />
      <polygon points={star(16, 31, 27, 60, 54)} fill={gl} stroke={ink} strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx="60" cy="54" r="20" fill="none" stroke={p.l} strokeWidth="1.5" opacity=".7" />
      <path d="M48 55 L57 64 L74 44" fill="none" stroke={ink} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M48 55 L57 64 L74 44" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  ),
  'approved-25': ({ p, gl, ink }) => (
    <g>
      <path d="M60 26 L88 35 V58 C88 76 75 87 60 95 C45 87 32 76 32 58 V35 Z" fill={gl} stroke={ink} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M60 33 L81 40 V58 C81 71 71 80 60 86 C49 80 39 71 39 58 V40 Z" fill="none" stroke={p.l} strokeWidth="1.5" opacity=".6" />
      <path d="M51 44 L68 74 M69 44 L52 74" stroke={ink} strokeWidth="4.5" strokeLinecap="round" />
      <circle cx="51" cy="77" r="5.5" fill="none" stroke={ink} strokeWidth="3.5" />
      <circle cx="69" cy="77" r="5.5" fill="none" stroke={ink} strokeWidth="3.5" />
      <circle cx="60" cy="59" r="2.6" fill={p.l} stroke={ink} strokeWidth="1.5" />
    </g>
  ),
  'views-1k': ({ p, ink, flat }) => (
    <g>
      <path d="M24 60 Q60 28 96 60 Q60 92 24 60 Z" fill="#f7f7fa" stroke={ink} strokeWidth="2.8" strokeLinejoin="round" />
      <g className={flat ? undefined : 'b-blink'}>
        <circle cx="60" cy="60" r="17" fill={p.m} stroke={ink} strokeWidth="2.5" />
        <circle cx="60" cy="60" r="11" fill={p.d} />
        <circle cx="60" cy="60" r="6.5" fill={ink} />
        <circle cx="54.5" cy="54.5" r="4" fill="#fff" />
        <circle cx="65" cy="66" r="1.8" fill="#fff" opacity=".7" />
      </g>
    </g>
  ),
  'views-100k': ({ p, gl, ink, flat }) => {
    const arc = (R: number, side: 1 | -1) => {
      const a = (side === 1 ? 38 : 142) * (Math.PI / 180)
      const b = (side === 1 ? -38 : 218) * (Math.PI / 180)
      const [x1, y1] = [60 + R * Math.cos(a), 60 + R * Math.sin(a)]
      const [x2, y2] = [60 + R * Math.cos(b), 60 + R * Math.sin(b)]
      return `M${x1.toFixed(1)} ${y1.toFixed(1)} A${R} ${R} 0 0 ${side === 1 ? 0 : 1} ${x2.toFixed(1)} ${y2.toFixed(1)}`
    }
    return (
      <g>
        {[1, 2, 3].map((k) =>
          ([1, -1] as const).map((s) => (
            <path key={`${k}${s}`} d={arc(12 + k * 11, s)} fill="none" stroke={ink} strokeWidth="9" strokeLinecap="round" />
          )),
        )}
        {[1, 2, 3].map((k) =>
          ([1, -1] as const).map((s) => (
            <path key={`c${k}${s}`} d={arc(12 + k * 11, s)} fill="none" stroke={k === 3 ? p.m : k === 2 ? p.l : '#fff'} strokeWidth="4.5" strokeLinecap="round" className={flat ? undefined : 'b-pulse'} style={{ animationDelay: `${(3 - k) * 0.25}s` }} />
          )),
        )}
        <circle cx="60" cy="60" r="9" fill={gl} stroke={ink} strokeWidth="2.5" />
      </g>
    )
  },
  'views-1m': ({ p, gl, ink }) => (
    <g>
      <path d="M31 84 L27 42 L46 60 L60 33 L74 60 L93 42 L89 84 Z" fill={gl} stroke={ink} strokeWidth="2.6" strokeLinejoin="round" />
      <rect x="31" y="78" width="58" height="13" rx="3.5" fill={p.d} stroke={ink} strokeWidth="2.3" />
      <text x="60" y="88.5" textAnchor="middle" fontSize="10.5" fontWeight="900" fill="#fff" fontFamily={FONT} letterSpacing="1">1M</text>
      {[[27, 42], [60, 33], [93, 42]].map(([x, y]) => (
        <circle key={x} cx={x} cy={y} r="5" fill={p.l} stroke={ink} strokeWidth="2" />
      ))}
      <polygon points="60,52 67,62 60,72 53,62" fill="#fff" stroke={ink} strokeWidth="2" strokeLinejoin="round" opacity=".95" />
    </g>
  ),
  'first-earn': ({ p, gl, ink, flat }) => (
    <g className={flat ? undefined : 'b-flip'}>
      <circle cx="60" cy="60" r="31" fill={p.d} stroke={ink} strokeWidth="2.5" />
      <circle cx="60" cy="57" r="29" fill={gl} stroke={ink} strokeWidth="2.5" />
      <circle cx="60" cy="57" r="22" fill="none" stroke={p.l} strokeWidth="2" strokeDasharray="2 3.2" />
      <text x="60" y="69" textAnchor="middle" fontSize="36" fontWeight="900" fill={ink} fontFamily={FONT}>$</text>
    </g>
  ),
  'earn-1k': ({ p, ink, flat }) => (
    <g>
      <g strokeLinejoin="round" stroke={ink} strokeWidth="2.2">
        <polygon points="34,50 46,36 74,36 86,50" fill={p.l} />
        <polygon points="46,36 60,50 34,50" fill={p.m} />
        <polygon points="74,36 86,50 60,50" fill={p.m} />
        <polygon points="46,36 74,36 60,50" fill="#fff" fillOpacity=".7" />
        <polygon points="34,50 60,50 60,90" fill={p.m} />
        <polygon points="86,50 60,50 60,90" fill={p.d} />
      </g>
      <path d="M86 24 L88.5 31.5 L96 34 L88.5 36.5 L86 44 L83.5 36.5 L76 34 L83.5 31.5 Z" fill="#fff" className={flat ? undefined : 'b-twinkle'} />
    </g>
  ),
  banner: ({ p, ink }) => (
    <g>
      <rect x="29" y="37" width="62" height="46" rx="5" fill={p.l} stroke={ink} strokeWidth="3" />
      <circle cx="74" cy="50" r="6.5" fill="#fff" />
      <polygon points="29,83 49,57 62,72 73,56 91,83" fill={p.d} />
      <polygon points="49,57 55,65 43,65" fill="#fff" opacity=".85" />
      <rect x="29" y="37" width="62" height="46" rx="5" fill="none" stroke={p.m} strokeWidth="1.2" opacity=".7" />
    </g>
  ),
  palette: ({ p, gl, ink }) => (
    <g>
      <path d="M60 31 C85 31 95 48 91 62 C89 72 78 72 74 68 C70 64 64 66 64 74 C64 85 52 91 41 85 C27 77 27 50 38 40 C44 34 52 31 60 31 Z" fill={gl} stroke={ink} strokeWidth="2.6" strokeLinejoin="round" />
      <circle cx="46" cy="50" r="5.5" fill="#ef4444" stroke={ink} strokeWidth="1.5" />
      <circle cx="60" cy="43" r="5.5" fill="#fbbf24" stroke={ink} strokeWidth="1.5" />
      <circle cx="75" cy="50" r="5.5" fill="#38bdf8" stroke={ink} strokeWidth="1.5" />
      <circle cx="40" cy="66" r="5.5" fill="#34d399" stroke={ink} strokeWidth="1.5" />
      <circle cx="55" cy="74" r="5" fill={ink} />
    </g>
  ),
  accent: ({ p, gl, ink }) => (
    <g>
      <path d="M60 28 C60 28 37 55 37 70 C37 83 47 92 60 92 C73 92 83 83 83 70 C83 55 60 28 60 28 Z" fill={gl} stroke={ink} strokeWidth="2.6" strokeLinejoin="round" />
      <ellipse cx="50" cy="66" rx="4.5" ry="9" fill="#fff" opacity=".5" transform="rotate(18 50 66)" />
      <path d="M45 76 C50 62 54 82 60 71 S70 64 76 74" fill="none" stroke={ink} strokeWidth="5" strokeLinecap="round" />
      <path d="M45 76 C50 62 54 82 60 71 S70 64 76 74" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    </g>
  ),
  typeface: ({ p, gl, ink }) => (
    <g fontFamily="Georgia, 'Times New Roman', serif" fontWeight="900">
      <line x1="28" y1="84" x2="92" y2="84" stroke={ink} strokeWidth="2.5" />
      <line x1="28" y1="48" x2="92" y2="48" stroke={p.l} strokeWidth="1.2" strokeDasharray="3 4" opacity=".7" />
      <text x="44" y="84" textAnchor="middle" fontSize="58" fill={gl} stroke={ink} strokeWidth="2.4" paintOrder="stroke">A</text>
      <text x="76" y="84" textAnchor="middle" fontSize="38" fill={p.l} stroke={ink} strokeWidth="2.2" paintOrder="stroke">a</text>
    </g>
  ),
  bio: ({ p, gl, ink }) => (
    <g>
      <path d="M86 30 C62 31 44 49 40 78 L47 72 C49 64 53 58 60 54 C57 61 57 66 60 71 C72 67 84 52 86 30 Z" fill={gl} stroke={ink} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M41 88 L70 50" stroke={ink} strokeWidth="3" strokeLinecap="round" />
      <path d="M52 66 L62 56 M56 72 L68 61" stroke={p.d} strokeWidth="2" strokeLinecap="round" />
      <path d="M31 94 C40 90 47 96 54 92 S68 92 78 94" fill="none" stroke={ink} strokeWidth="3.5" strokeLinecap="round" />
    </g>
  ),
  linked: ({ p, ink }) => (
    <g>
      {[[46, 64, -38], [74, 56, -38]].map(([x, y, r], i) => (
        <g key={i} transform={`rotate(${r} ${x} ${y})`}>
          <rect x={x - 21} y={y - 12} width="42" height="24" rx="12" fill="none" stroke={ink} strokeWidth="13" />
          <rect x={x - 21} y={y - 12} width="42" height="24" rx="12" fill="none" stroke={i ? p.l : p.m} strokeWidth="8" />
        </g>
      ))}
      <path d="M40 78 L52 66" stroke={ink} strokeWidth="2" opacity="0" />
    </g>
  ),
  collector: ({ p, gl, ink }) => (
    <g>
      <rect x="36" y="34" width="38" height="54" rx="5" transform="rotate(-16 55 62)" fill={p.d} stroke={ink} strokeWidth="2.2" />
      <rect x="46" y="34" width="38" height="54" rx="5" transform="rotate(12 65 62)" fill={p.m} stroke={ink} strokeWidth="2.2" />
      <path d="M60 90 C33 71 31 52 43 46 C51 42 57 48 60 55 C63 48 69 42 77 46 C89 52 87 71 60 90 Z" fill={gl} stroke={ink} strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M44 55 C45 50 50 49 53 52" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".7" />
    </g>
  ),
  showcase: ({ p, gl, ink }) => (
    <g>
      <rect x="35" y="74" width="16" height="16" rx="2" fill={p.d} stroke={ink} strokeWidth="2" />
      <rect x="52" y="64" width="16" height="26" rx="2" fill={p.m} stroke={ink} strokeWidth="2" />
      <rect x="69" y="80" width="16" height="10" rx="2" fill={p.d} stroke={ink} strokeWidth="2" />
      <polygon points={star(5, 17, 7.4, 60, 46)} fill={gl} stroke={ink} strokeWidth="2.2" strokeLinejoin="round" />
      <polygon points={star(5, 9, 4, 43, 61)} fill={p.l} stroke={ink} strokeWidth="1.8" strokeLinejoin="round" />
      <polygon points={star(5, 8, 3.6, 77, 66)} fill={p.l} stroke={ink} strokeWidth="1.8" strokeLinejoin="round" />
    </g>
  ),
  week: ({ p, ink }) => (
    <g>
      <rect x="32" y="38" width="56" height="52" rx="6" fill="#f6f6f9" stroke={ink} strokeWidth="2.6" />
      <path d="M32 44 Q32 38 38 38 H82 Q88 38 88 44 V54 H32 Z" fill={p.m} stroke={ink} strokeWidth="2.6" strokeLinejoin="round" />
      <rect x="45" y="31" width="5" height="12" rx="2.5" fill={ink} />
      <rect x="70" y="31" width="5" height="12" rx="2.5" fill={ink} />
      <text x="60" y="82" textAnchor="middle" fontSize="28" fontWeight="900" fill={p.d} fontFamily={FONT}>7</text>
    </g>
  ),
  month: ({ p, ink }) => (
    <g>
      <rect x="30" y="38" width="60" height="52" rx="6" fill="#f6f6f9" stroke={ink} strokeWidth="2.6" />
      <path d="M30 44 Q30 38 36 38 H84 Q90 38 90 44 V54 H30 Z" fill={p.m} stroke={ink} strokeWidth="2.6" strokeLinejoin="round" />
      <rect x="44" y="31" width="5" height="12" rx="2.5" fill={ink} />
      <rect x="71" y="31" width="5" height="12" rx="2.5" fill={ink} />
      <text x="60" y="78" textAnchor="middle" fontSize="25" fontWeight="900" fill={p.d} fontFamily={FONT}>30</text>
      {[0, 1, 2, 3, 4].map((i) => (
        <circle key={i} cx={44 + i * 8} cy="85" r="1.9" fill={i < 4 ? p.m : p.l} />
      ))}
    </g>
  ),
  founding: ({ p, gl, ink, flat }) => (
    <g>
      {([-1, 1] as const).map((s) =>
        Array.from({ length: 6 }, (_, i) => {
          const a = ((s === -1 ? 150 + i * 22 : 30 - i * 22) * Math.PI) / 180
          const x = 60 + 33 * Math.cos(a)
          const y = 64 + 33 * Math.sin(a)
          const rot = (a * 180) / Math.PI + (s === -1 ? -90 : 90)
          return <ellipse key={`${s}${i}`} cx={x} cy={y} rx="3.8" ry="8" transform={`rotate(${rot} ${x} ${y})`} fill={i % 2 ? p.l : p.m} stroke={ink} strokeWidth="1.6" />
        }),
      )}
      <polygon points={star(5, 25, 11, 60, 60)} fill={gl} stroke={ink} strokeWidth="2.6" strokeLinejoin="round" />
      <polygon points={star(5, 13, 5.5, 60, 60)} fill="#fff" opacity=".55" />
      <path d="M92 28 L94 34 L100 36 L94 38 L92 44 L90 38 L84 36 L90 34 Z" fill="#fff" className={flat ? undefined : 'b-twinkle'} />
    </g>
  ),
  launched: ({ p, gl, ink, flat }) => (
    <g>
      <path d="M33 54 L33 68 L47 68 L69 83 L69 39 L47 54 Z" fill={gl} stroke={ink} strokeWidth="2.6" strokeLinejoin="round" />
      <rect x="39" y="68" width="9" height="16" rx="2.5" fill={p.d} stroke={ink} strokeWidth="2.2" />
      <ellipse cx="70" cy="61" rx="5.5" ry="22" fill={p.l} stroke={ink} strokeWidth="2.6" />
      {[0, 1].map((k) => (
        <path key={k} d={`M${83 + k * 9} ${47 - k * 6} q${9 + k * 3} ${14 + k * 6} 0 ${28 + k * 12}`} fill="none" stroke={k ? p.m : p.l} strokeWidth="4.2" strokeLinecap="round" className={flat ? undefined : 'b-pulse'} style={{ animationDelay: `${k * 0.3}s` }} />
      ))}
    </g>
  ),
  completionist: ({ p, gl, ink, flat }) => (
    <g>
      <path d="M45 37 C31 37 31 59 47 62" fill="none" stroke={ink} strokeWidth="9" strokeLinecap="round" />
      <path d="M45 37 C31 37 31 59 47 62" fill="none" stroke={p.m} strokeWidth="4.5" strokeLinecap="round" />
      <path d="M75 37 C89 37 89 59 73 62" fill="none" stroke={ink} strokeWidth="9" strokeLinecap="round" />
      <path d="M75 37 C89 37 89 59 73 62" fill="none" stroke={p.m} strokeWidth="4.5" strokeLinecap="round" />
      <path d="M43 32 H77 V56 C77 70 69 77 60 77 C51 77 43 70 43 56 Z" fill={gl} stroke={ink} strokeWidth="2.6" strokeLinejoin="round" />
      <rect x="55" y="77" width="10" height="9" fill={p.d} stroke={ink} strokeWidth="2" />
      <rect x="44" y="86" width="32" height="9" rx="3" fill={p.d} stroke={ink} strokeWidth="2.2" />
      <polygon points={star(5, 11, 4.6, 60, 53)} fill="#fff" stroke={ink} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M50 38 C49 48 50 58 54 66" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".5" className={flat ? undefined : 'b-twinkle'} />
    </g>
  ),
}

const METAL: Record<Rarity, [string, string, string, string]> = {
  common: ['#f6c796', '#c9803f', '#7d4621', '#e0a06a'],
  rare: ['#ffffff', '#cfd2dd', '#7e8498', '#eceef5'],
  epic: ['#ffffff', '#b9a6ff', '#5d4bd6', '#7fe3ff'],
  legendary: ['#fff8d2', '#ffd45c', '#b87718', '#ffe9a3'],
}

export function BadgeArt({ badge, size = 88, locked = false, animated, className }: { badge: BadgeDef; size?: number; locked?: boolean; animated?: boolean; className?: string }) {
  const uid = useId().replace(/:/g, '')
  const p = locked ? LOCKED : pal(HUE[badge.id] ?? 210)
  const r = badge.rarity
  const flat = locked || !(animated ?? size >= 60)
  const metal = locked ? (['#6a6a72', '#4c4c54', '#2e2e34', '#5a5a62'] as const) : METAL[r]
  const gl = `url(#${uid}gl)`
  const glyph = GLYPH[badge.id]
  const frame: ReactNode =
    r === 'common' ? <circle cx="60" cy="60" r="55" /> : r === 'rare' ? <polygon points={poly(6, 57)} strokeLinejoin="round" /> : r === 'epic' ? <path d={SHIELD} strokeLinejoin="round" /> : <polygon points={star(14, 58, 51)} strokeLinejoin="round" />
  const face: ReactNode =
    r === 'common' ? <circle cx="60" cy="60" r="46" /> : r === 'rare' ? <polygon points={poly(6, 47)} strokeLinejoin="round" /> : r === 'epic' ? <path d={SHIELD} transform="translate(60 60) scale(.8) translate(-60 -61)" strokeLinejoin="round" /> : <circle cx="60" cy="60" r="43" />
  const offset = r === 'epic' ? 1 : 0

  return (
    <span className={cn('relative inline-block shrink-0 select-none', r === 'legendary' && !flat && 'b-float', className)} style={{ width: size, height: size }}>
      <svg data-keep viewBox="0 0 120 120" width={size} height={size} aria-hidden="true" className="block overflow-visible">
        <defs>
          <linearGradient id={`${uid}m`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={metal[0]} />
            <stop offset=".35" stopColor={metal[1]} />
            <stop offset=".7" stopColor={metal[2]} />
            <stop offset="1" stopColor={metal[3]} />
          </linearGradient>
          <radialGradient id={`${uid}f`} cx=".4" cy=".3" r=".9">
            <stop offset="0" stopColor={locked ? '#2a2a30' : hsl(p.h, 62, 32)} />
            <stop offset=".6" stopColor={locked ? '#1c1c20' : hsl(p.h, 66, 17)} />
            <stop offset="1" stopColor={locked ? '#111114' : hsl(p.h, 70, 8)} />
          </radialGradient>
          <linearGradient id={`${uid}gl`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={p.l} />
            <stop offset=".55" stopColor={p.m} />
            <stop offset="1" stopColor={p.d} />
          </linearGradient>
          <linearGradient id={`${uid}sh`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset=".5" stopColor="#fff" stopOpacity=".7" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`${uid}ir`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#7fe3ff" stopOpacity=".55" />
            <stop offset=".5" stopColor="#c68bff" stopOpacity=".35" />
            <stop offset="1" stopColor="#ff9bd5" stopOpacity=".55" />
          </linearGradient>
          <clipPath id={`${uid}c`}>{face}</clipPath>
          <clipPath id={`${uid}cf`}>{frame}</clipPath>
          <filter id={`${uid}ds`} x="-20%" y="-20%" width="140%" height="150%">
            <feDropShadow dx="0" dy="2.5" stdDeviation="2.2" floodColor="#000" floodOpacity=".55" />
          </filter>
        </defs>

        {/* legendary: rays turning slowly behind the seal */}
        {r === 'legendary' && !locked && (
          <g className={flat ? undefined : 'b-spin-slow'} opacity=".55">
            {Array.from({ length: 12 }, (_, i) => (
              <polygon key={i} points="60,60 57,-6 63,-6" fill="#ffe9a3" transform={`rotate(${i * 30} 60 60)`} opacity={i % 2 ? 0.25 : 0.5} />
            ))}
          </g>
        )}

        <g filter={`url(#${uid}ds)`}>
          <g fill={`url(#${uid}m)`} stroke={locked ? '#0c0c0e' : metal[2]} strokeWidth="1.5">
            {frame}
          </g>
        </g>
        {/* bevel on the frame */}
        <g fill="none" stroke="#fff" strokeOpacity={locked ? 0.1 : 0.55} strokeWidth="1.2" transform="translate(60 60) scale(.975) translate(-60 -60)">
          {frame}
        </g>
        {r === 'epic' && !locked && (
          <g clipPath={`url(#${uid}cf)`}>
            <rect width="120" height="120" fill={`url(#${uid}ir)`} className={flat ? undefined : 'b-hue'} />
          </g>
        )}
        {r === 'legendary' && !locked && Array.from({ length: 28 }, (_, i) => {
          const a = (i * 360) / 28
          return <circle key={i} cx={60 + 47 * Math.cos((a * Math.PI) / 180)} cy={60 + 47 * Math.sin((a * Math.PI) / 180)} r="1.3" fill="#fff6c9" opacity=".8" />
        })}

        {/* the face */}
        <g transform={offset ? 'translate(0 1)' : undefined}>
          <g fill={`url(#${uid}f)`} stroke={locked ? '#000' : p.i} strokeWidth="2">
            {face}
          </g>
          <g clipPath={`url(#${uid}c)`}>
            {!locked && <circle cx="60" cy="60" r="34" fill="none" stroke={p.l} strokeOpacity=".16" strokeWidth="1" />}
            {!locked && <circle cx="60" cy="60" r="25" fill="none" stroke={p.l} strokeOpacity=".1" strokeWidth="1" />}
            <g filter={locked ? undefined : `url(#${uid}ds)`} opacity={locked ? 0.9 : 1}>
              {glyph ? glyph({ p, gl, ink: p.i, flat }) : null}
            </g>
            {/* glass highlight and the moving shine */}
            <path d="M18 54 C22 24 52 12 80 16 C58 22 36 34 30 62 Z" fill="#fff" opacity={locked ? 0.05 : 0.18} />
            {!flat && (
              <g clipPath={`url(#${uid}c)`}>
                <g className="b-shine">
                  <rect x="-40" y="-10" width="46" height="140" fill={`url(#${uid}sh)`} transform="skewX(-18)" opacity=".85" />
                </g>
              </g>
            )}
          </g>
          <g fill="none" stroke="#fff" strokeOpacity={locked ? 0.06 : 0.28} strokeWidth="1.2">
            {face}
          </g>
        </g>

        {locked && (
          <g transform="translate(78 78)">
            <circle cx="14" cy="14" r="14" fill="#0e0e11" stroke="#3a3a42" strokeWidth="2" />
            <rect x="8.5" y="13.5" width="11" height="8.5" rx="2" fill="#8a8a94" />
            <path d="M10.5 13.5 V11 a3.5 3.5 0 0 1 7 0 V13.5" fill="none" stroke="#8a8a94" strokeWidth="2" strokeLinecap="round" />
          </g>
        )}
      </svg>
    </span>
  )
}

export const RARITY_STYLE: Record<Rarity, { label: string; text: string; ring: string; glow: string }> = {
  common: { label: 'Common', text: 'text-[#e0a06a]', ring: 'border-[#c9803f]/40', glow: 'rgb(201 128 63 / 0.22)' },
  rare: { label: 'Rare', text: 'text-[#d7dbea]', ring: 'border-[#cfd2dd]/45', glow: 'rgb(207 210 221 / 0.2)' },
  epic: { label: 'Epic', text: 'text-[#b9a6ff]', ring: 'border-[#9b87ff]/55', glow: 'rgb(155 135 255 / 0.3)' },
  legendary: { label: 'Legendary', text: 'text-[#ffd45c]', ring: 'border-[#ffd45c]/60', glow: 'rgb(255 212 92 / 0.34)' },
}
