'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { useTransitions } from '@/components/shell/transition-provider'
import type { AppNavItem } from './nav-types'

const typing = (t: EventTarget | null) => {
  const el = t as HTMLElement | null
  return Boolean(el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)))
}

/** Press g and then a number to jump to that item in the sidebar. Press ? for the list. Silent while you are typing. */
export function Shortcuts({ items, area }: { items: AppNavItem[]; area: string }) {
  const { navigate } = useTransitions()
  const [help, setHelp] = useState(false)
  const armed = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const disarm = () => {
      if (armed.current) clearTimeout(armed.current)
      armed.current = null
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || typing(e.target)) return
      if (e.key === 'Escape') return setHelp(false)
      if (e.key === '?') return setHelp((v) => !v)
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
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      disarm()
    }
  }, [items, navigate])

  return (
    <AnimatePresence>
      {help && (
        <motion.div key="help" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} onClick={() => setHelp(false)} className="fixed inset-0 z-[80] grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
          <div role="dialog" aria-label="Keyboard shortcuts" onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-3xl border border-line-strong bg-ink/95 p-6">
            <p className="text-lg">Shortcuts</p>
            <p className="mt-1 text-sm text-mute">Press g, then a number, to jump in {area}.</p>
            <ul className="mt-4 grid gap-1 text-[15px]">
              {items.slice(0, 9).map((it, n) => (
                <li key={it.href} className="flex items-center justify-between gap-4 py-1">
                  <span>{it.label}</span>
                  <kbd className="rounded-md border border-line px-1.5 py-0.5 font-mono text-[12px] text-mute">g {n + 1}</kbd>
                </li>
              ))}
              <li className="flex items-center justify-between gap-4 border-t border-line pt-2">
                <span>Search or jump</span>
                <kbd className="rounded-md border border-line px-1.5 py-0.5 font-mono text-[12px] text-mute">⌘K</kbd>
              </li>
            </ul>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
