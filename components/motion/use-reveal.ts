'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'

/**
 * "Reveal on scroll" without the flicker. Whatever is on the screen when the page appears simply stays there: it is never hidden
 * first, because anything that starts invisible is blank in the server's HTML until the page has woken up. Only what is still below
 * the fold when the page wakes up is put away (it cannot be seen yet) and eased in when it scrolls into view.
 *
 *   shown     the normal state, and what the server sends
 *   hidden    below the fold, waiting to scroll into view
 *   revealed  it has scrolled into view (animate this one)
 */
export type RevealState = 'shown' | 'hidden' | 'revealed'

export function useReveal<T extends HTMLElement = HTMLElement>(enabled: boolean, margin = '0px 0px -8% 0px') {
  const ref = useRef<T>(null)
  const [state, setState] = useState<RevealState>('shown')

  useLayoutEffect(() => {
    if (!enabled || !ref.current) return
    if (ref.current.getBoundingClientRect().top > window.innerHeight * 0.94) setState('hidden')
  }, [enabled])

  useEffect(() => {
    if (state !== 'hidden' || !ref.current) return
    const el = ref.current
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setState('revealed')
          io.disconnect()
        }
      },
      { rootMargin: margin },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [state, margin])

  return { ref, state }
}
