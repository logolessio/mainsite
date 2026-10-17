/**
 * What the keyboard can do, in one place. A working area (the dashboards) registers its sidebar here, and the keyboard layer reads it
 * to answer "g then a letter" and to fill the shortcut list. Nothing here touches the page itself.
 */
export type NavKey = { label: string; href: string; key?: string }
export type KeyMap = { area: string; items: NavKey[]; primary?: { label: string; href: string } }

let current: KeyMap | null = null
const listeners = new Set<() => void>()

export const setKeyMap = (m: KeyMap | null) => {
  current = m
  listeners.forEach((l) => l())
}
export const getKeyMap = () => current
export const subscribeKeyMap = (l: () => void) => (listeners.add(l), () => void listeners.delete(l))

/** The public site's own "go to" keys. */
export const PUBLIC_KEYS: NavKey[] = [
  { label: 'Campaigns', href: '/', key: 'h' },
  { label: 'For creators', href: '/for-creators', key: 'c' },
  { label: 'For brands', href: '/for-brands', key: 'b' },
  { label: 'Pricing', href: '/pricing', key: 'p' },
  { label: 'About', href: '/about', key: 'a' },
  { label: 'Questions', href: '/faq', key: 'q' },
  { label: 'Contact', href: '/contact', key: 't' },
]

/** True while someone is typing: letters must go to the field, not to a shortcut. */
export const isTyping = (t: EventTarget | null) => {
  const el = t as HTMLElement | null
  if (!el || !el.tagName) return false
  if (el.isContentEditable) return true
  if (el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') return true
  if (el.tagName === 'INPUT') return !/^(checkbox|radio|button|submit|reset|range|file|color|image)$/.test((el as HTMLInputElement).type)
  return false
}

/** A dialog or menu is open: page shortcuts stay quiet so they cannot act on what is behind it. */
export const blocked = () => typeof document !== 'undefined' && Boolean(document.querySelector('[aria-modal="true"]'))
