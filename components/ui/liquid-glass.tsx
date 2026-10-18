'use client'

import { useEffect, useRef, type ElementType, type ReactNode } from 'react'
import { attachGlass, type Look } from '@/lib/liquid-glass'
import { cn } from '@/lib/utils'

/**
 * A pane of real liquid glass. `rootClassName` is the layout of the whole thing (width, margin, sticky...), `rounded` its corners,
 * `className` the glass itself (padding, flex...). Everything inside is ordinary content on top of the glass.
 * Before the glass library is ready, and wherever it cannot run, the CSS glass (.glass-liquid) is what is drawn.
 */
export function LiquidGlass({
  as: Tag = 'div',
  rootClassName,
  rounded = 'rounded-pill',
  className,
  look,
  children,
  ...rest
}: {
  as?: ElementType
  rootClassName?: string
  rounded?: string
  className?: string
  look?: Look
  children?: ReactNode
  [key: string]: unknown
}) {
  const root = useRef<HTMLDivElement>(null)
  const glass = useRef<HTMLElement>(null)
  const lookKey = JSON.stringify(look ?? {})

  useEffect(() => {
    if (!root.current || !glass.current) return
    return attachGlass(root.current, glass.current, look ?? {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lookKey])

  return (
    <div ref={root} className={cn('lg-root relative', rounded, rootClassName)}>
      <span aria-hidden="true" className="lg-scene" />
      <Tag ref={glass} className={cn('glass-liquid lg-glass', className)} {...rest}>
        {children}
      </Tag>
    </div>
  )
}
