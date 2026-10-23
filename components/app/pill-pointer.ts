'use client'

import { useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

/**
 * What the animated search bars share (the one in the dashboard's top bar and the one in the bottom corner): while the pointer is over the bar, its place
 * is written to four CSS variables on the wrapper (--mx and --my for the light that follows it, --ix and --iy for how far the search chip leans towards it),
 * so nothing is drawn again for it. Put `wrap` on the wrapper (the element with the `sp` class), `chip` on the little round search chip, and spread `bind`
 * on the wrapper. The rest of the effect is plain CSS (.sp-* in globals.css).
 */
export function usePillPointer() {
  const reduced = useReducedMotion()
  const [hover, setHover] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)
  const chip = useRef<HTMLSpanElement>(null)
  const frame = useRef(0)
  useEffect(() => () => cancelAnimationFrame(frame.current), [])

  const move = (e: React.PointerEvent) => {
    if (reduced) return
    const { clientX, clientY } = e
    cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => {
      const w = wrap.current
      if (!w) return
      const r = w.getBoundingClientRect()
      w.style.setProperty('--mx', `${clientX - r.left}px`)
      w.style.setProperty('--my', `${clientY - r.top}px`)
      // the chip leans towards the pointer, a few pixels at most
      const c = chip.current?.getBoundingClientRect()
      if (c) {
        const dx = Math.max(-4, Math.min(4, (clientX - (c.left + c.width / 2)) / 26))
        const dy = Math.max(-3, Math.min(3, (clientY - (c.top + c.height / 2)) / 18))
        w.style.setProperty('--ix', `${dx.toFixed(2)}px`)
        w.style.setProperty('--iy', `${dy.toFixed(2)}px`)
      }
    })
  }
  const leave = () => {
    setHover(false)
    const w = wrap.current
    w?.style.setProperty('--ix', '0px')
    w?.style.setProperty('--iy', '0px')
  }
  return { reduced, hover, wrap, chip, bind: { onPointerEnter: () => setHover(true), onPointerMove: move, onPointerLeave: leave } }
}
