'use client'

/**
 * The page's backdrop: a soft vignette, with fine film grain on top. Painted once, nothing follows the cursor.
 */
export function LightField() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* huge, soft vignette: a smooth multi-stop falloff plus a blurred inner shadow so there is no visible edge */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 72% 68% at 50% 54%, transparent 0%, transparent 26%, rgb(0 0 0 / 0.22) 42%, rgb(0 0 0 / 0.58) 58%, rgb(0 0 0 / 0.88) 74%, rgb(0 0 0 / 0.98) 88%, #000 100%)',
        }}
      />
      <div className="absolute inset-0" style={{ boxShadow: 'inset 0 0 32vmin 16vmin #000' }} />
      {/* fine film grain, painted once */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .9 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        }}
      />
    </div>
  )
}
