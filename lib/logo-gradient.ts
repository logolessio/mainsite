/**
 * What the logo is filled with, left to right across the word: the colours of the moving background (components/shell/gradient-field.tsx): its red, pink, violet,
 * electric blue and sky blue glows, at full strength (the background shows them dimmed over navy). The still logo (components/logo.tsx) draws these as an SVG
 * gradient; the animated one (public/logo-intro.webp) has the same colours painted into its frames by scripts/make-logo-intro.py (its STOPS list), so keep the
 * two in step, or run `python3 scripts/make-logo-intro.py --recolor` after changing these.
 */
export const LOGO_STOPS: readonly [offset: number, colour: string][] = [
  [0, '#ff1f38'], // red
  [0.28, '#ff2d96'], // pink
  [0.55, '#9650ff'], // violet
  [0.8, '#4678ff'], // electric blue
  [1, '#4ba9dc'], // sky blue
]
