'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { ActionButton } from '@/components/app/ui'
import { EASE_OUT } from '@/lib/layout'

/**
 * The bar that rises from the bottom while a page has changes that are not saved: Reset or Save changes. It is not there at all
 * when there is nothing to save, so it never sits over the page. Above the tab bar on a phone, beside the sidebar on a computer.
 */
export function UnsavedBar({ show, saving, onReset, onSave }: { show: boolean; saving: boolean; onReset: () => void; onSave: () => void }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="unsaved-bar"
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.32, ease: EASE_OUT } }}
          exit={{ opacity: 0, y: 14, transition: { duration: 0.18 } }}
          className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-30 flex justify-center px-4 md:bottom-6 md:pl-[var(--sidebar-w,0px)]"
        >
          <div className="pointer-events-auto flex w-full max-w-lg items-center gap-2 rounded-card border border-line-strong bg-[#0d0d0f]/95 p-2 pl-5 shadow-[0_24px_60px_-20px_rgb(0_0_0/0.9)] backdrop-blur-md">
            <p className="min-w-0 flex-1 text-sm leading-snug">
              <span className="sm:hidden">Unsaved changes</span>
              <span className="hidden sm:inline">Careful, you have unsaved changes.</span>
            </p>
            <button type="button" onClick={onReset} disabled={saving} className="inline-flex h-10 items-center rounded-pill px-4 text-sm text-mute transition-colors hover:text-paper disabled:opacity-50">
              Reset
            </button>
            <ActionButton data-hotkey-save onClick={onSave} disabled={saving} className="rounded-pill">
              {saving && <Loader2 className="size-4 animate-spin" />} Save changes
            </ActionButton>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
