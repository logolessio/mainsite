/**
 * The logoless mark drawn as lines, for the Sign in button. The PNG logo is thin white lines on a 347×260 canvas, which at
 * button size (about 20px tall) broke up and looked cut off. This keeps the same shape, sized to its own edges, and the lines
 * stay the same weight however small it is drawn. It takes the text colour, so it works on light and dark buttons.
 */
export const MARK_PATHS = ['M12 12H92L192 172L196 128H268L335 226L143 229Z', 'M12 12V136L137 247H333L335 226', 'M198 130L223 173H193']
export const MARK_VIEWBOX = '4 4 339 251'

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
