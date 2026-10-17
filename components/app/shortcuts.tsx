'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { useDialog } from '@/hooks/use-dialog'
import { useTransitions } from '@/components/shell/transition-provider'
import type { AppNavItem } from './nav-types'

const typing = (t: EventTarget | null) => {
  const el = t as HTMLElement | null
  return Boolean(el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)))
}

/** What the N key does in each area: the one thing a person most often sets out to do. */
export const PRIMARY: Record<string, { href: string; label: string } | undefined> = {
  Creator: { href: '/', label: 'Find a campaign' },
  Brand: { href: '/brand/campaigns/new', label: 'Start a campaign' },
}

/**
 * Press g and then a number to jump to that item in the sidebar, n for the main thing to do, / for search, ? for this list.
 * Silent while you are typing, and never fires with a modifier held, so it cannot fight the browser's own shortcuts.
 */
export function Shortcuts({ items, area, help, setHelp, openSearch }: { items: AppNavItem[]; area: string; help: boolean; setHelp: (v: boolean) => void; openSearch: () => void }) {
  const { navigate } = useTransitions()
  const armed = useRef<ReturnType<typeof setTimeout> | null>(null)
  const primary = PRIMARY[area]
  const box = useDialog<HTMLDivElement>(help, () => setHelp(false))

  useEffect(() => {
    const disarm = () => {
      if (armed.current) clearTimeout(armed.current)
      armed.current = null
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || typing(e.target)) return
      if (e.key === 'Escape') return setHelp(false)
      if (e.key === '?') return setHelp(!help)
      if (e.key === '/') {
        e.preventDefault()
        return openSearch()
      }
      if (armed.current) {
        disarm()
        const n = Number(e.key)
        const item = Number.isInteger(n) && n >= 1 ? items[n - 1] : undefined
        if (item) {
          e.preventDefault()
          navigate(item.href)
        }
        return
      }
      if (e.key === 'g') armed.current = setTimeout(disarm, 1200)
      else if (e.key === 'n' && primary) navigate(primary.href)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      disarm()
    }
  }, [items, navigate, help, setHelp, openSearch, primary])

  const key = (k: string) => <kbd className="rounded-md border border-line px-1.5 py-0.5 font-mono text-[12px] text-mute">{k}</kbd>

  return (
    <AnimatePresence>
      {help && (
        <motion.div key="help" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} onClick={() => setHelp(false)} className="fixed inset-0 z-[80] grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
          <div ref={box} role="dialog" aria-modal="true" aria-label="Keyboard shortcuts" onClick={(e) => e.stopPropagation()} className="max-h-[88dvh] w-full max-w-sm overflow-y-auto rounded-3xl border border-line-strong bg-ink/95 p-6">
            <p className="text-lg">Shortcuts</p>
            <p className="mt-1 text-sm text-mute">Press g, then a number, to jump in {area}.</p>
            <ul className="mt-4 grid gap-1 text-[15px]">
              {items.slice(0, 9).map((it, n) => (
                <li key={it.href} className="flex items-center justify-between gap-4 py-1">
                  <span>{it.label}</span>
                  {key(`g ${n + 1}`)}
                </li>
              ))}
              <li className="mt-2 flex items-center justify-between gap-4 border-t border-line pt-3">
                <span>Search, or do something</span>
                <span className="flex gap-1.5">
                  {key('/')} {key('⌘ K')}
                </span>
              </li>
              {primary && (
                <li className="flex items-center justify-between gap-4 py-1">
                  <span>{primary.label}</span>
                  {key('n')}
                </li>
              )}
              <li className="flex items-center justify-between gap-4 py-1">
                <span>This list</span>
                {key('?')}
              </li>
              <li className="flex items-center justify-between gap-4 py-1">
                <span>Close anything</span>
                {key('Esc')}
              </li>
            </ul>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
