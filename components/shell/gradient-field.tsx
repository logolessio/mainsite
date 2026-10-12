'use client'

/**
 * A soft black-and-white gradient that drifts and changes shape behind everything. Five big clouds of light, each moving
 * on its own slow loop, so the picture never repeats in the same way twice. Pure gradients and transforms: nothing is
 * redrawn, so it costs next to nothing. Calm mode and reduced motion hold it still.
 */
export function GradientField() {
  return (
    <div aria-hidden="true" className="gradient-field pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <span className="gf gf-a" />
      <span className="gf gf-b" />
      <span className="gf gf-c" />
      <span className="gf gf-d" />
      <span className="gf gf-e" />
    </div>
  )
}
