// Light mode: a switch that swaps black and white across the site. Kept in the browser, per person.
const KEY = 'logoless:theme'
const listeners = new Set<() => void>()

/** Pages that are designed on their own dark canvas keep it: member profiles. */
export const keepsDark = (pathname: string) => pathname.startsWith('/u/')

export const getLight = () => {
  try {
    return localStorage.getItem(KEY) === 'light'
  } catch {
    return false
  }
}
export const applyTheme = (light: boolean) => document.documentElement.classList.toggle('light', light)
export const setLight = (light: boolean) => {
  try {
    localStorage.setItem(KEY, light ? 'light' : 'dark')
  } catch {
    /* private window: it still works for this visit */
  }
  applyTheme(light && !keepsDark(location.pathname))
  listeners.forEach((l) => l())
}
export const subscribeTheme = (cb: () => void) => {
  listeners.add(cb)
  window.addEventListener('storage', cb)
  return () => {
    listeners.delete(cb)
    window.removeEventListener('storage', cb)
  }
}

/** Runs in the page head before anything paints, so a returning visitor never sees a flash of dark. */
export const THEME_BOOT = `try{if(localStorage.getItem('${KEY}')==='light'&&!location.pathname.startsWith('/u/'))document.documentElement.classList.add('light')}catch(e){}`
