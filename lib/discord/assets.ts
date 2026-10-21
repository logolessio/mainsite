import { getCloudflareContext } from '@opennextjs/cloudflare'

/**
 * Reads a file from the site's own public folder (fonts and the logo for the picture cards). On Cloudflare it comes straight from the
 * static assets binding, with no trip over the internet; on a developer machine it is fetched from the running site. Kept in memory
 * once read, because the same few files are used for every card.
 */
const memo = new Map<string, Promise<ArrayBuffer | null>>()

async function read(path: string, origin: string): Promise<ArrayBuffer | null> {
  try {
    const { env } = await getCloudflareContext({ async: true })
    const assets = (env as { ASSETS?: { fetch: (r: Request | string) => Promise<Response> } }).ASSETS
    if (assets) {
      const res = await assets.fetch(new Request(new URL(path, 'https://assets.local')))
      if (res.ok) return await res.arrayBuffer()
    }
  } catch {
    /* not on Cloudflare, or no assets binding */
  }
  try {
    const res = await fetch(new URL(path, origin), { signal: AbortSignal.timeout(5000) })
    if (res.ok) return await res.arrayBuffer()
  } catch {
    /* nothing more to try */
  }
  return null
}

export function asset(path: string, origin: string): Promise<ArrayBuffer | null> {
  let p = memo.get(path)
  if (!p) {
    p = read(path, origin).then((b) => {
      if (!b) memo.delete(path) // try again next time
      return b
    })
    memo.set(path, p)
  }
  return p
}

export const dataUri = (b: ArrayBuffer, type: string) => {
  let s = ''
  const bytes = new Uint8Array(b)
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return `data:${type};base64,${btoa(s)}`
}

/**
 * A picture for a card, as a data address: a static file (the covers) from the assets, anything else on the site (uploaded covers
 * under /api/img) through the worker's own binding, and full addresses fetched as they are. null when it cannot be read, or it is
 * a kind the card renderer cannot draw.
 */
export async function imageData(src: string | null | undefined, origin: string): Promise<string | null> {
  if (!src) return null
  try {
    let res: Response | null = null
    if (src.startsWith('/') && !src.startsWith('/api/')) {
      const b = await asset(src, origin)
      if (b) return dataUri(b, /\.png$/i.test(src) ? 'image/png' : 'image/jpeg')
      return null
    }
    const url = src.startsWith('/') ? new URL(src, origin).toString() : src
    if (src.startsWith('/')) {
      try {
        const { env } = await getCloudflareContext({ async: true })
        const self = (env as { WORKER_SELF_REFERENCE?: { fetch: (r: Request) => Promise<Response> } }).WORKER_SELF_REFERENCE
        if (self) res = await self.fetch(new Request(url))
      } catch {
        /* fall back to a plain fetch */
      }
    }
    if (!res) res = await fetch(url, { signal: AbortSignal.timeout(5000) })
    const type = (res.headers.get('content-type') ?? '').split(';')[0]
    if (!res.ok || !/^image\/(png|jpe?g)$/.test(type)) return null
    const b = await res.arrayBuffer()
    return b.byteLength > 4_000_000 ? null : dataUri(b, type)
  } catch {
    return null
  }
}
