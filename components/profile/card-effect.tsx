import type { CardEffect } from '@/lib/profile-style'

// Fixed pseudo-random numbers so server and browser render the same particles.
const r = (i: number, k: number) => {
  const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453
  return x - Math.floor(x)
}

/** Floating particles over a card. Pure CSS animation, no scripts, and switched off for reduced motion. */
export function CardEffectLayer({ effect }: { effect: CardEffect }) {
  if (effect === 'none') return null
  const n = effect === 'rain' ? 34 : effect === 'stars' ? 14 : 24
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-[inherit]">
      {Array.from({ length: n }, (_, i) => (
        <span
          key={i}
          className={`fx fx-${effect}`}
          style={
            {
              '--x': `${Math.round(r(i, 1) * 100)}%`,
              '--y': `${Math.round(r(i, 2) * 100)}%`,
              '--s': `${effect === 'stars' ? 7 + Math.round(r(i, 3) * 9) : effect === 'rain' ? 2 + Math.round(r(i, 3) * 3) : 2 + Math.round(r(i, 3) * 5)}px`,
              '--d': `${(r(i, 4) * 8).toFixed(2)}s`,
              '--t': `${(effect === 'stars' || effect === 'sparkle' ? 2.4 + r(i, 5) * 3 : 5 + r(i, 5) * 6).toFixed(2)}s`,
              '--dx': `${Math.round((r(i, 6) - 0.5) * 70)}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  )
}
