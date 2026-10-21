'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Loader2, TriangleAlert } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { EASE_OUT } from '@/lib/layout'
import { cn } from '@/lib/utils'

export type ConfirmDialogProps = {
  open: boolean
  title: string
  body?: React.ReactNode
  /** The safe choice. Escape, the backdrop and this button all choose it. */
  cancelLabel?: string
  confirmLabel?: string
  /** Optional middle choice, such as "Save and leave". Resolve false to stay on the page (the save failed). */
  saveLabel?: string
  onSave?: () => Promise<boolean>
  onCancel: () => void
  onConfirm: () => void
  tone?: 'danger' | 'plain'
}

/**
 * A small in-site confirmation box, used instead of the browser's own grey prompt. Focus starts on the safe choice
 * and stays inside the box; Escape closes it.
 */
export function ConfirmDialog({ open, title, body, cancelLabel = 'Keep editing', confirmLabel = 'Leave without saving', saveLabel, onSave, onCancel, onConfirm, tone = 'danger' }: ConfirmDialogProps) {
  const id = useId()
  const box = useRef<HTMLDivElement>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    requestAnimationFrame(() => box.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus())
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
      }
      if (e.key === 'Tab' && box.current) {
        const items = [...box.current.querySelectorAll<HTMLElement>('button:not([disabled])')]
        if (!items.length) return
        const [first, last] = [items[0], items[items.length - 1]]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      prev?.focus?.()
    }
  }, [open, onCancel])

  const save = async () => {
    if (!onSave) return
    setSaving(true)
    const ok = await onSave().catch(() => false)
    setSaving(false)
    if (ok) onConfirm()
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div key="bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="fixed inset-0 z-[200] grid place-items-end bg-black/70 p-3 backdrop-blur-sm sm:place-items-center sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
          <motion.div
            ref={box}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={`${id}-t`}
            aria-describedby={body ? `${id}-b` : undefined}
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.32, ease: EASE_OUT } }}
            exit={{ opacity: 0, y: 12, scale: 0.98, transition: { duration: 0.15 } }}
            className="w-full max-w-[32rem] rounded-card border border-line-strong bg-[#0d0d0f] p-5 text-paper shadow-[0_30px_80px_-20px_rgb(0_0_0/0.9)] sm:p-6"
          >
            <div className="flex items-start gap-3.5">
              <span className={tone === 'danger' ? 'grid size-10 shrink-0 place-items-center rounded-pill bg-white/10 text-paper' : 'grid size-10 shrink-0 place-items-center rounded-pill bg-white/10'}>
                <TriangleAlert className="size-5" />
              </span>
              <div className="min-w-0 pt-0.5">
                <h2 id={`${id}-t`} className="font-sans text-[17px] leading-snug font-medium">{title}</h2>
                {body && <div id={`${id}-b`} className="mt-1.5 text-sm leading-relaxed text-mute">{body}</div>}
              </div>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
              <button type="button" disabled={saving} onClick={onConfirm} className={cn('inline-flex h-11 items-center justify-center rounded-pill px-4 text-sm whitespace-nowrap transition-colors disabled:opacity-50 sm:mr-auto sm:h-10', tone === 'danger' ? 'text-signal hover:bg-signal/10' : 'text-mute hover:bg-white/10 hover:text-paper')}>
                {confirmLabel}
              </button>
              {onSave && saveLabel && (
                <button type="button" disabled={saving} onClick={save} className="inline-flex h-11 items-center justify-center gap-2 rounded-pill border border-line-strong px-4 text-sm whitespace-nowrap transition-colors hover:bg-white/10 disabled:opacity-50 sm:h-10">
                  {saving && <Loader2 className="size-4 animate-spin" />} {saveLabel}
                </button>
              )}
              <button type="button" data-autofocus onClick={onCancel} className="inline-flex h-11 items-center justify-center rounded-pill bg-paper px-5 text-sm font-medium whitespace-nowrap text-ink transition-colors hover:bg-paper/85 sm:h-10">
                {cancelLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ---------- the one shared "leave without saving?" box, opened from anywhere ----------

let root: Root | null = null
let host: HTMLDivElement | null = null

/** Opens the leave box and resolves true when the person chooses to leave (after saving, if they picked that). */
export function openLeaveDialog(o: { message?: string; onSave?: () => Promise<boolean> }): Promise<boolean> {
  if (!host) {
    host = document.createElement('div')
    host.dataset.leaveDialog = ''
    document.body.appendChild(host)
    root = createRoot(host)
  }
  return new Promise((resolve) => {
    const done = (v: boolean) => {
      render(false)
      resolve(v)
    }
    const render = (open: boolean) =>
      root!.render(
        <ConfirmDialog
          open={open}
          title="Leave without saving?"
          body={o.message ?? 'You have changes on this page that are not saved yet. If you leave now they will be lost.'}
          saveLabel={o.onSave ? 'Save and leave' : undefined}
          onSave={o.onSave}
          onCancel={() => done(false)}
          onConfirm={() => done(true)}
        />,
      )
    render(true)
  })
}
