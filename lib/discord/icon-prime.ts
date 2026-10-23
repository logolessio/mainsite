import { db } from '../db'
import { setIconCache } from './icon-cache'

let at = 0

/** Loads the icon ids from the settings table (at most once a minute) into the cache the messages read. Never throws. */
export async function primeIcons(): Promise<void> {
  if (Date.now() - at < 60_000) return
  at = Date.now()
  try {
    const row = await (await db()).prepare("SELECT value FROM settings WHERE key = 'discord:icons'").first<{ value: string }>()
    const parsed = row ? (JSON.parse(row.value) as unknown) : {}
    setIconCache(parsed && typeof parsed === 'object' ? (parsed as Record<string, string>) : {})
  } catch {
    /* no icons yet */
  }
}

/** Makes the next `primeIcons` read the table again (after the icons were uploaded). */
export const forgetIcons = () => {
  at = 0
}
