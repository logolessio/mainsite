import { WORDMARK_BARS, WORDMARK_LETTERS, WORDMARK_VIEWBOX } from '@/lib/logo-wordmark'
import { cn } from '@/lib/utils'

const BARS = ['tlh', 'tlv', 'brh', 'brv'] as const

/**
 * The logoless logo: the word with two corner brackets, the top left one over "logo" and the bottom right one under "less" (the two Ls of the name).
 * Drawn as an inline SVG from the owner's own logo, so it is sharp at any size and takes its colour from the page (white, and dark on the light palette
 * through the [data-logo] rule, which inverts it, so the colour is set inline as plain white: a text-white class is itself turned dark on the light palette).
 * Size it by height: the width follows. The shapes come from scripts/make-logo-wordmark.py; the animated version is components/logo-intro.tsx.
 */
export function Logo({ className, decorative = false }: { className?: string; decorative?: boolean }) {
  return (
    <svg
      data-logo
      viewBox={WORDMARK_VIEWBOX}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : 'logoless'}
      aria-hidden={decorative ? true : undefined}
      style={{ color: '#fff' }}
      className={cn('block h-7 w-auto overflow-visible', className)}
    >
      <g fill="currentColor" stroke="currentColor" strokeWidth={2} strokeLinejoin="round">
        {WORDMARK_LETTERS.map((l) => (
          <path key={l.id} d={l.d} />
        ))}
      </g>
      <g fill="currentColor">
        {BARS.map((k) => (
          <rect key={k} x={WORDMARK_BARS[k].x} y={WORDMARK_BARS[k].y} width={WORDMARK_BARS[k].w} height={WORDMARK_BARS[k].h} />
        ))}
      </g>
    </svg>
  )
}
