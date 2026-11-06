// A visitor's own choices for every page on logoless, kept in this browser only (nothing is sent to the server). Set on /preferences.
// Reading settings that already existed (calm, larger text, contrast, underlined links) stay in lib/calm.ts under their own keys.

export type VisitorPrefs = {
  /** let page music start by itself once a page is entered */
  autoplay: boolean
  /** the loudest any page's music gets, 0 to 100 percent of what the page asks for */
  volume: number
  /** use the normal pointer instead of a page's own cursor and trail */
  plainCursor: boolean
  /** hide music visualisers */
  noVisualisers: boolean
}

export const PREFS_KEY = 'logoless:prefs'
export const DEFAULT_PREFS: VisitorPrefs = { autoplay: true, volume: 100, plainCursor: false, noVisualisers: false }

const listeners = new Set<() => void>()
let cache: VisitorPrefs | null = null
let cacheRaw: string | null | undefined

export function getPrefs(): VisitorPrefs {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(PREFS_KEY)
  } catch {
    /* blocked storage: the defaults */
  }
  if (cache && raw === cacheRaw) return cache
  cacheRaw = raw
  try {
    const j = raw ? (JSON.parse(raw) as Partial<VisitorPrefs>) : {}
    cache = {
      autoplay: typeof j.autoplay === 'boolean' ? j.autoplay : DEFAULT_PREFS.autoplay,
      volume: typeof j.volume === 'number' && j.volume >= 0 && j.volume <= 100 ? Math.round(j.volume) : DEFAULT_PREFS.volume,
      plainCursor: typeof j.plainCursor === 'boolean' ? j.plainCursor : DEFAULT_PREFS.plainCursor,
      noVisualisers: typeof j.noVisualisers === 'boolean' ? j.noVisualisers : DEFAULT_PREFS.noVisualisers,
    }
  } catch {
    cache = DEFAULT_PREFS
  }
  return cache
}

export const serverPrefs = () => DEFAULT_PREFS

export function setPrefs(patch: Partial<VisitorPrefs>) {
  const next = { ...getPrefs(), ...patch }
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(next))
  } catch {
    cache = next // private window: kept for this visit
  }
  listeners.forEach((l) => l())
}

export function subscribePrefs(cb: () => void) {
  listeners.add(cb)
  window.addEventListener('storage', cb)
  return () => {
    listeners.delete(cb)
    window.removeEventListener('storage', cb)
  }
}

/* ------------------------------------------------------------------ what this browser keeps for logoless, and clearing it */

export type StoredItem = { where: 'local' | 'session' | 'cache'; key: string; bytes: number; label: string }

const LABELS: [RegExp, string][] = [
  [/^logoless:prefs$/, 'Your choices on this page'],
  [/^logoless:calm/, 'Less motion'],
  [/^logoless:text$/, 'Larger text'],
  [/^logoless:contrast$/, 'Higher contrast'],
  [/^logoless:links$/, 'Underlined links'],
  [/^logoless:guides$/, 'Editor tips you closed'],
  [/^logoless:editor/, 'Editor layout (last section, preview size)'],
  [/^bio-seen:/, 'Pages you opened this visit (so a view counts once)'],
]
const labelFor = (k: string) => LABELS.find(([re]) => re.test(k))?.[1] ?? 'Other site data'
const ours = (k: string) => k.startsWith('logoless:') || k.startsWith('bio-seen:')

/** Everything logoless has put in this browser, with a size and a plain name. */
export async function listStored(): Promise<StoredItem[]> {
  const out: StoredItem[] = []
  for (const [where, store] of [
    ['local', safe(() => localStorage)],
    ['session', safe(() => sessionStorage)],
  ] as const) {
    if (!store) continue
    for (let i = 0; i < store.length; i++) {
      const k = store.key(i)
      if (!k || !ours(k)) continue
      out.push({ where, key: k, bytes: (k.length + (store.getItem(k)?.length ?? 0)) * 2, label: labelFor(k) })
    }
  }
  try {
    if (typeof caches !== 'undefined') for (const name of await caches.keys()) out.push({ where: 'cache', key: name, bytes: 0, label: 'Saved files' })
  } catch {
    /* no cache storage */
  }
  return out
}

/** Removes everything logoless keeps in this browser. Sign-in cookies are left alone (log out for those). */
export async function clearStored() {
  for (const store of [safe(() => localStorage), safe(() => sessionStorage)]) {
    if (!store) continue
    const keys: string[] = []
    for (let i = 0; i < store.length; i++) {
      const k = store.key(i)
      if (k && ours(k)) keys.push(k)
    }
    keys.forEach((k) => store.removeItem(k))
  }
  try {
    if (typeof caches !== 'undefined') await Promise.all((await caches.keys()).map((n) => caches.delete(n)))
  } catch {
    /* nothing to clear */
  }
  cache = null
  document.documentElement.classList.remove('calm', 'text-large', 'contrast', 'underline-links')
  listeners.forEach((l) => l())
}

function safe<T>(f: () => T): T | null {
  try {
    return f()
  } catch {
    return null
  }
}

/** Run before the page paints (app/layout.tsx), so the reading settings never flash. */
export const PREFS_BOOT = `try{var s=localStorage,c=document.documentElement.classList;s.getItem('logoless:calm')==='1'&&c.add('calm');s.getItem('logoless:text')==='large'&&c.add('text-large');s.getItem('logoless:contrast')==='high'&&c.add('contrast');s.getItem('logoless:links')==='underline'&&c.add('underline-links')}catch(e){}`
