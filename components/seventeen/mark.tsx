import { cn } from '@/lib/utils'

const HOLES = [8, 13.33, 18.67, 24]

/**
 * 17's mark: the number on a red film frame, with sprocket holes along its top and bottom edges. Drawn on a 32 grid, so it scales with
 * its size class. The icons in public/17 are made the same way (scripts/make-seventeen-icons.py).
 */
export function Mark({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 32 32" className={cn('size-8 shrink-0 drop-shadow-[0_6px_16px_rgb(255_31_56/0.45)]', className)}>
      <rect width="32" height="32" rx="8.5" fill="#ff1f38" />
      <rect x="0.5" y="0.5" width="31" height="31" rx="8" fill="none" stroke="#fff" strokeOpacity="0.22" />
      {HOLES.map((x) => (
        <g key={x} fill="#000" fillOpacity="0.38">
          <rect x={x - 1.1} y="3.2" width="2.2" height="2.2" rx="0.5" />
          <rect x={x - 1.1} y="26.6" width="2.2" height="2.2" rx="0.5" />
        </g>
      ))}
      <text x="15.6" y="16.9" textAnchor="middle" dominantBaseline="central" fill="#fff" fontSize="16" fontWeight="900" letterSpacing="-1.1" style={{ fontFamily: 'var(--font-f-schibsted), sans-serif' }}>
        17
      </text>
    </svg>
  )
}
