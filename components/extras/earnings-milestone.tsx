'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Confetti } from '@/components/invite/bits'
import { useDialog } from '@/hooks/use-dialog'
import { useMotionPrefs, useMounted } from '@/hooks/use-motion-prefs'
import { EARNING_MILESTONES } from '@/lib/growth-shared'
import { EASE_OUT } from '@/lib/layout'

/** A round number of dollars earned in total: a small party once, then never again on this device. */
export function EarningsMilestone({ userId, cents }: { userId: string; cents: number }) {
  const mounted = useMounted()
  const [mile, setMile] = useState(0)
  useEffect(() => {
    const passed = EARNING_MILESTONES.filter((m) => cents >= m).at(-1) ?? 0
    if (!passed) return
    const key = `ll:mile:earn:${userId}`
    try {
      const seen = Number(localStorage.getItem(key) ?? 0)
      if (passed > seen) {
        setMile(passed)
        localStorage.setItem(key, String(passed))
      }
    } catch {
      /* storage blocked: no party rather than a party every visit */
    }
  }, [cents, userId])
  if (!mounted || !mile) return null
  return createPortal(<AnimatePresence>{mile > 0 && <Party cents={mile} onClose={() => setMile(0)} />}</AnimatePresence>, document.body)
}

function Party({ cents, onClose }: { cents: number; onClose: () => void }) {
  const { reduced } = useMotionPrefs()
  const box = useDialog<HTMLDivElement>(true, onClose)
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : 0.25 }} className="fixed inset-0 z-[140] grid place-items-center bg-black/70 px-4 backdrop-blur-md" onMouseDown={onClose}>
      {!reduced && <Confetti count={60} />}
      <motion.div ref={box} role="dialog" aria-modal="true" aria-labelledby="earn-mile" initial={reduced ? false : { opacity: 0, y: 24, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.45, ease: EASE_OUT }} onMouseDown={(e) => e.stopPropagation()} className="relative w-full max-w-sm rounded-card border border-line-strong bg-[#0b0b0d] p-8 text-center outline-none">
        <p className="text-xs text-mute">You have earned</p>
        <p id="earn-mile" className="mt-2 font-display text-7xl leading-none tabular-nums">${(cents / 100).toLocaleString('en-US')}</p>
        <p className="mt-4 text-[15px] leading-relaxed text-mute">In total, from clips that were checked and paid for. That is real money from real views.</p>
        <button type="button" autoFocus onClick={onClose} className="mt-7 inline-flex h-12 items-center rounded-pill bg-paper px-8 text-[15px] font-medium text-ink transition-colors hover:bg-paper/85">
          Keep going
        </button>
      </motion.div>
    </motion.div>
  )
}
