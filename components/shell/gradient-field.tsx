'use client'

/**
 * A soft black-and-white gradient that drifts and changes shape behind everything, with a faint grid over it. Five big
 * clouds of light, each moving on its own slow loop, so the picture never repeats in the same way twice. Pure gradients
 * and transforms: nothing is redrawn, so it costs next to nothing. The grid is painted once and fades out towards the
 * edges. Calm mode and reduced motion hold the clouds still.
 */
export function GradientField() {
  return (
    <div aria-hidden="true" className="gradient-field pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <span className="gf gf-a" />
      <span className="gf gf-b" />
      <span className="gf gf-c" />
      <span className="gf gf-d" />
      <span className="gf gf-e" />
      <span className="gf-grid" />
    </div>
  )
}
