'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { useMounted } from '@/hooks/use-motion-prefs'
import { useDialog } from '@/hooks/use-dialog'
import { blocked, getKeyMap, isTyping, type NavKey, PUBLIC_KEYS, subscribeKeyMap } from '@/lib/keys'
import { SPRING_POP } from '@/lib/layout'
import { useNavUser } from './nav-user'
import { useTransitions } from './transition-provider'

const visible = (el: HTMLElement) => el.offsetParent !== null || getComputedStyle(el).position === 'fixed'
const ROWS = '[data-kb-row], [data-kb-cell]'
const calm = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

const kbd = 'rounded-md border border-line-strong bg-white/[0.04] px-1.5 py-0.5 font-mono text-[12px] leading-none text-paper/85'
const Key = ({ k }: { k: string }) => <kbd className={kbd}>{k}</kbd>

/** The thing a row or grid cell hands focus to: its marked control, or the first link or button, or itself. */
function focusRow(el: HTMLElement) {
  const inner = el.querySelector<HTMLElement>('[data-kb-focus]') ?? (el.matches('[data-kb-cell]') ? el.querySelector<HTMLElement>('a[href], button:not([disabled])') : null)
  const target = inner ?? el
  if (!target.matches('a[href], button, input, select, textarea, [tabindex]')) target.setAttribute('tabindex', '-1')
  target.focus({ preventScroll: true })
  target.scrollIntoView({ block: 'nearest', behavior: calm() ? 'auto' : 'smooth' })
}

/** The row or cell that holds focus now (or null). */
const currentRow = () => (document.activeElement instanceof HTMLElement ? document.activeElement.closest<HTMLElement>(ROWS) : null)

function moveRows(by: 1 | -1): boolean {
  const list = [...document.querySelectorAll<HTMLElement>(ROWS)].filter(visible)
  if (!list.length) return false
  const at = currentRow()
  const i = at ? list.indexOf(at) : -1
  const next = i < 0 ? (by > 0 ? 0 : list.length - 1) : Math.min(list.length - 1, Math.max(0, i + by))
  focusRow(list[next])
  return true
}

/** Arrow keys inside a grid of cells go to the nearest cell in that direction. */
function moveGrid(dir: 'left' | 'right' | 'up' | 'down'): boolean {
  const here = currentRow()
  if (!here || !here.matches('[data-kb-cell]')) return false
  const grid = here.closest('[data-kb-grid]')
  if (!grid) return false
  const a = here.getBoundingClientRect()
  const ax = a.left + a.width / 2
  const ay = a.top + a.height / 2
  let best: { el: HTMLElement; score: number } | null = null
  for (const el of grid.querySelectorAll<HTMLElement>('[data-kb-cell]')) {
    if (el === here || !visible(el)) continue
    const r = el.getBoundingClientRect()
    const dx = r.left + r.width / 2 - ax
    const dy = r.top + r.height / 2 - ay
    const main = dir === 'left' ? -dx : dir === 'right' ? dx : dir === 'up' ? -dy : dy
    if (main <= 4) continue
    const side = dir === 'left' || dir === 'right' ? Math.abs(dy) : Math.abs(dx)
    const score = main + side * 2.5
    if (!best || score < best.score) best = { el, score }
  }
  if (!best) return false
  focusRow(best.el)
  return true
}

/** Left and right (and Home and End) move between the tabs of a tab list, activating as they go. */
function moveTabs(target: HTMLElement, key: string): boolean {
  const tab = target.closest<HTMLElement>('[role="tab"]')
  const list = tab?.closest<HTMLElement>('[role="tablist"]')
  if (!tab || !list) return false
  const tabs = [...list.querySelectorAll<HTMLElement>('[role="tab"]:not([disabled])')].filter(visible)
  const i = tabs.indexOf(tab)
  const next = key === 'ArrowRight' ? tabs[(i + 1) % tabs.length] : key === 'ArrowLeft' ? tabs[(i - 1 + tabs.length) % tabs.length] : key === 'Home' ? tabs[0] : key === 'End' ? tabs[tabs.length - 1] : null
  if (!next) return false
  next.focus()
  next.click()
  return true
}

/** In a group of radio buttons the arrow keys move the choice, as people expect from a radio group. */
function moveRadios(target: HTMLElement, key: string): boolean {
  const radio = target.closest<HTMLElement>('[role="radio"]')
  const group = radio?.closest<HTMLElement>('[role="radiogroup"]')
  if (!radio || !group || !/^Arrow/.test(key)) return false
  const radios = [...group.querySelectorAll<HTMLElement>('[role="radio"]:not([disabled])')].filter(visible)
  const i = radios.indexOf(radio)
  const next = key === 'ArrowRight' || key === 'ArrowDown' ? radios[(i + 1) % radios.length] : radios[(i - 1 + radios.length) % radios.length]
  if (!next) return false
  next.focus()
  next.click()
  return true
}

/** Up and down move through the links of a menu, such as the sidebar. */
function moveMenu(target: HTMLElement, key: string): boolean {
  const menu = target.closest<HTMLElement>('[data-kb-menu]')
  if (!menu) return false
  const items = [...menu.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')].filter(visible)
  const i = items.indexOf(target.closest<HTMLElement>('a[href], button') ?? target)
  if (i < 0) return false
  const next = key === 'ArrowDown' ? items[Math.min(items.length - 1, i + 1)] : key === 'ArrowUp' ? items[Math.max(0, i - 1)] : key === 'Home' ? items[0] : key === 'End' ? items[items.length - 1] : null
  if (!next) return false
  next.focus()
  return true
}

/** [ and ] switch to the previous or next tab of the page's tab bar. A bar of real tabs on the page comes before the links that move between sibling pages. */
function stepTabs(by: 1 | -1): boolean {
  const all = [...document.querySelectorAll<HTMLElement>('[role="tablist"], [data-kb-tabs]')].filter(visible)
  const inMain = (b: HTMLElement) => Boolean(b.closest('main'))
  const bar = all.find((b) => b.getAttribute('role') === 'tablist' && inMain(b)) ?? all.find((b) => b.getAttribute('role') === 'tablist') ?? all.find(inMain) ?? all[0]
  if (!bar) return false
  const items = [...bar.querySelectorAll<HTMLElement>('[role="tab"], a[href]')].filter(visible)
  if (!items.length) return false
  const i = items.findIndex((x) => x.getAttribute('aria-selected') === 'true' || x.hasAttribute('aria-current'))
  items[(Math.max(0, i) + by + items.length) % items.length].click()
  return true
}

/** What this page can do with the keyboard, found by looking at it. */
function pageKeys() {
  const rows = document.querySelector(ROWS) !== null
  const grid = document.querySelector('[data-kb-grid]') !== null
  const tabs = [...document.querySelectorAll<HTMLElement>('[role="tablist"], [data-kb-tabs]')].some(visible)
  const save = document.querySelector('[data-hotkey-save]') !== null
  const rowKeys = new Map<string, string>()
  for (const el of document.querySelectorAll<HTMLElement>('[data-kb-row] [data-key], [data-kb-keys] [data-key]')) {
    const k = el.dataset.key ?? ''
    if (k && !rowKeys.has(k)) rowKeys.set(k, el.dataset.keyLabel ?? el.textContent?.trim() ?? k)
  }
  return { rows, grid, tabs, save, rowKeys: [...rowKeys.entries()] }
}

const mac = () => typeof navigator !== 'undefined' && /mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent)

/**
 * The keyboard layer for the whole site. It adds, everywhere and at once: "g" then a letter to go somewhere, j and k to move through
 * lists, arrow keys through grids, menus and tabs, [ and ] between tabs, a key per action on the row you are on, ⌘/Ctrl+Enter to send
 * and ⌘/Ctrl+S to save, and "?" for the list of what works on the page you are looking at. It stays quiet while you type or while a
 * dialog is open. It also tells screen readers where a page change landed and moves focus into the new page after a keyboard click.
 */
export function Keyboard() {
  const pathname = usePathname()
  const { navigate } = useTransitions()
  const { user } = useNavUser()
  const map = useSyncExternalStore(subscribeKeyMap, getKeyMap, () => null)
  const [help, setHelp] = useState(false)
  const [armed, setArmed] = useState(false)
  const [said, setSaid] = useState('')
  const mounted = useMounted()
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const byKeyboard = useRef(false)
  const first = useRef(true)
  const box = useDialog<HTMLDivElement>(help, () => setHelp(false))

  const nav: NavKey[] = useMemo(() => (map ? map.items.filter((i) => i.key) : PUBLIC_KEYS.concat(user?.signedIn ? [{ label: 'Your dashboard', href: '/dashboard', key: 'd' }] : [{ label: 'Log in', href: '/login', key: 'l' }])), [map, user?.signedIn])
  const navRef = useRef(nav)
  navRef.current = nav
  const mapRef = useRef(map)
  mapRef.current = map
  const helpRef = useRef(help)
  helpRef.current = help
  useEffect(() => {
    const open = () => setHelp(true)
    window.addEventListener('logoless:help', open)
    return () => window.removeEventListener('logoless:help', open)
  }, [])

  const disarm = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    setArmed(false)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      byKeyboard.current = true
      if (e.defaultPrevented) return
      const t = e.target as HTMLElement | null
      const mod = e.metaKey || e.ctrlKey

      // send and save work from anywhere on the page
      if (mod && e.key === 'Enter' && t instanceof HTMLTextAreaElement && t.form) {
        e.preventDefault()
        t.form.requestSubmit()
        return
      }
      if (mod && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 's') {
        const b = document.querySelector<HTMLButtonElement>('[data-hotkey-save]:not([disabled])')
        if (b) {
          e.preventDefault()
          b.click()
        }
        return
      }
      if (mod || e.altKey) return

      if (isTyping(t)) {
        if (e.key === 'Escape' && !blocked()) t?.blur()
        return
      }
      if (e.key === '?' && helpRef.current) {
        e.preventDefault()
        return setHelp(false)
      }
      if (blocked()) return

      // arrows and Home/End inside the widget that has focus
      if (t && /^(ArrowLeft|ArrowRight|ArrowUp|ArrowDown|Home|End)$/.test(e.key)) {
        if (moveTabs(t, e.key) || moveRadios(t, e.key) || moveMenu(t, e.key)) return e.preventDefault()
        if (e.key.startsWith('Arrow') && moveGrid(e.key.slice(5).toLowerCase() as 'left' | 'right' | 'up' | 'down')) return e.preventDefault()
      }

      // after "g": the next key says where
      if (armed) {
        disarm()
        const k = e.key.toLowerCase()
        const n = Number(k)
        const items = mapRef.current?.items ?? []
        const dest = Number.isInteger(n) && n >= 1 && items[n - 1] ? items[n - 1] : navRef.current.find((i) => i.key === k)
        if (dest) {
          e.preventDefault()
          navigate(dest.href)
        }
        return
      }

      if (e.key === '?') {
        e.preventDefault()
        setHelp((v) => !v)
        return
      }
      if (e.key === 'g') {
        setArmed(true)
        if (timer.current) clearTimeout(timer.current)
        timer.current = setTimeout(() => setArmed(false), 2200)
        return
      }
      if (e.key === 'n' && mapRef.current?.primary) {
        navigate(mapRef.current.primary.href)
        return
      }
      if (e.key === 'j' || e.key === 'k') {
        const by = e.key === 'j' ? 1 : -1
        e.preventDefault()
        // with no list on the page, j and k just scroll
        if (!moveRows(by)) window.scrollBy({ top: by * Math.round(window.innerHeight * 0.35), behavior: calm() ? 'auto' : 'smooth' })
        return
      }
      if ((e.key === '[' || e.key === ']') && stepTabs(e.key === ']' ? 1 : -1)) return e.preventDefault()

      // a key for each action on the row that has focus
      const row = t?.closest<HTMLElement>('[data-kb-row]')
      if (row && e.key.length === 1) {
        const target = [...row.querySelectorAll<HTMLElement>('[data-key]')].find((x) => x.dataset.key === e.key.toLowerCase() && !(x as HTMLButtonElement).disabled)
        if (target) {
          e.preventDefault()
          if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) target.focus()
          else target.click()
        }
      }
    }
    const onPointer = () => {
      byKeyboard.current = false
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onPointer, true)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onPointer, true)
    }
  }, [armed, disarm, navigate])

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), [])

  // after a page change: tell screen readers where they are, and after a keyboard click move focus into the new page
  useEffect(() => {
    const main = document.querySelector<HTMLElement>('main')
    if (main && !main.id) main.id = 'main'
    if (first.current) {
      first.current = false
      return
    }
    const t = window.setTimeout(() => {
      setSaid(document.title.replace(/\s*\|\s*logoless\s*$/i, '') || 'Page')
      const m = document.querySelector<HTMLElement>('main')
      if (m && byKeyboard.current && !m.contains(document.activeElement)) {
        m.setAttribute('tabindex', '-1')
        m.focus({ preventScroll: true })
      }
    }, 180)
    return () => window.clearTimeout(t)
  }, [pathname])

  const page = help ? pageKeys() : null
  const items = map?.items ?? []

  return (
    <>
      {mounted &&
        createPortal(
          <p data-keep-live aria-live="polite" role="status" className="sr-only">
            {said ? `${said}, page loaded` : ''}
          </p>,
          document.body,
        )}

      {/* "g" was pressed: show where each key goes */}
      <AnimatePresence>
        {armed && (
          <motion.div key="go" role="note" initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, transition: { duration: 0.12 } }} transition={SPRING_POP} className="pointer-events-none fixed inset-x-0 bottom-24 z-[240] flex justify-center px-4 md:bottom-10">
            <div className="max-w-xl rounded-3xl border border-line-strong bg-[#101012] px-5 py-4 shadow-[0_24px_60px_-20px_rgb(0_0_0/0.9)]">
              <p className="mb-3 text-xs text-mute">Go to… press a key</p>
              <ul className="flex flex-wrap gap-x-5 gap-y-2.5 text-sm">
                {nav.map((n, i) => (
                  <li key={n.href} className="flex items-center gap-2">
                    <Key k={n.key ?? String(i + 1)} />
                    <span className="text-paper/80">{n.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {help && (
          <motion.div key="help" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} onMouseDown={() => setHelp(false)} className="fixed inset-0 z-[260] grid place-items-center overflow-y-auto bg-black/65 p-4">
            <motion.div ref={box} role="dialog" aria-modal="true" aria-labelledby="kb-title" initial={{ opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, transition: { duration: 0.12 } }} transition={SPRING_POP} onMouseDown={(e) => e.stopPropagation()} className="my-8 w-full max-w-2xl rounded-[28px] border border-line-strong bg-[#0b0b0d] p-6 md:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 id="kb-title" className="font-display text-3xl">
                    Keyboard shortcuts
                  </h2>
                  <p className="mt-1.5 text-sm text-mute">What works on this page. Letters stay quiet while you type.</p>
                </div>
                <button type="button" onClick={() => setHelp(false)} aria-label="Close the shortcut list" className="grid size-10 shrink-0 place-items-center rounded-full border border-line text-paper/70 hover:text-paper">
                  <span aria-hidden="true">✕</span>
                </button>
              </div>

              <div className="mt-6 grid gap-x-10 gap-y-7 md:grid-cols-2">
                <Section title={map ? `Go to, in ${map.area}` : 'Go to'}>
                  {nav.map((n, i) => (
                    <Row key={n.href} keys={['g', n.key ?? String(i + 1)]} text={n.label} />
                  ))}
                  {items.length > 0 && <Row keys={['g', '1–9']} text="Or the number in the menu" />}
                </Section>

                <div className="grid content-start gap-7">
                  <Section title="Everywhere">
                    <Row keys={['/']} alt={[mac() ? '⌘ K' : 'Ctrl K']} text="Search, or do something" />
                    {map?.primary && <Row keys={['n']} text={map.primary.label} />}
                    <Row keys={['?']} text="This list" />
                    <Row keys={['Esc']} text="Close a dialog, or leave a field" />
                    <Row keys={['j']} alt={['k']} text="Scroll down or up" />
                  </Section>

                  {page && (page.rows || page.grid || page.rowKeys.length > 0) && (
                    <Section title={page.rows || page.grid ? 'Lists' : 'On this page'}>
                      {(page.rows || page.grid) && <Row keys={['j']} alt={['k']} text="Next or previous item" />}
                      {page.grid && <Row keys={['←', '↑', '↓', '→']} text="Move across the grid" />}
                      {(page.rows || page.grid) && <Row keys={['Enter']} text="Open it" />}
                      {page.rowKeys.map(([k, label]) => (
                        <Row key={k} keys={[k]} text={label} />
                      ))}
                    </Section>
                  )}
                  {page?.tabs && (
                    <Section title="Tabs">
                      <Row keys={['[']} alt={[']']} text="Previous or next tab" />
                      <Row keys={['←', '→']} text="Between tabs when one has focus" />
                    </Section>
                  )}
                  <Section title="Forms">
                    <Row keys={[mac() ? '⌘' : 'Ctrl', 'Enter']} text="Send a message you are writing" />
                    {page?.save && <Row keys={[mac() ? '⌘' : 'Ctrl', 'S']} text="Save your changes" />}
                  </Section>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2.5 text-xs text-mute">{title}</h3>
      <ul className="grid gap-2">{children}</ul>
    </section>
  )
}

function Row({ keys, alt, text }: { keys: string[]; alt?: string[]; text: string }) {
  return (
    <li className="flex items-center justify-between gap-4 text-[15px]">
      <span className="text-paper/85">{text}</span>
      <span className="flex shrink-0 items-center gap-1">
        {keys.map((k, i) => (k === '+' ? <span key={i} className="px-0.5 text-xs text-mute">then</span> : <Key key={i} k={k} />))}
        {alt && (
          <>
            <span className="px-0.5 text-xs text-mute">or</span>
            {alt.map((k, i) => (
              <Key key={i} k={k} />
            ))}
          </>
        )}
      </span>
    </li>
  )
}
