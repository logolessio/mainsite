'use client'

import { type MotionValue, useTransform } from 'framer-motion'

/** A scroll-driven value. People who asked for less motion get `rest` instead, and nothing moves. */
export function useMap<T extends number | string>(p: MotionValue<number>, input: number[], output: T[], reduced: boolean, rest: T): MotionValue<T extends number ? number : string> {
  return useTransform(p, input, reduced ? input.map(() => rest) : output) as unknown as MotionValue<T extends number ? number : string>
}
