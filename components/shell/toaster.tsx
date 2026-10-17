'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Check, CircleAlert, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { TOAST_EVENT, type ToastInput } from '@/lib/toast'
import { cn } from '@/lib/utils'

type Item = ToastInput & { id: number }

/**
 * Short messages at the bottom of the screen. They arrive with a soft spring, wait while the pointer is on them, and leave on their
 * own (or with a swipe down). Screen readers hear each one. At most three are shown.
 */
export function Toaster() {
  const [items, setItems] = useState<Item[]>([])
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>())
  const next = useRef(1)

  const drop = useCallback((id: number) => {
    const t = timers.current.get(id)
    if (t) clearTimeout(t)
    timers.current.delete(id)
    setItems((l) => l.filter((x) => x.id !== id))
  }, [])
  const arm = useCallback(
    (id: number, ms: number) => {
      const t = timers.current.get(id)
      if (t) clearTimeout(t)
      timers.current.set(id, setTimeout(() => drop(id), ms))
    },
    [drop],
  )

  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent<ToastInput>).detail
      if (!d?.text) return
      const id = next.current++
      setItems((l) => [...l.filter((x) => x.text !== d.text).slice(-2), { ...d, id }])
      arm(id, d.ms ?? 3400)
    }
    window.addEventListener(TOAST_EVENT, on)
    const map = timers.current
    return () => {
      window.removeEventListener(TOAST_EVENT, on)
      map.forEach(clearTimeout)
    }
  }, [arm])

  return (
    <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-0 bottom-24 z-[250] flex flex-col items-center gap-2 px-4 md:bottom-8">
      <AnimatePresence initial={false}>
        {items.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 24, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97, transition: { duration: 0.18 } }}
            transition={{ type: 'spring', stiffness: 460, damping: 34, mass: 0.7 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.7 }}
            onDragEnd={(_, i) => (i.offset.y > 40 || i.velocity.y > 400) && drop(t.id)}
            onPointerEnter={() => timers.current.get(t.id) && clearTimeout(timers.current.get(t.id))}
            onPointerLeave={() => arm(t.id, 1600)}
            className="pointer-events-auto flex max-w-[min(26rem,100%)] items-center gap-3 rounded-full border border-line-strong bg-[#101012] py-2.5 pr-2.5 pl-4 text-[15px] shadow-[0_18px_40px_-14px_rgb(0_0_0/0.85)]"
          >
            <span className={cn('grid size-6 shrink-0 place-items-center rounded-full', t.tone === 'error' ? 'bg-signal/15 text-signal' : t.tone === 'info' ? 'bg-white/10 text-paper' : 'bg-emerald-400/15 text-emerald-300')}>
              {t.tone === 'error' ? <CircleAlert aria-hidden="true" className="size-3.5" /> : <Check aria-hidden="true" className="size-3.5" />}
            </span>
            <span className="min-w-0 flex-1">{t.text}</span>
            <button type="button" aria-label="Dismiss" onClick={() => drop(t.id)} className="grid size-7 shrink-0 place-items-center rounded-full text-mute transition-colors hover:bg-white/10 hover:text-paper">
              <X aria-hidden="true" className="size-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
