import { db, nowSec, setting } from '../db'
import { discord } from './api'
import { iconIds, setIconCache } from './icon-cache'
import { ICON_NAMES } from './icon-names'
import { SITE_URL } from './ui'

/**
 * The gradient icons as the bot's own emoji. Discord lets an application own emoji (up to 2,000) that work in every message it sends, in titles, in text and on
 * buttons, and nobody needs to add anything to the server. Each icon in public/discord/icons is uploaded once as `lg_<name>`; the ids are kept in the settings table
 * (`discord:icons`) and messages use them through the {ic:name} token (see ui.ts). A request can only make so many calls, so this does a few icons at a time and says
 * how many are left; the dashboard button keeps pressing until none are.
 */
const PER_CALL = 14

type Emoji = { id: string; name: string }

export type UploadResult = { made: string[]; failed: string[]; remaining: number; total: number; note?: string }

/** `replace`: icons that are already on Discord and are drawn again (each is taken down and uploaded anew, so the new picture shows from the next message). */
export async function uploadIcons(opts: { replace?: string[] } = {}): Promise<UploadResult> {
  const appId = await setting('DISCORD_APP_ID')
  if (!appId) return { made: [], failed: [], remaining: ICON_NAMES.length, total: ICON_NAMES.length, note: 'DISCORD_APP_ID is not set.' }
  const listed = await discord<{ items?: Emoji[] }>('GET', `/applications/${appId}/emojis`)
  if (!listed.ok) return { made: [], failed: [], remaining: ICON_NAMES.length, total: ICON_NAMES.length, note: `Discord would not list the emoji (status ${listed.status}). Is the bot token right?` }
  const have: Record<string, string> = {}
  for (const e of Array.isArray(listed.json?.items) ? listed.json!.items! : []) if (e.name.startsWith('lg_')) have[e.name.slice(3)] = e.id
  for (const name of opts.replace ?? []) {
    if (!have[name]) continue
    const gone = await discord('DELETE', `/applications/${appId}/emojis/${have[name]}`)
    if (gone.ok || gone.status === 404) delete have[name]
  }
  const map: Record<string, string> = { ...iconIds(), ...have }
  for (const name of opts.replace ?? []) if (!have[name]) delete map[name]
  const todo = ICON_NAMES.filter((n) => !have[n])
  const made: string[] = []
  const failed: string[] = []
  for (const name of todo.slice(0, PER_CALL)) {
    try {
      const png = await fetch(`${SITE_URL}/discord/icons/${name}.png`)
      if (!png.ok) throw new Error(`picture ${png.status}`)
      const b64 = btoa(String.fromCharCode(...new Uint8Array(await png.arrayBuffer())))
      const res = await discord<Emoji>('POST', `/applications/${appId}/emojis`, { name: `lg_${name}`, image: `data:image/png;base64,${b64}` })
      if (!res.ok || !res.json?.id) throw new Error(`discord ${res.status}`)
      map[name] = res.json.id
      made.push(name)
    } catch {
      failed.push(name)
    }
    await new Promise((r) => setTimeout(r, 250)) // Discord limits how fast emoji can be made
  }
  // only keep ids for icons we still ship
  const keep: Record<string, string> = {}
  for (const n of ICON_NAMES) if (map[n]) keep[n] = map[n]
  await (await db())
    .prepare("INSERT INTO settings (key, value, updated_at) VALUES ('discord:icons', ?1, ?2) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at")
    .bind(JSON.stringify(keep), nowSec())
    .run()
  setIconCache(keep)
  return { made, failed, remaining: ICON_NAMES.filter((n) => !keep[n]).length, total: ICON_NAMES.length }
}

/** How many of the icons Discord has, for the dashboard. */
export const iconCount = () => ({ have: ICON_NAMES.filter((n) => iconIds()[n]).length, total: ICON_NAMES.length })
