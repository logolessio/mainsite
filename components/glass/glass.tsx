'use client'

import type { CSSProperties, ReactNode } from 'react'
import { createContext, useContext } from 'react'
import { LiquidGlass } from '@/components/ui/liquid-glass'
import { cn } from '@/lib/utils'

// One liquid glass for the whole of logoless: the site's own (components/ui/liquid-glass.tsx). The blob lenses and
// the site's bars all draw it, so it is the same dark glass with the same rim light everywhere.

const Intensity = createContext(70)
/** 0 to 100: how strongly the shader glass bends at its rim, for everything below. */
export const GlassProvider = ({ value, children }: { value: number; children: ReactNode }) => <Intensity.Provider value={value}>{children}</Intensity.Provider>
export const useGlassIntensity = () => useContext(Intensity)

export type SurfaceProps = {
  /** corner radius in px, or "pill" for fully round */
  radius?: number | 'pill'
  /** a selection lens, knob or small moving piece: the CSS glass in a lighter tone (no shader, so it can stretch freely) */
  lens?: boolean
  /** draw the CSS glass only */
  flat?: boolean
  /** a pointer-following highlight */
  /** classes for the outer element: its size and place */
  className?: string
  /** style for the outer element */
  style?: CSSProperties
  /** classes for the glass itself: its padding and how its content is laid out */
  inner?: string
  /** replaces the glass's background (a CSS background) */
  tint?: string
  /** pressed or lifted: the glass catches a little more light */
  lifted?: boolean
  /** kept so older calls still compile; the site's glass has one thickness */
  depth?: number
  children?: ReactNode
  [key: string]: unknown
}

/** A piece of the site's liquid glass. */
export function GlassSurface({ radius = 'pill', lens = false, flat = false, className, style, inner, tint, lifted = false, depth, children, ...rest }: SurfaceProps) {
  const intensity = useGlassIntensity()
  void depth
  const rounded = radius === 'pill' ? 'rounded-pill' : ''
  return (
    <LiquidGlass
      rounded={rounded}
      rootClassName={className}
      rootStyle={typeof radius === 'number' ? { borderRadius: radius, ...style } : style}
      flat={flat || lens || intensity <= 0}
      look={{ refraction: 0.4 * Math.max(0.2, intensity / 70) + (lifted ? 0.1 : 0) }}
      className={cn('size-full', lens && 'glass-lens', lifted && 'glass-lifted', inner)}
      style={tint ? { background: tint } : undefined}
      {...rest}
    >
      {children}
    </LiquidGlass>
  )
}
