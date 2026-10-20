// How big the names on the campaign covers are, chosen by each visitor with the "Aa" control on the home page. Kept in the browser.
// It is a multiplier on whatever size the owner chose under Design (Small, Medium, Large), applied as the CSS variable --cover-text.

export const COVER_STEPS = [0.85, 1, 1.15, 1.3, 1.5] as const
const KEY = 'logoless:cover-text'
const listeners = new Set<() => void>()

export function getCoverText(): number {
  try {
    const v = Number(localStorage.getItem(KEY))
    return (COVER_STEPS as readonly number[]).includes(v) ? v : 1
  } catch {
    return 1
  }
}

export function applyCoverText(v = getCoverText()) {
  document.documentElement.style.setProperty('--cover-text', String(v))
}

export function setCoverText(v: number) {
  try {
    if (v === 1) localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, String(v))
  } catch {
    /* private window: it still works for this visit */
  }
  applyCoverText(v)
  listeners.forEach((l) => l())
}

export const subscribeCoverText = (cb: () => void) => {
  listeners.add(cb)
  return () => void listeners.delete(cb)
}
