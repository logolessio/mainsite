// "Calm mode": turns the heavy animation off. It switches itself on when a device struggles, and it can be changed in Settings.
// The choice is kept in the browser, per person. No saved choice means "automatic".
const KEY = 'logoless:calm'
const AUTO = 'logoless:calm-auto'
const listeners = new Set<() => void>()

export const getCalm = () => {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}
/** Has this person chosen for themselves? If not, the site decides. */
export const hasCalmChoice = () => {
  try {
    return localStorage.getItem(KEY) !== null
  } catch {
    return true
  }
}
export const calmWasAutomatic = () => {
  try {
    return localStorage.getItem(AUTO) === '1'
  } catch {
    return false
  }
}
export const setCalm = (on: boolean, automatic = false) => {
  try {
    localStorage.setItem(KEY, on ? '1' : '0')
    if (automatic) localStorage.setItem(AUTO, '1')
    else localStorage.removeItem(AUTO)
  } catch {
    /* private window: it still works for this visit */
  }
  document.documentElement.classList.toggle('calm', on)
  listeners.forEach((l) => l())
}
export const subscribeCalm = (cb: () => void) => {
  listeners.add(cb)
  window.addEventListener('storage', cb)
  return () => {
    listeners.delete(cb)
    window.removeEventListener('storage', cb)
  }
}

export type CalmChoice = 'auto' | 'on' | 'off'
export const getCalmChoice = (): CalmChoice => {
  try {
    const v = localStorage.getItem(KEY)
    return v === null ? 'auto' : v === '1' ? 'on' : 'off'
  } catch {
    return 'auto'
  }
}
/** Go back to letting the site decide. */
export const clearCalmChoice = () => {
  try {
    localStorage.removeItem(KEY)
    localStorage.removeItem(AUTO)
  } catch {
    /* nothing to clear */
  }
  document.documentElement.classList.remove('calm')
  listeners.forEach((l) => l())
}

// Larger text: an accessibility setting that makes every size on the site 12% bigger.
const TEXT = 'logoless:text'
export const getLargeText = () => {
  try {
    return localStorage.getItem(TEXT) === 'large'
  } catch {
    return false
  }
}
export const setLargeText = (on: boolean) => {
  try {
    if (on) localStorage.setItem(TEXT, 'large')
    else localStorage.removeItem(TEXT)
  } catch {
    /* private window */
  }
  document.documentElement.classList.toggle('text-large', on)
  listeners.forEach((l) => l())
}

// Higher contrast and underlined links: two more reading settings, kept in the browser like text size.
const CONTRAST = 'logoless:contrast'
const LINKS = 'logoless:links'
export const getContrast = () => {
  try {
    return localStorage.getItem(CONTRAST) === 'high'
  } catch {
    return false
  }
}
export const setContrast = (on: boolean) => {
  try {
    if (on) localStorage.setItem(CONTRAST, 'high')
    else localStorage.removeItem(CONTRAST)
  } catch {
    /* private window */
  }
  document.documentElement.classList.toggle('contrast', on)
  listeners.forEach((l) => l())
}
export const getUnderline = () => {
  try {
    return localStorage.getItem(LINKS) === 'underline'
  } catch {
    return false
  }
}
export const setUnderline = (on: boolean) => {
  try {
    if (on) localStorage.setItem(LINKS, 'underline')
    else localStorage.removeItem(LINKS)
  } catch {
    /* private window */
  }
  document.documentElement.classList.toggle('underline-links', on)
  listeners.forEach((l) => l())
}
