// Browser-only: what a song file says about itself. MP3 (ID3 tags) and FLAC (Vorbis comments and the picture block) are read for the title, artist, album and
// the cover picture inside the file. Other types (and files with no tags) fall back to the file's name ("Artist - Title.mp3"). Nothing is sent anywhere here:
// the details are only used to search for the song, so the person can pick the right one and fill in the rest.

export type Tags = { title: string; artist: string; album: string; cover: Blob | null }

const latin1 = (b: Uint8Array) => Array.from(b, (c) => String.fromCharCode(c)).join('')
const clip = (s: string) => s.replace(/\u0000/g, '').trim().slice(0, 120)

function decode(b: Uint8Array, enc: number): string {
  try {
    if (enc === 0) return clip(latin1(b))
    if (enc === 3) return clip(new TextDecoder('utf-8').decode(b))
    if (enc === 1) {
      const le = !(b[0] === 0xfe && b[1] === 0xff)
      const body = b[0] === 0xff || b[0] === 0xfe ? b.subarray(2) : b
      return clip(new TextDecoder(le ? 'utf-16le' : 'utf-16be').decode(body))
    }
    return clip(new TextDecoder('utf-16be').decode(b))
  } catch {
    return ''
  }
}

/** Where a string that ends in a zero (or two, for UTF-16) ends, from `from`. */
function endOfString(b: Uint8Array, from: number, enc: number): number {
  const wide = enc === 1 || enc === 2
  for (let i = from; i < b.length; i += wide ? 2 : 1) {
    if (b[i] === 0 && (!wide || b[i + 1] === 0)) return i
  }
  return b.length
}

const synch = (b: Uint8Array, i: number) => ((b[i] & 0x7f) << 21) | ((b[i + 1] & 0x7f) << 14) | ((b[i + 2] & 0x7f) << 7) | (b[i + 3] & 0x7f)
const be32 = (b: Uint8Array, i: number) => ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0
const le32 = (b: Uint8Array, i: number) => (b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24)) >>> 0

async function id3(file: File): Promise<Partial<Tags> | null> {
  const head = new Uint8Array(await file.slice(0, 10).arrayBuffer())
  if (latin1(head.subarray(0, 3)) !== 'ID3') return null
  const ver = head[3]
  const size = Math.min(synch(head, 6), 8 * 1024 * 1024)
  const b = new Uint8Array(await file.slice(10, 10 + size).arrayBuffer())
  const out: Partial<Tags> = {}
  let i = 0
  const idLen = ver === 2 ? 3 : 4
  const hdr = ver === 2 ? 6 : 10
  while (i + hdr < b.length) {
    const id = latin1(b.subarray(i, i + idLen))
    if (!/^[A-Z0-9]{3,4}$/.test(id)) break
    const len = ver === 2 ? (b[i + 3] << 16) | (b[i + 4] << 8) | b[i + 5] : ver === 4 ? synch(b, i + 4) : be32(b, i + 4)
    const body = b.subarray(i + hdr, i + hdr + len)
    i += hdr + len
    if (body.length === 0) continue
    const text = () => decode(body.subarray(1), body[0])
    if (id === 'TIT2' || id === 'TT2') out.title = text()
    else if (id === 'TPE1' || id === 'TP1') out.artist = text()
    else if (id === 'TALB' || id === 'TAL') out.album = text()
    else if ((id === 'APIC' || id === 'PIC') && !out.cover) {
      const enc = body[0]
      let p = 1
      let mime = 'image/jpeg'
      if (id === 'PIC') {
        mime = /png/i.test(latin1(body.subarray(1, 4))) ? 'image/png' : 'image/jpeg'
        p = 4
      } else {
        const e = endOfString(body, 1, 0)
        mime = latin1(body.subarray(1, e)) || mime
        if (!mime.includes('/')) mime = `image/${mime}`
        p = e + 1
      }
      p += 1 // the kind of picture
      const e = endOfString(body, p, enc)
      p = e + (enc === 1 || enc === 2 ? 2 : 1)
      const img = body.subarray(p)
      if (img.length > 200) out.cover = new Blob([img.slice()], { type: mime })
    }
  }
  return out
}

async function flac(file: File): Promise<Partial<Tags> | null> {
  const b = new Uint8Array(await file.slice(0, Math.min(file.size, 8 * 1024 * 1024)).arrayBuffer())
  if (latin1(b.subarray(0, 4)) !== 'fLaC') return null
  const out: Partial<Tags> = {}
  let i = 4
  while (i + 4 < b.length) {
    const last = (b[i] & 0x80) !== 0
    const type = b[i] & 0x7f
    const len = (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]
    const body = b.subarray(i + 4, i + 4 + len)
    i += 4 + len
    if (type === 4 && body.length > 8) {
      // Vorbis comments: vendor, then KEY=value entries, all little-endian lengths
      let p = 4 + le32(body, 0)
      const n = le32(body, p)
      p += 4
      for (let k = 0; k < n && p + 4 <= body.length; k++) {
        const l = le32(body, p)
        const entry = new TextDecoder().decode(body.subarray(p + 4, p + 4 + l))
        p += 4 + l
        const eq = entry.indexOf('=')
        if (eq < 1) continue
        const key = entry.slice(0, eq).toUpperCase()
        const val = clip(entry.slice(eq + 1))
        if (key === 'TITLE') out.title = val
        else if (key === 'ARTIST' && !out.artist) out.artist = val
        else if (key === 'ALBUM') out.album = val
      }
    } else if (type === 6 && !out.cover && body.length > 32) {
      // a picture block: kind, mime, description, size, depth, colours, then the picture, all big-endian
      let p = 4
      const ml = be32(body, p)
      const mime = latin1(body.subarray(p + 4, p + 4 + ml)) || 'image/jpeg'
      p += 4 + ml
      const dl = be32(body, p)
      p += 4 + dl + 16
      const il = be32(body, p)
      const img = body.subarray(p + 4, p + 4 + il)
      if (img.length > 200) out.cover = new Blob([img.slice()], { type: mime })
    }
    if (last) break
  }
  return out
}

/** "01 - Artist - Title.mp3" becomes { artist, title }. */
export function fromFileName(name: string): { title: string; artist: string } {
  const base = name
    .replace(/\.[^.]+$/, '')
    .replace(/[_]+/g, ' ')
    .replace(/^\s*\d{1,3}\s*[-.)]\s*/, '')
    .replace(/\s*[([](official|lyrics?|audio|video|hd|hq|remaster(ed)?)[^)\]]*[)\]]/gi, '')
    .trim()
  const parts = base.split(/\s+[-–—]\s+/)
  if (parts.length >= 2) return { artist: parts[0].trim().slice(0, 80), title: parts.slice(1).join(' - ').trim().slice(0, 80) }
  return { artist: '', title: base.slice(0, 80) }
}

export async function readTags(file: File): Promise<Tags> {
  let found: Partial<Tags> | null = null
  try {
    found = (await id3(file)) ?? (await flac(file))
  } catch {
    found = null
  }
  const guess = fromFileName(file.name)
  return { title: found?.title || guess.title, artist: found?.artist || guess.artist, album: found?.album || '', cover: found?.cover ?? null }
}
