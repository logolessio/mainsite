// "Calm mode": a switch that turns the heavy animation off. Kept in the browser, per person.
const KEY = 'logoless:calm'
const listeners = new Set<() => void>()

export const getCalm = () => {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}
export const setCalm = (on: boolean) => {
  try {
    localStorage.setItem(KEY, on ? '1' : '0')
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
