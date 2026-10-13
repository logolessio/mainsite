'use client'

import { createContext, useContext } from 'react'

/** Looks the owner can switch on from Admin > Design. The plain look is the default. */
export type Design = { coverEffects: boolean; coverBorder: boolean }
const Ctx = createContext<Design>({ coverEffects: false, coverBorder: false })

export function DesignProvider({ value, children }: { value: Design; children: React.ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
export const useDesign = () => useContext(Ctx)
