/**
 * What the logo is filled with, left to right across the word: the colours of the moving background (components/shell/gradient-field.tsx): its red, pink, violet,
 * electric blue and sky blue glows, at full strength (the background shows them dimmed over navy). The still logo is the picture public/logo-mark.svg (written by
 * `python3 scripts/make-logo-mark-svg.py`, which reads this list); the animated one (public/logo-intro.webp) has the same colours painted into its frames by
 * `python3 scripts/make-logo-intro.py --recolor` (its STOPS list). After changing the colours, change that list too and run both scripts.
 */
export const LOGO_STOPS: readonly [offset: number, colour: string][] = [
  [0, '#ff1f38'], // red
  [0.28, '#ff2d96'], // pink
  [0.55, '#9650ff'], // violet
  [0.8, '#4678ff'], // electric blue
  [1, '#4ba9dc'], // sky blue
]
