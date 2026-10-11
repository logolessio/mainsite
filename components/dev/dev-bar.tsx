'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { FlaskConical, Rocket } from 'lucide-react'
import { useEffect, useState } from 'react'
import { EASE_OUT } from '@/lib/layout'
import { PushPanel } from './push-panel'

/** A small pill in the corner of the dev site. Press it to choose features and push them to logoless.io. */
export function DevBar() {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])
  return (
    <>
      <div className="fixed right-4 bottom-4 z-[150] flex items-center gap-2 max-md:bottom-24">
        <span className="glass-liquid hidden items-center gap-2 rounded-full px-4 py-2.5 font-mono text-[11px] tracking-[0.18em] text-mute uppercase sm:inline-flex">
          <FlaskConical className="size-3.5" /> Dev site
        </span>
        <button type="button" onClick={() => setOpen(true)} className="inline-flex h-12 items-center gap-2 rounded-full bg-paper px-6 text-[15px] font-medium text-ink shadow-[0_20px_50px_-12px_rgb(0_0_0/0.9)] transition-all hover:bg-paper/85 active:scale-95">
          <Rocket className="size-4" /> push
        </button>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div key="push" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[210] grid place-items-center bg-black/75 px-4 backdrop-blur-sm" onClick={() => setOpen(false)}>
            <motion.div initial={{ opacity: 0, y: 24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: EASE_OUT } }} exit={{ opacity: 0, y: 12, scale: 0.98, transition: { duration: 0.18 } }} onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl">
              <PushPanel onClose={() => setOpen(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
