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

export function CoverSlide({ title, creator, rate }: { title: string; creator: string; rate: number }) {
  const on = 'group-hover/tile:translate-y-0 group-hover/tile:opacity-100 group-has-[:focus-visible]/tile:translate-y-0 group-has-[:focus-visible]/tile:opacity-100 group-focus-visible/tile:translate-y-0 group-focus-visible/tile:opacity-100'
  return (
    <>
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/55 to-transparent opacity-0 transition-opacity duration-500 ${EASE} group-hover/tile:opacity-100 group-has-[:focus-visible]/tile:opacity-100 group-focus-visible/tile:opacity-100`}
      />
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-0 bottom-0 translate-y-full bg-ink/92 px-4 pt-3.5 pb-4 transition-transform duration-[520ms] ${EASE} group-hover/tile:translate-y-0 group-has-[:focus-visible]/tile:translate-y-0 group-focus-visible/tile:translate-y-0 motion-reduce:transition-none md:px-5 md:pb-5`}
      >
        <span className={`block translate-y-2 truncate font-display text-[1.3rem] leading-tight text-paper opacity-0 transition-[translate,opacity] duration-500 ${EASE} motion-reduce:translate-y-0 motion-reduce:opacity-100 md:text-[1.45rem] ${on} group-hover/tile:[transition-delay:110ms]`}>{title}</span>
        <span className={`mt-1 block translate-y-2 truncate text-[13px] text-paper/65 opacity-0 transition-[translate,opacity] duration-500 ${EASE} motion-reduce:translate-y-0 motion-reduce:opacity-100 ${on} group-hover/tile:[transition-delay:170ms]`}>
          {creator} · ${rate % 1 ? rate.toFixed(2) : rate} per 1K
        </span>
      </span>
      <span aria-hidden="true" className={`pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 ring-1 ring-white/15 ring-inset transition-opacity duration-500 ${EASE} group-hover/tile:opacity-100`} />
    </>
  )
}
