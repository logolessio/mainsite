'use client'

import { usePathname } from 'next/navigation'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { COPY_ALIASES } from '@/lib/copy-aliases'
import { copyKey, norm } from '@/lib/copy-key'
import { applyWording } from '@/lib/wording'

type CopyCtx = {
  overrides: Record<string, string>
  isAdmin: boolean
  editing: boolean
  setEditing: (v: boolean) => void
  /** Returns the edited version of a sentence, or the sentence itself. Also remembers it for the editor. */
  tx: (original: string) => string
}

const Ctx = createContext<CopyCtx>({ overrides: {}, isAdmin: false, editing: false, setEditing: () => {}, tx: (s) => s })
export const useCopy = () => useContext(Ctx)
export const COPY_SEEN = 'logoless:copy-seen'

/** The strings the current page has asked for. The click-to-edit overlay reads this to know what it can edit. */
export const seenCopy = new Map<string, string>()

export function CopyProvider({ overrides, isAdmin, children }: { overrides: Record<string, string>; isAdmin: boolean; children: React.ReactNode }) {
  const [editing, setEditing] = useState(false)
  const pathname = usePathname()
  const pending = useRef(new Map<string, string>())
  const sent = useRef(new Set<string>())
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const path = useRef(pathname)
  path.current = pathname

  const flush = useCallback(() => {
    timer.current = null
    if (!pending.current.size) return
    const items = [...pending.current].map(([key, original]) => ({ key, original, page: path.current }))
    pending.current.clear()
    fetch('/api/admin/content/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ items: items.slice(0, 200) }) }).catch(() => {})
  }, [])

  const tx = useCallback(
    (original: string) => {
      const o = norm(original)
      if (!o) return original
      const key = copyKey(o)
      if (isAdmin && typeof window !== 'undefined') {
        seenCopy.set(key, o)
        if (!sent.current.has(key)) {
          sent.current.add(key)
          pending.current.set(key, o)
          if (!timer.current) timer.current = setTimeout(flush, 1500)
        }
      }
      // an edited sentence is shown exactly as it was written; only text nobody edited gets the site's current wording
      const old = COPY_ALIASES[o]
      return overrides[key] ?? (old ? overrides[copyKey(old)] : undefined) ?? applyWording(original)
    },
    [overrides, isAdmin, flush],
  )

  // On unmount (and in development, where React mounts twice) drop the waiting timer and forget what was queued, so the next mount registers again.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
      timer.current = null
      for (const k of pending.current.keys()) sent.current.delete(k)
      pending.current.clear()
    },
    [],
  )

  const value = useMemo(() => ({ overrides, isAdmin, editing, setEditing, tx }), [overrides, isAdmin, editing, tx])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

/** Wrap a plain sentence to make it editable: <T>Some words</T>. Anything with links or tags inside is left alone. */
export function T({ children }: { children: React.ReactNode }) {
  const { tx } = useCopy()
  const parts = Array.isArray(children) ? children : [children]
  if (parts.every((p) => typeof p === 'string' || typeof p === 'number')) return <>{tx(parts.join(''))}</>
  return <>{children}</>
}
