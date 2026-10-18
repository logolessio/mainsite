'use client'

import { createContext, useContext } from 'react'
import { STANDARD_COVER, type CoverText, type LayoutId } from '@/lib/design-choices'

/** Looks the team can switch on from the dev dashboard. The plain look is the default. */
export type Design = {
  coverBorder: boolean
  coverBar: boolean
  scrollEffects: boolean
  liquidLoader: boolean
  /** How the text on a campaign cover looks, and how the campaigns are laid out. */
  cover: CoverText
  layout: LayoutId
}
const OFF: Design = { coverBorder: false, coverBar: false, scrollEffects: false, liquidLoader: false, cover: STANDARD_COVER, layout: 'grid' }
const Ctx = createContext<Design>(OFF)

export function DesignProvider({ value, children }: { value: Design; children: React.ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
export const useDesign = () => useContext(Ctx)
