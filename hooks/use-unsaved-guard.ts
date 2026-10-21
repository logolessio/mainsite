'use client'

import { useEffect, useRef } from 'react'
import { useFeature } from '@/components/shell/features-provider'

type Guard = { dirty: () => boolean; message?: string; dialog: boolean; onSave: () => (() => Promise<boolean>) | undefined }
let guard: Guard | null = null
/** Set for a moment after someone chose to leave, so the move they asked for is not questioned a second time. */
let leaveUntil = 0
const leaving = () => Date.now() < leaveUntil

const DEFAULT_MESSAGE = 'You have changes that are not saved. Leave without saving them?'

/** Older callers: asks with the browser's own prompt. Prefer askLeave. */
export function confirmLeave(): boolean {
  if (!guard || !guard.dirty() || leaving()) return true
  return window.confirm(guard.message ?? DEFAULT_MESSAGE)
}

/**
 * Asks before leaving a page that has changes nobody has saved, with the site's own box (or the browser prompt where
 * the "leave-dialog" feature is off). Used by the page-change code, so it covers every in-site link.
 */
export async function askLeave(): Promise<boolean> {
  if (!guard || !guard.dirty() || leaving()) return true
  if (!guard.dialog) return window.confirm(guard.message ?? DEFAULT_MESSAGE)
  const { openLeaveDialog } = await import('@/components/ui/unsaved-dialog')
  const ok = await openLeaveDialog({ message: guard.message, onSave: guard.onSave() })
  if (ok) leaveUntil = Date.now() + 1500
  return ok
}

type Options = { message?: string; onSave?: () => Promise<boolean> }

/**
 * While `dirty` is true, leaving the page asks first. Put it in the editor that holds the unsaved work.
 * In-site links show the site's own "Leave without saving?" box (with "Save and leave" when `onSave` is given; it
 * resolves true once saved). Closing or reloading the tab can only ever use the browser's own prompt.
 */
export function useUnsavedGuard(dirty: boolean, options?: string | Options) {
  const o: Options = typeof options === 'string' ? { message: options } : (options ?? {})
  const dialog = useFeature('leave-dialog')
  const now = useRef(dirty)
  now.current = dirty
  const save = useRef(o.onSave)
  save.current = o.onSave
  const message = o.message

  useEffect(() => {
    const mine: Guard = { dirty: () => now.current, message, dialog, onSave: () => save.current }
    guard = mine
    const onBefore = (e: BeforeUnloadEvent) => {
      if (!now.current || leaving()) return
      e.preventDefault()
      e.returnValue = ''
    }
    // Plain links (not only the site's own page-change links) are caught here, before anything else sees the click.
    const onClick = (e: MouseEvent) => {
      if (!dialog || !now.current || leaving() || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null
      if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return
      const url = new URL(a.href, location.href)
      if (url.origin !== location.origin || (url.pathname === location.pathname && url.search === location.search)) return
      e.preventDefault()
      e.stopPropagation()
      void askLeave().then((ok) => {
        if (ok) a.click() // the same click again, now allowed through, so the site's own page change still runs
      })
    }
    window.addEventListener('beforeunload', onBefore)
    window.addEventListener('click', onClick, true)
    return () => {
      if (guard === mine) guard = null
      window.removeEventListener('beforeunload', onBefore)
      window.removeEventListener('click', onClick, true)
    }
  }, [message, dialog])
}
