'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

/** A picture that fades in once it has loaded, instead of popping in. Anything else about it works like a plain <img>. */
export function FadeImg({ className, onLoad, onError, alt = '', ...p }: React.ImgHTMLAttributes<HTMLImageElement>) {
  const ref = useRef<HTMLImageElement>(null)
  const [loaded, setLoaded] = useState(false)
  // a picture that arrived before the page woke up has already loaded
  useEffect(() => {
    if (ref.current?.complete) setLoaded(true)
  }, [])
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      alt={alt}
      {...p}
      className={cn('fade-img', loaded && 'is-loaded', className)}
      onLoad={(e) => (setLoaded(true), onLoad?.(e))}
      onError={(e) => (setLoaded(true), onError?.(e))}
    />
  )
}
