import { cn } from '@/lib/utils'

/**
 * The logoless logo: the word with two corner brackets, the top left one over "logo" and the bottom right one under "less" (the two Ls of the name).
 * It is the picture public/logo-mark.svg (made by scripts/make-logo-mark-svg.py from the owner's own logo): sharp at any size, and filled with the gradient in
 * lib/logo-gradient.ts, running left to right across the whole word. The gradient lives inside the picture, so nothing on the page can take it away; it is shown
 * with an <img> like the animated version (components/logo-intro.tsx), which has the same colours painted into its frames. On the light palette the
 * [data-logo] rule turns it dark (its lightness is inverted, its colours kept).
 * Size it by height: the width follows.
 */
export function Logo({ className, decorative = false }: { className?: string; decorative?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      data-logo
      src="/logo-mark.svg"
      width={542}
      height={117}
      alt={decorative ? '' : 'logoless'}
      aria-hidden={decorative ? true : undefined}
      draggable={false}
      className={cn('block h-7 w-auto max-w-none select-none', className)}
    />
  )
}
