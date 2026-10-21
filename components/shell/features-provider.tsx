'use client'

import { createContext, useContext } from 'react'

type Value = { dev: boolean; on: Record<string, boolean> }
const Ctx = createContext<Value>({ dev: false, on: {} })

export function FeaturesProvider({ dev, on, children }: Value & { children: React.ReactNode }) {
  return <Ctx.Provider value={{ dev, on }}>{children}</Ctx.Provider>
}

/** True when a feature is switched on for this site (always true on the dev site). */
export const useFeature = (id: string) => useContext(Ctx).on[id] === true
export const useIsDevSite = () => useContext(Ctx).dev
/** Every feature and whether it is on here. */
export const useFeatures = () => useContext(Ctx).on

/** Renders its children only when the feature is on. */
export function Feature({ id, children }: { id: string; children: React.ReactNode }) {
  return useFeature(id) ? <>{children}</> : null
}
