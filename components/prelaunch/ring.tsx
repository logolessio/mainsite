'use client'

import { useRef } from 'react'
import { cn } from '@/lib/utils'

/**
 * The search bar's rainbow ring (.sp-* in globals.css) as two building blocks for the pre-launch pages: a button that wears it all the time, and a panel
 * that lights up while you are inside it. The arc of colour runs round the edge, a glow sits under it, and a soft light follows the pointer.
 */
type Common = { className?: string; children: React.ReactNode }

/** Moves the light under the pointer (the --mx and --my the stylesheet reads). */
function useSpot() {
  const ref = useRef<HTMLDivElement>(null)
  return {
    ref,
    onPointerMove: (e: React.PointerEvent) => {
      const el = ref.current
      if (!el) return
      const r = el.getBoundingClientRect()
      el.style.setProperty('--mx', `${e.clientX - r.left}px`)
      el.style.setProperty('--my', `${e.clientY - r.top}px`)
    },
  }
}

type ButtonProps = Common & { on?: boolean; busy?: boolean; href?: string; disabled?: boolean; type?: 'button' | 'submit'; onClick?: () => void; ariaLabel?: string; external?: boolean }

export function RingButton({ children, className, on = true, busy = false, href, disabled, type = 'button', onClick, ariaLabel, external }: ButtonProps) {
  const spot = useSpot()
  const body = cn(
    'sp-body relative flex h-[54px] w-full items-center justify-center gap-2.5 overflow-hidden rounded-pill px-6 text-[16px] font-medium text-paper outline-none transition-[opacity,transform] duration-300 select-none',
    disabled && 'pointer-events-none opacity-50',
  )
  const inner = (
    <>
      <span aria-hidden="true" className="sp-spot pointer-events-none absolute inset-0" />
      <span aria-hidden="true" className="sp-sheen pointer-events-none absolute inset-y-0 -left-1/3 w-1/3" />
      <span className="relative flex items-center justify-center gap-2.5">{children}</span>
    </>
  )
  return (
    <div ref={spot.ref} onPointerMove={spot.onPointerMove} className={cn('sp relative', on && 'sp-on', busy && 'pre-busy', className)}>
      <span aria-hidden="true" className="sp-under pointer-events-none absolute inset-x-6 -bottom-3 h-6 rounded-full blur-xl" />
      <div className="sp-edge relative rounded-pill p-px">
        <span aria-hidden="true" className="sp-ring" />
        {href ? (
          <a href={href} className={body} aria-label={ariaLabel} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
            {inner}
          </a>
        ) : (
          <button type={type} onClick={onClick} disabled={disabled || busy} aria-label={ariaLabel} aria-busy={busy || undefined} className={body}>
            {inner}
          </button>
        )}
      </div>
    </div>
  )
}

/** A panel with the ring on its edge. It lights up while a field inside it has focus; `on` keeps it lit (for screens with nothing to type). */
export function RingCard({ children, className, on = false }: Common & { on?: boolean }) {
  return (
    <div className={cn('sp sp-card relative', on && 'sp-on', className)}>
      <span aria-hidden="true" className="sp-under pointer-events-none absolute inset-x-8 -bottom-4 h-8 rounded-full blur-2xl" />
      <div className="sp-edge relative rounded-[calc(30px*var(--round,1))] p-px">
        <span aria-hidden="true" className="sp-ring" />
        <div className="sp-body relative rounded-[calc(29px*var(--round,1))] p-6 sm:p-8">{children}</div>
      </div>
    </div>
  )
}
