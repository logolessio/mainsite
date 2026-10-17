'use client'

import { useEffect, useRef } from 'react'

let guard: { dirty: () => boolean; message: string } | null = null

/** Asks before leaving a page that has changes nobody has saved. Used by the page-change code, so it covers every in-site link. */
export function confirmLeave(): boolean {
  if (!guard || !guard.dirty()) return true
  return window.confirm(guard.message)
}

/** While `dirty` is true, closing the tab or following a link asks first. Put it in the editor that holds the unsaved work. */
export function useUnsavedGuard(dirty: boolean, message = 'You have changes that are not saved. Leave without saving them?') {
  const now = useRef(dirty)
  now.current = dirty
  useEffect(() => {
    const mine = { dirty: () => now.current, message }
    guard = mine
    const onBefore = (e: BeforeUnloadEvent) => {
      if (!now.current) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBefore)
    return () => {
      if (guard === mine) guard = null
      window.removeEventListener('beforeunload', onBefore)
    }
  }, [message])
}
