'use client'

import { useEffect, useRef, type ElementType, type ReactNode } from 'react'
import { useFeature } from '@/components/shell/features-provider'
import { attachGlass, type Look } from '@/lib/liquid-glass'
import { cn } from '@/lib/utils'

/**
 * A pane of real liquid glass. `rootClassName` is the layout of the whole thing (width, margin, sticky...), `rounded` its corners,
 * `className` the glass itself (padding, flex...). Everything inside is ordinary content on top of the glass.
 * Before the glass library is ready, and wherever it cannot run, the CSS glass (.glass-liquid) is what is drawn.
 * With the `solid-surfaces` switch on there is no glass at all: the shader never starts and the CSS draws one flat, slightly grainy surface.
 */
export function LiquidGlass({
  as: Tag = 'div',
  rootClassName,
  rootStyle,
  rounded = 'rounded-pill',
  className,
  look,
  flat = false,
  children,
  ...rest
}: {
  as?: ElementType
  rootClassName?: string
  /** inline style for the outer element (a size, a position) */
  rootStyle?: React.CSSProperties
  rounded?: string
  className?: string
  look?: Look
  /** draw only the CSS glass (no shader): for small pieces that move and stretch, such as a selection lens */
  flat?: boolean
  children?: ReactNode
  [key: string]: unknown
}) {
  const root = useRef<HTMLDivElement>(null)
  const glass = useRef<HTMLElement>(null)
  const lookKey = JSON.stringify(look ?? {})
  const solid = useFeature('solid-surfaces')

  useEffect(() => {
    if (flat || solid || !root.current || !glass.current) return
    return attachGlass(root.current, glass.current, look ?? {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lookKey, flat, solid])

  return (
    <div ref={root} className={cn('lg-root relative', rounded, rootClassName)} style={rootStyle}>
      <span aria-hidden="true" className="lg-scene" />
      <Tag ref={glass} className={cn('glass-liquid lg-glass', className)} {...rest}>
        <span aria-hidden="true" className="lg-light" />
        {children}
      </Tag>
    </div>
  )
}
