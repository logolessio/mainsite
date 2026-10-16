'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { norm } from '@/lib/copy-key'
import { applyWording } from '@/lib/wording'
import { useCopy } from './copy-provider'

/** Where the text belongs to the tools themselves, not the site's wording. */
const SKIP_PATHS = ['/admin', '/dev', '/api']
/** Never touched: code, form fields, and anything inside the editor itself. */
const SKIP_SELECTOR = 'script,style,svg,canvas,textarea,input,select,option,code,pre,[contenteditable],[data-text-editor],[data-no-copy],noscript'

/**
 * Makes every sentence on the site editable, including text nobody wrapped in <T>. It looks at plain text blocks on the
 * page, registers them for the editor (admins), and puts the edited wording in place wherever an edit exists. Text that is
 * mixed with live numbers or names is skipped on purpose, because it is not one fixed sentence.
 */
export function AutoCopy() {
  const { tx, overrides, isAdmin, editing } = useCopy()
  const pathname = usePathname()
  const original = useRef(new WeakMap<Node, string>())
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (SKIP_PATHS.some((p) => pathname.startsWith(p))) return
    const hasEdits = Object.keys(overrides).length > 0

    const edited = new Set(Object.values(overrides).map(norm))
    const scan = () => {
      // the tab title uses the same wording
      const title = applyWording(document.title)
      if (title !== document.title) document.title = title
      for (const el of document.body.querySelectorAll('*')) {
        if (el.childNodes.length !== 1) continue
        const node = el.firstChild
        if (!node || node.nodeType !== Node.TEXT_NODE) continue
        if (el.closest(SKIP_SELECTOR)) continue
        const was = original.current.get(node)
        const raw = norm(was ?? node.nodeValue ?? '')
        if (raw.length < 3 || !/[A-Za-z]{2}/.test(raw) || raw.length > 600) continue
        // visitors only need the text that has an edit or uses the old wording; the team needs all of it, to be able to edit it
        if (!isAdmin && !hasEdits && !/clip/i.test(raw)) continue
        if (!was && edited.has(raw)) continue // already showing an edit (it came through <T>)
        const shown = tx(raw)
        if (shown !== raw) {
          if (!was) original.current.set(node, raw)
          if (node.nodeValue !== shown) node.nodeValue = shown
        } else if (was && node.nodeValue !== was) {
          node.nodeValue = was // the edit was removed: put the original back
        }
      }
    }
    const later = () => {
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(scan, 500)
    }
    scan()
    const mo = new MutationObserver(later)
    mo.observe(document.body, { childList: true, subtree: true })
    return () => {
      mo.disconnect()
      if (timer.current) clearTimeout(timer.current)
    }
  }, [pathname, tx, overrides, isAdmin, editing])

  return null
}
