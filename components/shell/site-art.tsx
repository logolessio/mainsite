/**
 * Clean line graphics behind the public pages, in the Anubis look: a set of fine rings round the middle of the page with a ring of ticks that turns very
 * slowly, a red dot and a teal dot that orbit with a short trail, a soft ping that spreads out from the centre every few seconds, four corner marks and a
 * ruler down each side. Everything is hairlines in the page's own text colour (so it follows light and dark) and almost nothing is bright: the red dot and the
 * ping are the only colour. Each moving part is its own layer that only turns or fades (see .gf-art in globals.css), so the browser moves them on the
 * graphics card and redraws nothing. Still for calm mode and reduced motion; the moving parts and the rulers are left out on a phone.
 */
export function SiteArt() {
  return (
    <div aria-hidden="true" className="gf-art">
      <div className="gf-rings">
        <svg className="gf-layer" viewBox="0 0 1000 1000" fill="none">
          <g stroke="currentColor" strokeWidth="1">
            <circle cx="500" cy="500" r="130" opacity=".22" />
            <circle cx="500" cy="500" r="250" opacity=".17" />
            <circle cx="500" cy="500" r="380" opacity=".13" />
            <circle cx="500" cy="500" r="499" opacity=".09" />
            <path d="M486 500h28M500 486v28" opacity=".55" />
            <path d="M500 2v20M500 978v20M2 500h20M978 500h20" opacity=".45" />
          </g>
        </svg>
        <svg className="gf-layer gf-spin" viewBox="0 0 1000 1000" fill="none">
          <circle cx="500" cy="500" r="315" stroke="currentColor" strokeOpacity=".34" strokeWidth="1.5" strokeDasharray="1 11" />
          <circle cx="500" cy="500" r="440" stroke="currentColor" strokeOpacity=".3" strokeWidth="9" strokeDasharray="1.2 36.64" />
        </svg>
        <svg className="gf-layer gf-orbit gf-orbit-a" viewBox="0 0 1000 1000" fill="none">
          <defs>
            <linearGradient id="gf-trail" gradientUnits="userSpaceOnUse" x1="880" y1="500" x2="791" y2="256">
              <stop offset="0" stopColor="#ff1f38" stopOpacity=".6" />
              <stop offset="1" stopColor="#ff1f38" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M880 500A380 380 0 0 0 791 256" stroke="url(#gf-trail)" strokeWidth="2" strokeLinecap="round" />
          <circle cx="880" cy="500" r="12" fill="#ff1f38" opacity=".2" />
          <circle cx="880" cy="500" r="4.5" fill="#ff1f38" />
        </svg>
        <svg className="gf-layer gf-orbit gf-orbit-b" viewBox="0 0 1000 1000" fill="none">
          <circle cx="750" cy="500" r="3.2" fill="#2ed0b0" />
          <circle cx="750" cy="500" r="8" fill="#2ed0b0" opacity=".18" />
        </svg>
        <span className="gf-ping" />
        <span className="gf-ping" style={{ animationDelay: '3.4s' }} />
        <span className="gf-ping" style={{ animationDelay: '6.8s' }} />
      </div>
      <span className="gf-corner gf-corner-tl" />
      <span className="gf-corner gf-corner-tr" />
      <span className="gf-corner gf-corner-bl" />
      <span className="gf-corner gf-corner-br" />
      <span className="gf-ruler gf-ruler-l" />
      <span className="gf-ruler gf-ruler-r" />
      <span className="gf-tag">logoless · views have value</span>
    </div>
  )
}
