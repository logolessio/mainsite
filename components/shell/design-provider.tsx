'use client'

import { createContext, useContext } from 'react'

/** Looks the team can switch on from the dev dashboard. The plain look is the default. */
export type Design = {
  coverZoom: boolean
  coverBorder: boolean
  coverBar: boolean
  coverInfo: boolean
  scrollEffects: boolean
  liquidLoader: boolean
}
const OFF: Design = { coverZoom: false, coverBorder: false, coverBar: false, coverInfo: false, scrollEffects: false, liquidLoader: false }
const Ctx = createContext<Design>(OFF)

export function DesignProvider({ value, children }: { value: Design; children: React.ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
export const useDesign = () => useContext(Ctx)
