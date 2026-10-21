import { cleanLinks, EMPTY_EXTRAS, extrasSchema, soundLink, spotifyLink, type CampaignExtras } from './campaign-extras-shared'
import { db, nowSec } from './db'
import { HttpError } from './http'

/**
 * A campaign's music links, official sound, audio preview, background and bio. They live in the settings table
 * ("campaign-extra:<id>"), like the caps, so no database change is needed.
 */
const key = (id: string) => `campaign-extra:${id}`

export async function getExtras(id: string): Promise<CampaignExtras> {
  try {
    const d = await db()
    const r = await d.prepare('SELECT value FROM settings WHERE key = ?1').bind(key(id)).first<{ value: string }>()
    if (!r) return EMPTY_EXTRAS
    const p = extrasSchema.safeParse(JSON.parse(r.value))
    return p.success ? p.data : EMPTY_EXTRAS
  } catch {
    return EMPTY_EXTRAS
  }
}

/**
 * Checks what the browser sent and saves it. Uploads must belong to the person (so nobody can borrow someone else's picture or
 * sound), links are cleaned to the platforms we allow. Returns the audio preview's address for the campaign row, if there is one.
 */
export async function saveExtras(id: string, userId: string, raw: unknown): Promise<{ extras: CampaignExtras; previewUrl: string | null }> {
  const p = extrasSchema.safeParse(raw ?? {})
  if (!p.success) throw new HttpError(400, 'Please check the music links and pictures.')
  const x = p.data
  const extras: CampaignExtras = { ...x, spotify: cleanLinks(x.spotify, spotifyLink), sounds: cleanLinks(x.sounds, soundLink), assets: /^https:\/\//i.test(x.assets) ? x.assets : '' }
  const d = await db()
  for (const [field, kind] of [['audio', 'audio'], ['background', 'background']] as const) {
    if (!extras[field]) continue
    const own = await d.prepare('SELECT id FROM uploads WHERE id = ?1 AND user_id = ?2 AND kind = ?3').bind(extras[field], userId, kind).first()
    if (!own) throw new HttpError(400, field === 'audio' ? 'Upload the audio preview again.' : 'Upload the background picture again.')
  }
  const empty = !extras.spotify.length && !extras.sounds.length && !extras.audioNote && !extras.audio && !extras.background && !extras.bio && !extras.assets
  if (empty) await d.prepare('DELETE FROM settings WHERE key = ?1').bind(key(id)).run()
  else
    await d
      .prepare('INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at')
      .bind(key(id), JSON.stringify(extras), nowSec())
      .run()
  return { extras, previewUrl: extras.audio ? `/api/audio/${extras.audio}` : null }
}
