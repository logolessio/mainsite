import { useId } from 'react'
import { LOGO_STOPS } from '@/lib/logo-gradient'
import { WORDMARK_BARS, WORDMARK_LETTERS, WORDMARK_VIEWBOX } from '@/lib/logo-wordmark'
import { cn } from '@/lib/utils'

const BARS = ['tlh', 'tlv', 'brh', 'brv'] as const
const [VX, VY, VW] = WORDMARK_VIEWBOX.split(' ').map(Number)

/**
 * The logoless logo: the word with two corner brackets, the top left one over "logo" and the bottom right one under "less" (the two Ls of the name).
 * Drawn as an inline SVG from the owner's own logo, so it is sharp at any size, and filled with the gradient in lib/logo-gradient.ts, running left to right
 * across the whole word (one gradient for every letter and both brackets, so it reads as one fill). On the light palette the [data-logo] rule turns it dark
 * (its lightness is inverted, its colours kept).
 * Size it by height: the width follows. The shapes come from scripts/make-logo-wordmark.py; the animated version is components/logo-intro.tsx.
 */
export function Logo({ className, decorative = false }: { className?: string; decorative?: boolean }) {
  // each logo on the page has its own gradient definition: one inside a hidden logo would not be found by the others
  const id = `lg${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const fill = `url(#${id})`
  return (
    <svg
      data-logo
      viewBox={WORDMARK_VIEWBOX}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : 'logoless'}
      aria-hidden={decorative ? true : undefined}
      className={cn('block h-7 w-auto overflow-visible', className)}
    >
      <defs>
        <linearGradient id={id} gradientUnits="userSpaceOnUse" x1={VX} y1={0} x2={VX + VW} y2={0}>
          {LOGO_STOPS.map(([o, c]) => (
            <stop key={o} offset={o} stopColor={c} />
          ))}
        </linearGradient>
      </defs>
      <g fill={fill} stroke={fill} strokeWidth={2} strokeLinejoin="round">
        {WORDMARK_LETTERS.map((l) => (
          <path key={l.id} d={l.d} />
        ))}
      </g>
      <g fill={fill}>
        {BARS.map((k) => (
          <rect key={k} x={WORDMARK_BARS[k].x} y={WORDMARK_BARS[k].y} width={WORDMARK_BARS[k].w} height={WORDMARK_BARS[k].h} />
        ))}
      </g>
    </svg>
  )
}
