'use client'

import { animate } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { useMotionPrefs } from '@/hooks/use-motion-prefs'

/** A number that rolls from its old value to its new one whenever it changes, so a live calculation feels alive. */
export function LiveNumber({ value, format }: { value: number; format: (n: number) => string }) {
  const { reduced } = useMotionPrefs()
  const [shown, setShown] = useState(value)
  const from = useRef(value)
  useEffect(() => {
    if (reduced) {
      from.current = value
      setShown(value)
      return
    }
    const c = animate(from.current, value, { duration: 0.55, ease: [0.22, 1, 0.36, 1], onUpdate: (v) => setShown(v) })
    from.current = value
    return () => c.stop()
  }, [value, reduced])
  return <span className="tabular-nums">{format(shown)}</span>
}
