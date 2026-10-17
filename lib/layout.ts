export const CONTAINER = 'mx-auto w-full max-w-[1400px] px-5 md:px-10'

export const EASE_OUT = [0.22, 1, 0.36, 1] as const

/** Springs for things that pop in (dialogs, sheets, toasts): quick, with just enough give to feel physical. */
export const SPRING_POP = { type: 'spring', stiffness: 460, damping: 36, mass: 0.8 } as const
/** A calmer spring for things that glide (indicators, highlights). */
export const SPRING_GLIDE = { type: 'spring', stiffness: 380, damping: 34 } as const
