'use client'

import { animate, useInView } from 'framer-motion'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'

/**
 * A number like "$1,234.50" or "12,000". It is shown in full from the first paint (a number that starts at zero and jumps is the
 * worst kind of flicker). Only a number that is still below the fold when the page wakes up is set to zero and counted up when it
 * scrolls into view. Anything that is not a number is shown as is.
 */
export function CountUp({ value }: { value: string }) {
  const m = /^(\D*)([\d,]+(?:\.\d+)?)(\D*)$/.exec(value)
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const [shown, setShown] = useState(value)
  const [armed, setArmed] = useState(false)

  useLayoutEffect(() => {
    if (!m || !ref.current) return
    if (ref.current.getBoundingClientRect().top > window.innerHeight * 0.94) {
      setArmed(true)
      setShown(`${m[1]}0${m[3]}`)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!armed) setShown(value)
  }, [armed, value])

  useEffect(() => {
    if (!m || !armed || !inView) return
    const to = Number(m[2].replace(/,/g, ''))
    const decimals = m[2].includes('.') ? m[2].split('.')[1].length : 0
    const c = animate(0, to, {
      duration: 1.1,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setShown(`${m[1]}${v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${m[3]}`),
      onComplete: () => {
        setShown(value)
        setArmed(false)
      },
    })
    return () => c.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [armed, inView, value])

  return <span ref={ref}>{m ? shown : value}</span>
}
