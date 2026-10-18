'use client'

import { useDesign } from '@/components/shell/design-provider'
import { fontById } from '@/lib/fonts'

/**
 * The hover on a campaign cover, kept to a few calm moves that all share one easing and start together:
 *  - the whole cover lifts a few pixels and its shadow deepens (COVER_LIFT, on the cover's wrapper)
 *  - the artwork drifts in slowly, a little larger and a touch higher (COVER_IMG, on the picture)
 *  - a soft shade rises behind a panel that slides up from the bottom edge, and the name and the line under it follow one after the other
 * Put CoverSlide inside the cover (which must be `relative overflow-hidden`) and give the wrapper the `group/tile` class.
 * Touch screens have no hover, so they simply see the cover. Keyboard focus shows the same thing. Reduced motion keeps the panel but not the movement.
 */
const EASE = 'ease-[cubic-bezier(.22,1,.36,1)]'

export const COVER_LIFT = `transition-[translate,box-shadow] duration-[560ms] ${EASE} hover:-translate-y-1.5 hover:shadow-[0_36px_52px_-26px_rgb(0_0_0/0.95)] has-[:focus-visible]:-translate-y-1.5 focus-visible:-translate-y-1.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:has-[:focus-visible]:translate-y-0`

export const COVER_IMG = `transition-transform duration-[900ms] ${EASE} group-hover/tile:-translate-y-[1.5%] group-hover/tile:scale-[1.15] group-has-[:focus-visible]/tile:-translate-y-[1.5%] group-has-[:focus-visible]/tile:scale-[1.15] group-focus-visible/tile:scale-[1.15] motion-reduce:transition-none motion-reduce:group-hover/tile:translate-y-0 motion-reduce:group-hover/tile:scale-[1.07]`

const HOVER_ON = 'group-hover/tile:translate-y-0 group-hover/tile:opacity-100 group-has-[:focus-visible]/tile:translate-y-0 group-has-[:focus-visible]/tile:opacity-100 group-focus-visible/tile:translate-y-0 group-focus-visible/tile:opacity-100'

const SIZE: Record<string, string> = {
  s: 'text-[1.05rem] md:text-[1.15rem]',
  m: 'text-[1.3rem] md:text-[1.45rem]',
  l: 'text-[1.6rem] md:text-[1.95rem]',
}
const SIZE_UPPER: Record<string, string> = {
  s: 'text-[0.85rem] md:text-[0.95rem]',
  m: 'text-[1.05rem] md:text-[1.2rem]',
  l: 'text-[1.3rem] md:text-[1.55rem]',
}

/** The font of the name on a cover: "site" is the headline face of the whole site; anything else is that typeface. */
function nameFont(id: string): React.CSSProperties | undefined {
  if (id === 'site') return undefined
  const f = fontById(id)
  return { fontFamily: `var(${f.display}), var(--font-sans), ui-sans-serif, system-ui, sans-serif`, fontWeight: f.kind === 'mono' ? 500 : 400, letterSpacing: f.kind === 'mono' ? '-0.03em' : '-0.005em' }
}

export function CoverSlide({ title, creator, rate }: { title: string; creator: string; rate: number }) {
  const { cover } = useDesign()
  const always = cover.show === 'always'
  const on = always ? 'translate-y-0 opacity-100' : HOVER_ON
  const upper = cover.case === 'upper'
  const rateText = `$${rate % 1 ? rate.toFixed(2) : rate} per 1K`
  const meta = cover.meta === 'both' ? `${creator} · ${rateText}` : cover.meta === 'creator' ? creator : cover.meta === 'rate' ? rateText : ''
  const shade = cover.panel === 'fade' ? 'h-4/5 from-black/80 via-black/35' : 'h-3/5 from-black/55'
  const shadeOn = always ? 'opacity-100' : 'opacity-0 group-hover/tile:opacity-100 group-has-[:focus-visible]/tile:opacity-100 group-focus-visible/tile:opacity-100'
  const panelLook = cover.panel === 'solid' ? 'bg-ink/92' : cover.panel === 'glass' ? 'border-t border-white/15 bg-black/30 backdrop-blur-xl backdrop-saturate-150' : 'bg-transparent'
  const panelPos = always ? 'translate-y-0' : 'translate-y-full group-hover/tile:translate-y-0 group-has-[:focus-visible]/tile:translate-y-0 group-focus-visible/tile:translate-y-0'
  const name = `block ${always ? '' : 'translate-y-2 '}${cover.size === 'l' ? 'line-clamp-2' : 'truncate'} font-display leading-tight text-paper transition-[translate,opacity] duration-500 ${EASE} ${always ? '' : 'opacity-0 motion-reduce:translate-y-0 motion-reduce:opacity-100'} ${upper ? SIZE_UPPER[cover.size] : SIZE[cover.size]} ${on} ${always ? '' : 'group-hover/tile:[transition-delay:110ms]'}`
  return (
    <>
      <span aria-hidden="true" className={`pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t to-transparent transition-opacity duration-500 ${EASE} ${shade} ${shadeOn}`} />
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-0 bottom-0 px-4 pt-3.5 pb-4 transition-transform duration-[520ms] ${EASE} ${panelPos} ${panelLook} motion-reduce:transition-none md:px-5 md:pb-5 ${cover.align === 'center' ? 'text-center' : ''}`}
      >
        <span
          style={nameFont(cover.font)}
          className={`${name} ${upper ? 'uppercase tracking-[0.06em]' : ''} ${cover.case === 'lower' ? 'lowercase' : ''}`}
        >
          {title}
        </span>
        {meta && (
          <span className={`mt-1 block ${always ? '' : 'translate-y-2 opacity-0 motion-reduce:translate-y-0 motion-reduce:opacity-100'} truncate text-[13px] text-paper/70 transition-[translate,opacity] duration-500 ${EASE} ${on} ${always ? '' : 'group-hover/tile:[transition-delay:170ms]'}`}>
            {meta}
          </span>
        )}
      </span>
      <span aria-hidden="true" className={`pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 ring-1 ring-white/15 ring-inset transition-opacity duration-500 ${EASE} group-hover/tile:opacity-100`} />
    </>
  )
}
