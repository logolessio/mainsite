'use client'

import { useEffect, useRef } from 'react'

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])'
const visible = (el: HTMLElement) => el.offsetParent !== null || el === document.activeElement

// how many dialogs hold the page still; the page scrolls again only when the last one closes
let locks = 0
let before = ''

/**
 * What every dialog should do: move focus inside when it opens, keep Tab from wandering out behind it, close on Escape, hold the page still,
 * and hand focus back to whatever opened it. Put the returned ref on the dialog's own box.
 * `initial`: where focus lands first ("first" control, the "panel" itself, or "none" when the dialog focuses something itself).
 */
export function useDialog<T extends HTMLElement>(open: boolean, onClose: () => void, opts: { initial?: 'first' | 'panel' | 'none'; lockScroll?: boolean; /** freeze the rest of the page (default). Turn off when the control that closes the dialog sits outside it. */ inert?: boolean } = {}) {
  const panel = useRef<T>(null)
  const close = useRef(onClose)
  close.current = onClose
  const initial = opts.initial ?? 'first'
  const lockScroll = opts.lockScroll !== false
  const freeze = opts.inert !== false

  useEffect(() => {
    if (!open) return
    const returnTo = document.activeElement instanceof HTMLElement ? document.activeElement : null
    if (lockScroll) {
      if (locks === 0) {
        before = document.documentElement.style.overflow
        document.documentElement.style.overflow = 'hidden'
      }
      locks++
    }
    // everything outside the dialog goes inert while it is open: it cannot be tabbed into, clicked, or read out behind it
    const frozen: HTMLElement[] = []
    const settle = window.setTimeout(() => {
      if (!freeze) return
      let node: HTMLElement | null = panel.current
      while (node && node !== document.body) {
        const parent: HTMLElement | null = node.parentElement
        if (!parent) break
        for (const sib of Array.from(parent.children)) {
          if (sib === node || !(sib instanceof HTMLElement) || sib.hasAttribute('inert') || sib.matches('script, style, link, [data-keep-live]')) continue
          sib.setAttribute('inert', '')
          frozen.push(sib)
        }
        node = parent
      }
    }, 0)
    const t = window.setTimeout(() => {
      const el = panel.current
      if (!el || initial === 'none' || el.contains(document.activeElement)) return
      if (initial === 'panel') return el.focus()
      ;(el.querySelector<HTMLElement>('[autofocus]') ?? [...el.querySelectorAll<HTMLElement>(FOCUSABLE)].find(visible) ?? el).focus()
    }, 40)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        return close.current()
      }
      if (e.key !== 'Tab' || !panel.current) return
      const f = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(visible)
      if (!f.length) return e.preventDefault()
      const first = f[0]
      const last = f[f.length - 1]
      const at = document.activeElement
      if (e.shiftKey && (at === first || at === panel.current)) (e.preventDefault(), last.focus())
      else if (!e.shiftKey && (at === last || !panel.current.contains(at))) (e.preventDefault(), first.focus())
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.clearTimeout(t)
      window.clearTimeout(settle)
      frozen.forEach((f) => f.removeAttribute('inert'))
      window.removeEventListener('keydown', onKey)
      if (lockScroll) {
        locks = Math.max(0, locks - 1)
        if (locks === 0) document.documentElement.style.overflow = before
      }
      if (returnTo && returnTo.isConnected) returnTo.focus({ preventScroll: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial, lockScroll, freeze])

  return panel
}
