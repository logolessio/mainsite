'use client'

import { type MotionValue, motion, useMotionValue, useTransform } from 'framer-motion'
import { createContext, type CSSProperties, type ReactNode, type RefObject, useContext } from 'react'
import type { BioBlock, BioConfig, FreeBox } from '@/lib/bio'

export type BioPageData = {
  handle: string
  name: string
  bio: string
  avatar: string | null
  config: BioConfig
  /** the counter, only when the page shows it */
  views: number | null
  /** small marks next to the name (the account number, OG, founding member) */
  badges?: { id: string; label: string; hint: string }[]
}

/** The editor's hold on the canvas layout: what is selected, and how to move it. Only given to the editor's own preview. */
export type Arrange = {
  selected: string | null
  select: (key: string | null) => void
  /** save where something now sits (the whole box) */
  patch: (key: string, box: FreeBox) => void
  /** line things up with each other and the middle of the page while dragging */
  snap: boolean
}

/** `live` is the real page, `preview` is the editor's copy of it (nothing is counted), `mini` is a small moving picture of a page (the home page). */
export type BioMode = 'live' | 'preview' | 'mini'

export type BioCtx = {
  data: BioPageData
  cfg: BioConfig
  mode: BioMode
  /** the page's scroll position in pixels, smoothed */
  sy: MotionValue<number>
  /** the pointer over the page, -1 to 1 from the middle, smoothed */
  px: MotionValue<number>
  py: MotionValue<number>
  /** how loud the page's music is right now, 0 to 1 (always 0 without music) */
  level: MotionValue<number>
  reduced: boolean
  /** the scrolling box of the page */
  scroller: RefObject<HTMLDivElement | null>
  /** is the entrance (enter screen) finished? */
  entered: boolean
  track: (kind: 'click', id: string) => void
  /** the visible blocks, pinned links first */
  items: BioBlock[]
  socials: Extract<BioBlock, { t: 'social' }>[]
  /** the canvas layout's editing hold (editor preview only) */
  arrange?: Arrange
}

const Ctx = createContext<BioCtx | null>(null)
export const BioProvider = ({ value, children }: { value: BioCtx; children: ReactNode }) => <Ctx.Provider value={value}>{children}</Ctx.Provider>
export function useBio() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useBio outside a bio page')
  return v
}

/**
 * Something that moves against the scroll (`d`: 0 stays put, 0.2 drifts up slowly, -0.2 drifts down) and, with `pointer`, leans a few pixels towards the
 * mouse. The page's own "parallax" setting scales every one of them, and "reduce motion" turns them off.
 */
export function Depth({ d = 0.1, pointer = 0, className, style, children, as }: { d?: number; pointer?: number; className?: string; style?: CSSProperties; children?: ReactNode; as?: 'div' | 'span' | 'section' | 'header' | 'ul' | 'li' }) {
  const { sy, px, py, cfg, reduced } = useBio()
  const k = reduced ? 0 : cfg.fx.parallax / 100
  const y = useTransform([sy, py] as MotionValue<number>[], ([a, b]: number[]) => -a * d * k + b * pointer * k)
  const x = useTransform(px, (v) => v * pointer * k)
  const Tag = motion[as ?? 'div'] as typeof motion.div
  return (
    <Tag className={className} style={{ ...style, x, y, willChange: k ? 'transform' : undefined }}>
      {children}
    </Tag>
  )
}

/** A motion value that is always 0, for pieces that sit in the page without moving. */
export const useStill = () => useMotionValue(0)
