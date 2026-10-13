// Black is the default and a switch swaps to white. The choice is kept in the browser, per person.
import { isInvitePath, RESERVED_SLUGS } from './invite-shared'

const KEY = 'logoless:theme'
const listeners = new Set<() => void>()

/** Pages that are designed on their own dark canvas keep it: member profiles and artists' private pages. */
export const keepsDark = (pathname: string) => pathname.startsWith('/u/') || pathname.startsWith('/lab') || isInvitePath(pathname)

/** Black unless this person has chosen light. */
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

/** Runs in the page head before anything paints, so a returning visitor who chose light never sees a flash of black. */
export const THEME_BOOT = `(function(){var p=location.pathname,m=/^\\/([^\\/]+)\\/?$/.exec(p),r=${JSON.stringify([...RESERVED_SLUGS])},dark=p.indexOf('/u/')===0||p.indexOf('/lab')===0||p.indexOf('/@')===0||(m&&r.indexOf(m[1].toLowerCase())<0),t=null;try{t=localStorage.getItem('${KEY}')}catch(e){}if(t==='light'&&!dark)document.documentElement.classList.add('light')})()`
