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
