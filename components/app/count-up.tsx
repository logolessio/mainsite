'use client'

import { animate, useInView } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

/** Counts a number like "$1,234.50" or "12,000" up from zero the first time it scrolls into view. Anything else is shown as is. */
export function CountUp({ value }: { value: string }) {
  const m = /^(\D*)([\d,]+(?:\.\d+)?)(\D*)$/.exec(value)
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const [shown, setShown] = useState(m ? `${m[1]}0${m[3]}` : value)
  useEffect(() => {
    if (!m || !inView) return
    const to = Number(m[2].replace(/,/g, ''))
    const decimals = m[2].includes('.') ? m[2].split('.')[1].length : 0
    const c = animate(0, to, {
      duration: 1.1,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setShown(`${m[1]}${v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${m[3]}`),
      onComplete: () => setShown(value),
    })
    return () => c.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, value])
  return <span ref={ref}>{m ? shown : value}</span>
}
