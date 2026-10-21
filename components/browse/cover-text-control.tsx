'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { applyCoverText, COVER_STEPS, getCoverText, setCoverText, subscribeCoverText } from '@/lib/cover-text'
import { EASE_OUT } from '@/lib/layout'
import { cn } from '@/lib/utils'

const NAMES = ['Smaller', 'Standard', 'Larger', 'Large', 'Largest']

/** "Aa" in the filter bar: five sizes for the names on the campaign covers, remembered on this device. */
export function CoverTextControl() {
  const size = useSyncExternalStore(subscribeCoverText, getCoverText, () => 1)
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => applyCoverText(), [])
  useEffect(() => {
    if (!open) return
    const away = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && (e.stopPropagation(), setOpen(false))
    window.addEventListener('pointerdown', away)
    window.addEventListener('keydown', esc, true)
    return () => {
      window.removeEventListener('pointerdown', away)
      window.removeEventListener('keydown', esc, true)
    }
  }, [open])

  const at = COVER_STEPS.indexOf(size as (typeof COVER_STEPS)[number])
  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={`Cover text size: ${NAMES[at] ?? 'Standard'}`}
        title="Cover text size"
        onClick={() => setOpen((v) => !v)}
        className={cn('inline-flex h-8 items-center gap-0.5 rounded-pill px-3 text-xs transition-colors', open || size !== 1 ? 'text-paper' : 'text-mute hover:text-paper')}
      >
        <span aria-hidden="true" className="text-[10px]">A</span>
        <span aria-hidden="true" className="text-[14px] leading-none">a</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.18, ease: EASE_OUT }}
            className="absolute top-[calc(100%+10px)] right-0 z-30 w-[244px] origin-top-right rounded-card border border-white/10 bg-[#0e0e11]/95 p-3 shadow-[0_24px_60px_-20px_rgb(0_0_0/0.9)] backdrop-blur-xl"
          >
            <p className="px-1 pb-2.5 text-xs text-mute">Text size on the covers</p>
            <div role="radiogroup" aria-label="Cover text size" className="flex items-end justify-between gap-1 rounded-[calc(14px*var(--round,1))] bg-white/[0.04] p-1">
              {COVER_STEPS.map((v, n) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={v === size}
                  aria-label={NAMES[n]}
                  title={NAMES[n]}
                  onClick={() => setCoverText(v)}
                  className={cn('relative grid h-10 flex-1 place-items-center rounded-[calc(10px*var(--round,1))] font-display transition-colors', v === size ? 'text-ink' : 'text-paper/60 hover:text-paper')}
                >
                  {v === size && <motion.span layoutId="cover-size-pill" transition={{ type: 'spring', stiffness: 520, damping: 38 }} className="absolute inset-0 rounded-[inherit] bg-paper" />}
                  <span className="relative leading-none" style={{ fontSize: `${12 + n * 3.5}px` }}>A</span>
                </button>
              ))}
            </div>
            <p className="px-1 pt-2.5 text-[11px] text-paper/40">{NAMES[at] ?? 'Standard'}. Remembered on this device.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
