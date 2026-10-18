import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

// `rounded-pill` is the site's own full-round corner (it follows the roundness slider under Site, Design), so the merger
// has to know it belongs with the other rounded-* classes: a later rounded-xl still replaces an earlier rounded-pill.
const twMerge = extendTailwindMerge({ extend: { classGroups: { rounded: [{ rounded: ['pill'] }], 'rounded-r': [{ 'rounded-r': ['pill'] }] } } })

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
