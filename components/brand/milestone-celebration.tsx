'use client'

import { animate, AnimatePresence, motion } from 'framer-motion'
import { Share2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Confetti } from '@/components/invite/bits'
import { tourRunning } from '@/components/brand/client-tour'
import { useFeature } from '@/components/shell/features-provider'
import { useDialog } from '@/hooks/use-dialog'
import { useMotionPrefs, useMounted } from '@/hooks/use-motion-prefs'
import { EASE_OUT, SPRING_POP } from '@/lib/layout'
import { toast } from '@/lib/toast'

const n = (v: number) => Math.round(v).toLocaleString('en-US')

/**
 * The overview's party when the views across all campaigns pass a milestone. The server decides which one (only the highest
 * not yet shown); it is saved as shown the moment it opens, so it never comes back on this device or any other.
 */
export function MilestoneCelebration({ milestone, views, top }: { milestone: number; views: number; top: { title: string; views: number } | null }) {
  const on = useFeature('view-milestones')
  const mounted = useMounted()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    // in the middle of the walkthrough it waits for the next visit (it is only saved as shown once it opens)
    if (!on || tourRunning()) return
    setOpen(true)
    fetch('/api/me/milestone', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ milestone }) }).catch(() => {})
  }, [on, milestone])

  if (!on || !mounted) return null
  return createPortal(<AnimatePresence>{open && <Party key={milestone} milestone={milestone} views={views} top={top} onClose={() => setOpen(false)} />}</AnimatePresence>, document.body)
}

function Party({ milestone, views, top, onClose }: { milestone: number; views: number; top: { title: string; views: number } | null; onClose: () => void }) {
  const { reduced } = useMotionPrefs()
  const box = useDialog<HTMLDivElement>(true, onClose)
  const [shown, setShown] = useState(reduced ? milestone : 0)

  // the big number counts up to the milestone
  useEffect(() => {
    if (reduced) return setShown(milestone)
    const c = animate(0, milestone, { duration: 1.6, delay: 0.25, ease: EASE_OUT, onUpdate: setShown })
    return () => c.stop()
  }, [milestone, reduced])

  const share = async () => {
    const text = `Our campaigns on logoless just passed ${n(milestone)} verified views.`
    const url = 'https://logoless.io'
    try {
      if (navigator.share) return await navigator.share({ text, url })
      await navigator.clipboard.writeText(`${text} ${url}`)
      toast.ok('Copied. Paste it anywhere.')
    } catch {
      /* they closed the share sheet */
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : 0.25 }} className="fixed inset-0 z-[140] grid place-items-center overflow-hidden bg-black/85 px-4 backdrop-blur-md" onClick={onClose}>
      {!reduced && <Confetti count={70} />}
      <motion.div
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-labelledby="milestone-title"
        initial={reduced ? false : { opacity: 0, y: 24, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, transition: { duration: 0.16 } }}
        transition={SPRING_POP}
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 flex w-full max-w-md flex-col items-center text-center"
      >
        <span aria-hidden="true" className="absolute top-6 size-72 rounded-pill bg-paper/10 blur-3xl" />
        <p className="relative text-xs text-mute">Milestone</p>
        <p aria-hidden="true" className="relative mt-4 font-display text-6xl leading-none tracking-[-0.045em] tabular-nums sm:text-7xl">
          {n(shown)}
        </p>
        <h2 id="milestone-title" className="relative mt-5 font-display text-3xl leading-tight">
          You just passed {n(milestone)} views
        </h2>
        <p className="relative mt-3 text-[15px] leading-relaxed text-paper/65">
          {n(views)} verified views across your campaigns, every one checked on the platform.
          {top && (
            <>
              {' '}
              The most came from <span className="text-paper">{top.title}</span> ({n(top.views)}).
            </>
          )}
        </p>
        <div className="relative mt-7 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={onClose} className="inline-flex h-12 items-center rounded-pill bg-paper px-7 text-[15px] font-medium text-ink transition-all hover:bg-paper/85 active:scale-95">
            Continue
          </button>
          <button type="button" onClick={share} className="inline-flex h-12 items-center gap-2 rounded-pill border border-line-strong px-5 text-sm text-paper/80 transition-colors hover:bg-paper/10 hover:text-paper">
            <Share2 aria-hidden="true" className="size-4" /> Share
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
