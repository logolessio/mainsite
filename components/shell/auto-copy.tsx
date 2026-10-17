'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { norm } from '@/lib/copy-key'
import { applyWording } from '@/lib/wording'
import { useCopy } from './copy-provider'

/** Where the text belongs to the tools themselves, not the site's wording. */
const SKIP_PATHS = ['/admin', '/dev', '/api']
/** Sites whose logo (public/brands) is shown next to their name. */
/** Only when the name stands on its own, like a tag or a label. In the middle of a sentence it is left as plain text. */
const BRAND_ONE = /^\s*(TikTok|YouTube|Instagram|Discord|Twitch|Google)\s*$/i
const brandOf = (text: string): string | null => {
  const m = BRAND_ONE.exec(text)
  return m ? m[1].toLowerCase() : null
}
/** Buttons and links already carry their own icons, so mentions inside them are left alone. */
const NO_ICONS = 'a,button,label,summary,[role=button],[role=tab],[role=radio],[data-no-brand]'
/** Never touched: code, form fields, and anything inside the editor itself. */
const SKIP_SELECTOR = 'script,style,svg,canvas,textarea,input,select,option,code,pre,[contenteditable],[data-text-editor],[data-no-copy],noscript'
/** React marks every element it has taken over. Changing the words of one it has not reached yet would break its hydration. */
const hydrated = (el: Element) => Object.keys(el).some((k) => k.startsWith('__reactFiber$'))

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
    // puts the site's logo before its name; the plain text is kept in data-ac-raw so it can be redone when an edit changes
    const paint = (el: Element, shown: string, raw: string, brand: string) => {
      if (el.getAttribute('data-ac-shown') === shown) return
      const icon = document.createElement('span')
      icon.className = 'ac-brand'
      icon.setAttribute('aria-hidden', 'true')
      icon.style.setProperty('--b', `url(/brands/${brand}.svg)`)
      el.setAttribute('data-ac-raw', raw)
      el.setAttribute('data-ac-shown', shown)
      el.replaceChildren(icon, document.createTextNode(shown))
    }
    const unpaint = (el: Element, text: string) => {
      el.removeAttribute('data-ac-raw')
      el.removeAttribute('data-ac-shown')
      el.replaceChildren(document.createTextNode(text))
    }

    let waiting = 0
    const scan = () => {
      let pending = 0
      // the tab title uses the same wording
      const title = applyWording(document.title)
      if (title !== document.title) document.title = title
      const icons = !(isAdmin && editing) // while the team is editing text, the words stay plain so they can be clicked
      for (const el of document.body.querySelectorAll('*')) {
        const painted = el.hasAttribute('data-ac-raw')
        let node: Node | null = null
        if (!painted) {
          if (el.childNodes.length !== 1) continue
          node = el.firstChild
          if (!node || node.nodeType !== Node.TEXT_NODE) continue
        }
        if (el.closest(SKIP_SELECTOR)) continue
        // a page that is still being taken over by React is left alone for a moment, then looked at again
        if (!painted && waiting < 24 && !hydrated(el)) {
          pending++
          continue
        }
        const was = node ? original.current.get(node) : undefined
        const raw = norm(painted ? (el.getAttribute('data-ac-raw') ?? '') : (was ?? node!.nodeValue ?? ''))
        if (raw.length < 3 || !/[A-Za-z]{2}/.test(raw) || raw.length > 600) continue
        const branded = icons && brandOf(raw) !== null && !el.closest(NO_ICONS)
        // visitors only need the text that has an edit, uses the old wording or mentions a site; the team needs all of it, to be able to edit it
        if (!isAdmin && !hasEdits && !branded && !/clip/i.test(raw)) continue
        if (!painted && !was && edited.has(raw)) continue // already showing an edit (it came through <T>)
        const shown = tx(raw)
        const brand = icons && !el.closest(NO_ICONS) ? brandOf(shown) : null
        if (brand) {
          paint(el, shown, raw, brand)
        } else if (painted) {
          unpaint(el, shown)
        } else if (shown !== raw) {
          if (!was) original.current.set(node!, raw)
          if (node!.nodeValue !== shown) node!.nodeValue = shown
        } else if (was && node!.nodeValue !== was) {
          node!.nodeValue = was // the edit was removed: put the original back
        }
      }
      if (pending > 0) {
        waiting++
        if (timer.current) clearTimeout(timer.current)
        timer.current = setTimeout(scan, 250)
      } else waiting = 0
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
