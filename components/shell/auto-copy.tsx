'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { COPY_ALIASES } from '@/lib/copy-aliases'
import { copyKey, norm } from '@/lib/copy-key'
import { applyWording } from '@/lib/wording'
import { useCopy } from './copy-provider'

/** Where the text belongs to the tools themselves, not the site's wording. */
const SKIP_PATHS = ['/admin', '/dev', '/api']
/** Never touched: code, form fields, and anything inside the editor itself. */
const SKIP_SELECTOR = 'script,style,svg,canvas,textarea,input,select,option,code,pre,[contenteditable],[data-text-editor],[data-no-copy],noscript'
/** React marks every element it has taken over. Changing the words of one it has not reached yet would break its hydration. */
const hydrated = (el: Element) => Object.keys(el).some((k) => k.startsWith('__reactFiber$'))

/**
 * Makes sentences editable that nobody wrapped in <T>: it registers plain text blocks for the editor (admins only) and puts an
 * edit from the text editor in place wherever one exists. Text that is mixed with live numbers or names is skipped on purpose,
 * because it is not one fixed sentence.
 *
 * The site's own wording is no longer swapped in here: it is written into the code, so nothing changes on the page after it
 * has loaded. For visitors this does nothing at all unless an edit made in the editor is still waiting to be moved into the code.
 */
export function AutoCopy() {
  const { tx, overrides, isAdmin } = useCopy()
  const pathname = usePathname()
  const original = useRef(new WeakMap<Node, string>())
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const frame = useRef(0)

  useEffect(() => {
    if (SKIP_PATHS.some((p) => pathname.startsWith(p))) return
    const hasEdits = Object.keys(overrides).length > 0
    if (!isAdmin && !hasEdits) return

    let waiting = 0
    const scan = () => {
      let pending = 0
      for (const el of document.body.querySelectorAll('*')) {
        if (el.childNodes.length !== 1) continue
        const node = el.firstChild
        if (!node || node.nodeType !== Node.TEXT_NODE) continue
        if (el.closest(SKIP_SELECTOR)) continue
        // a page that is still being taken over by React is left alone for a moment, then looked at again
        if (waiting < 24 && !hydrated(el)) {
          pending++
          continue
        }
        const was = original.current.get(node)
        const raw = norm(was ?? node.nodeValue ?? '')
        if (raw.length < 3 || !/[A-Za-z]{2}/.test(raw) || raw.length > 600) continue
        // the team needs every block registered to be able to edit it; visitors only need the ones that have an edit
        const edit = overrides[copyKey(raw)] ?? (COPY_ALIASES[raw] ? overrides[copyKey(COPY_ALIASES[raw])] : undefined)
        if (!isAdmin && edit === undefined) continue
        const shown = isAdmin ? tx(raw) : (edit as string)
        // tx() also swaps in the site wording; only an edit (or going back to the original) changes what is on the page
        const target = shown === applyWording(raw) && edit === undefined ? raw : shown
        if (target !== raw) {
          if (!was) original.current.set(node, raw)
          if (node.nodeValue !== target) node.nodeValue = target
        } else if (was && node.nodeValue !== was) {
          node.nodeValue = was // the edit was removed: put the original back
        }
      }
      if (pending > 0) {
        waiting++
        if (timer.current) clearTimeout(timer.current)
        timer.current = setTimeout(scan, 250)
      } else waiting = 0
    }
    // a change to the page is looked at before the next frame is drawn, so an edit never shows the old words first
    const later = () => {
      if (frame.current) return
      frame.current = requestAnimationFrame(() => {
        frame.current = 0
        scan()
      })
    }
    scan()
    const mo = new MutationObserver(later)
    mo.observe(document.body, { childList: true, subtree: true })
    return () => {
      mo.disconnect()
      if (timer.current) clearTimeout(timer.current)
      if (frame.current) cancelAnimationFrame(frame.current)
      frame.current = 0
    }
  }, [pathname, tx, overrides, isAdmin])

  return null
}
