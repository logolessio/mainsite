import { cn } from '@/lib/utils'

/**
 * A white Greek pillar, drawn in CSS (.pillar in globals.css): a capital with two scrolls, a fluted shaft and a base. It fills the height it is placed in, the
 * shaft taking up whatever the capital and the base leave. `--flutes` (default 7) is how many grooves run down the shaft: narrow columns should have fewer.
 * Used at the edges of the page on wide screens (GradientField) and down the sides of the closing box (CtaBand).
 */
export function Pillar({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cn('pillar', className)}>
      <span className="pillar-cap" />
      <span className="pillar-shaft" />
      <span className="pillar-base" />
    </span>
  )
}
