/**
 * The one hover effect on a campaign cover: a panel slides up from the bottom edge with the name, who it is for and the rate.
 * Put it inside the cover (which must be `relative overflow-hidden`) and give the cover's wrapper the `group/tile` class.
 * Touch screens have no hover, so they simply see the cover.
 */
export function CoverSlide({ title, creator, rate }: { title: string; creator: string; rate: number }) {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-full bg-ink/92 px-4 pt-3.5 pb-4 transition-transform duration-[360ms] ease-[cubic-bezier(.22,1,.36,1)] group-hover/tile:translate-y-0 group-focus-within/tile:translate-y-0 motion-reduce:transition-none md:px-5 md:pb-5"
    >
      <span className="block truncate font-display text-[1.3rem] leading-tight text-paper md:text-[1.45rem]">{title}</span>
      <span className="mt-1 block truncate text-[13px] text-paper/65">
        {creator} · ${rate % 1 ? rate.toFixed(2) : rate} per 1K
      </span>
    </span>
  )
}
