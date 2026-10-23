/**
 * The logoless mark drawn as lines, for the Sign in button: the two corner brackets of the logo (the top left and the bottom right one). Drawn as strokes, so
 * the lines stay the same weight however small it is, and it takes the text colour, so it works on light and dark buttons.
 */
export const MARK_PATHS = ['M2 9.5V2H15.5', 'M22 8.5V16H8.5']
export const MARK_VIEWBOX = '0 0 24 18'

export function LogolessMark({ className, stroke = 1.6, title }: { className?: string; stroke?: number; title?: string }) {
  return (
    <svg viewBox={MARK_VIEWBOX} className={className} fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinejoin="round" strokeLinecap="round" role={title ? 'img' : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      {MARK_PATHS.map((d) => (
        <path key={d} d={d} vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  )
}

/** The same mark as plain SVG markup, for code people copy into their own pages. */
export const MARK_SVG = `<svg viewBox="${MARK_VIEWBOX}" width="30" height="22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">${MARK_PATHS.map((d) => `<path d="${d}" vector-effect="non-scaling-stroke"/>`).join('')}</svg>`
