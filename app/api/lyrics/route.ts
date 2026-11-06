import { protect } from '@/lib/guard'
import { HttpError, json, route } from '@/lib/http'
import { type LyricHit, parseLrc, spreadPlain } from '@/lib/lyrics'
import { requireUser } from '@/lib/user'

/**
 * Finds a song's lyrics for the editor, through LRCLIB (https://lrclib.net, a free, open database of synced lyrics). Only the words typed are sent there.
 *   GET /api/lyrics?q=<song and artist>   up to 12 matches
 *   GET /api/lyrics?id=<lrclib id>        that song's lines, with times
 */
const BASE = 'https://lrclib.net/api'
const UA = 'logoless (https://logoless.io)'

type Row = { id: number; trackName: string; artistName: string; albumName: string; duration: number; instrumental: boolean; plainLyrics: string | null; syncedLyrics: string | null }

async function get<T>(path: string): Promise<T> {
  const r = await fetch(`${BASE}${path}`, { headers: { 'user-agent': UA, 'lrclib-client': UA }, signal: AbortSignal.timeout(8000) }).catch(() => null)
  if (!r) throw new HttpError(504, "the lyrics search didn't answer. try again in a moment.")
  if (r.status === 404) throw new HttpError(404, 'no lyrics for that one.')
  if (!r.ok) throw new HttpError(502, "the lyrics search didn't work. try again in a moment.")
  return (await r.json()) as T
}

export const GET = route(async (req: Request) => {
  const user = await requireUser()
  await protect(req, { name: 'lyrics', max: 60, windowSec: 600, userId: user.id })
  const u = new URL(req.url)
  const id = u.searchParams.get('id')
  if (id) {
    if (!/^\d{1,12}$/.test(id)) throw new HttpError(400, 'Unknown song.')
    const row = await get<Row>(`/get/${id}`)
    if (row.instrumental) throw new HttpError(404, "that one's an instrumental. no words to show.")
    const synced = Boolean(row.syncedLyrics)
    const lines = synced ? parseLrc(row.syncedLyrics!) : spreadPlain(row.plainLyrics ?? '', row.duration)
    if (!lines.length) throw new HttpError(404, 'no lyrics for that one.')
    return json({ id: row.id, track: row.trackName, artist: row.artistName, duration: row.duration, synced, lines })
  }
  const q = (u.searchParams.get('q') ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 120)
  if (q.length < 2) return json({ hits: [] })
  const rows = await get<Row[]>(`/search?q=${encodeURIComponent(q)}`)
  const hits: LyricHit[] = rows.slice(0, 12).map((r) => ({ id: r.id, track: r.trackName, artist: r.artistName, album: r.albumName, duration: r.duration, synced: Boolean(r.syncedLyrics), instrumental: r.instrumental }))
  // synced first: they are the ones that move with the song
  hits.sort((a, b) => Number(b.synced) - Number(a.synced))
  return json({ hits })
})
