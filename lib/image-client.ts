// Browser-only: shrink and re-encode a chosen picture, then send it to the upload route.
// Re-encoding through a canvas also strips any hidden data (EXIF, embedded scripts) from the original file.

export async function prepareImage(file: File, w: number, h: number): Promise<string> {
  if (file.size > 12 * 1024 * 1024) throw new Error('That picture is too large. Pick one under 12 MB.')
  const bmp = await createImageBitmap(file).catch(() => {
    throw new Error('That file is not a picture we can read.')
  })
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  const scale = Math.max(w / bmp.width, h / bmp.height)
  const dw = bmp.width * scale
  const dh = bmp.height * scale
  ctx.drawImage(bmp, (w - dw) / 2, (h - dh) / 2, dw, dh)
  for (const q of [0.88, 0.78, 0.66, 0.54, 0.42]) {
    const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, 'image/webp', q))
    if (blob && blob.size <= 420 * 1024) {
      const buf = new Uint8Array(await blob.arrayBuffer())
      let bin = ''
      for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000))
      return btoa(bin)
    }
  }
  throw new Error('That picture is too detailed to shrink enough. Try a simpler one.')
}

/** Everyone has 50 MB of their own; one file can use all of it. The server says exactly how much is left. */
const ALLOWANCE = 50 * 1024 * 1024
const mb = (n: number) => `${(n / 1048576).toFixed(n >= 10485760 ? 0 : 1)} MB`

/**
 * A big file (a song, a video, an animated GIF) is sent as it is, a piece at a time, so there is no size limit except the 50 MB allowance. Reports how far it
 * has got, 0 to 1. If anything goes wrong the half-sent file is thrown away.
 */
async function sendBig(type: 'audio' | 'video' | 'gif', file: File, kind: string | undefined, onProgress?: (done: number) => void): Promise<string> {
  if (file.size > ALLOWANCE) throw new Error(`That file is ${mb(file.size)}. Your whole allowance is 50 MB. Host it anywhere and paste a link to it.`)
  const post = async (step: string, payload: unknown) => {
    const res = await fetch(`/api/me/media?step=${step}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) })
    const j = (await res.json().catch(() => ({}))) as { id?: string; chunk?: number; error?: string }
    if (!res.ok) throw new Error(j.error ?? 'Upload failed.')
    return j
  }
  const begun = await post('begin', { type, kind, size: file.size })
  const id = begun.id as string
  const piece = begun.chunk as number
  try {
    for (let n = 0, off = 0; off < file.size; n++, off += piece) {
      const blob = file.slice(off, off + piece)
      let last = ''
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const res = await fetch(`/api/me/media?id=${id}&n=${n}`, { method: 'PUT', headers: { 'content-type': 'application/octet-stream' }, body: blob })
          if (res.ok) {
            last = ''
            break
          }
          last = ((await res.json().catch(() => ({}))) as { error?: string }).error ?? 'Upload failed.'
          if (res.status < 500) break // retrying will not help
        } catch {
          last = 'The upload was interrupted. Try again.'
        }
        await new Promise((r) => setTimeout(r, 400 * (attempt + 1)))
      }
      if (last) throw new Error(last)
      onProgress?.(Math.min(1, (off + piece) / file.size))
    }
    return ((await post('finish', { id })).id as string) ?? id
  } catch (e) {
    void fetch(`/api/me/media?id=${id}`, { method: 'DELETE' }).catch(() => {})
    throw e
  }
}

/** An animated GIF is sent as it is (a canvas would keep only its first frame). Its shape must fit the place it is going. */
async function uploadGif(kind: string, file: File, maxSide: number, onProgress?: (done: number) => void): Promise<string> {
  const bmp = await createImageBitmap(file).catch(() => {
    throw new Error('That file is not a GIF we can read.')
  })
  const side = Math.max(bmp.width, bmp.height)
  bmp.close()
  if (side > maxSide) throw new Error(`That GIF is ${side} px wide or tall; the most is ${maxSide}. Shrink it, or paste a link to it.`)
  return sendBig('gif', file, kind, onProgress)
}

export type UploadKind = 'avatar' | 'banner' | 'cover' | 'background' | 'cursor'
const SIZES: Record<UploadKind, [number, number]> = { avatar: [512, 512], banner: [1600, 900], cover: [900, 900], background: [1600, 900], cursor: [64, 64] }

export async function uploadImage(kind: UploadKind, file: File, onProgress?: (done: number) => void): Promise<string> {
  if (file.type === 'image/gif' && kind !== 'cursor') return uploadGif(kind, file, SIZES[kind][0], onProgress)
  const data = await prepareImage(file, ...SIZES[kind])
  const res = await fetch('/api/me/upload', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind, data }) })
  const j = (await res.json().catch(() => ({}))) as { id?: string; error?: string }
  if (!res.ok || !j.id) throw new Error(j.error ?? 'Upload failed.')
  return j.id
}

/**
 * A banner keeps its own shape when it is taller than 16 by 9 (up to square), so the profile can grow to fit it.
 * Wider pictures are trimmed to 16 by 9 as before. Returns the upload id and the shape (height / width).
 */
export async function uploadBanner(file: File): Promise<{ id: string; aspect: number }> {
  if (file.size > 12 * 1024 * 1024) throw new Error('That picture is too large. Pick one under 12 MB.')
  const bmp = await createImageBitmap(file).catch(() => {
    throw new Error('That file is not a picture we can read.')
  })
  const aspect = Math.min(1, Math.max(9 / 16, bmp.height / bmp.width))
  bmp.close()
  const w = aspect > 0.75 ? 1200 : 1600
  const h = Math.round(w * aspect)
  const data = await prepareImage(file, w, h)
  return { id: await send('banner', data), aspect: Math.round((h / w) * 1000) / 1000 }
}

/** A full-page background picture: up to 1920 on its longest side, its shape kept. */
export async function uploadBackground(file: File, onProgress?: (done: number) => void): Promise<string> {
  if (file.type === 'image/gif') return uploadGif('background', file, 1920, onProgress)
  const bmp = await createImageBitmap(file).catch(() => {
    throw new Error('That file is not a picture we can read.')
  })
  const s = Math.min(1, 1920 / Math.max(bmp.width, bmp.height))
  const [w, h] = [Math.max(32, Math.round(bmp.width * s)), Math.max(32, Math.round(bmp.height * s))]
  bmp.close()
  return send('background', await prepareImage(file, w, h))
}

/** A looping video for the page background (MP4 or WebM). Sent as it is, a piece at a time: any size that fits the allowance. */
export async function uploadBgVideo(file: File, onProgress?: (done: number) => void): Promise<string> {
  if (!/^video\/(mp4|webm)$/.test(file.type)) throw new Error('Pick an MP4 or WebM video.')
  return sendBig('video', file, undefined, onProgress)
}

async function send(kind: string, data: string) {
  const res = await fetch('/api/me/upload', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind, data }) })
  const j = (await res.json().catch(() => ({}))) as { id?: string; error?: string }
  if (!res.ok || !j.id) throw new Error(j.error ?? 'Upload failed.')
  return j.id
}

/** A song: MP3, M4A, OGG, WAV or FLAC, any size that fits the allowance. The server checks the real type. */
export async function uploadAudio(file: File, onProgress?: (done: number) => void): Promise<string> {
  return sendBig('audio', file, undefined, onProgress)
}

/**
 * A cursor picture: any picture or SVG, drawn on a 64 by 64 canvas (its shape kept, transparency kept) and sent as a PNG. Going through a canvas also means an
 * SVG never reaches the server as an SVG: only a plain picture does.
 */
export async function uploadCursor(file: File): Promise<string> {
  if (file.size > 2 * 1024 * 1024) throw new Error('That picture is too large. Pick one under 2 MB.')
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((ok, no) => {
      const i = new Image()
      i.onload = () => ok(i)
      i.onerror = () => no(new Error('That file is not a picture we can read.'))
      i.src = url
    })
    const size = 64
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!
    const w = img.naturalWidth || size
    const h = img.naturalHeight || size
    const k = Math.min(size / w, size / h)
    ctx.drawImage(img, (size - w * k) / 2, (size - h * k) / 2, w * k, h * k)
    const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, 'image/png'))
    if (!blob) throw new Error('That picture could not be prepared.')
    const buf = new Uint8Array(await blob.arrayBuffer())
    let bin = ''
    for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000))
    return send('cursor', btoa(bin))
  } finally {
    URL.revokeObjectURL(url)
  }
}

/* ---- files hosted for a link (see lib/buzzheavier.ts) */

export type HostStatus = { enabled: boolean; maxBytes: number; quotaBytes: number; maxFiles: number; files: number; bytes: number }
export type HostedFile = { id: string; url: string; name: string; size: number }

export async function hostStatus(): Promise<HostStatus | null> {
  try {
    const r = await fetch('/api/me/host', { cache: 'no-store' })
    return r.ok ? ((await r.json()) as HostStatus) : null
  } catch {
    return null
  }
}

/** Sends a file as it is (no re-encoding, no wrapping) and reports how far it has got, 0 to 1. */
export function hostFile(file: File, onProgress?: (done: number) => void): Promise<HostedFile> {
  return new Promise((resolve, reject) => {
    const x = new XMLHttpRequest()
    x.open('PUT', `/api/me/host?name=${encodeURIComponent(file.name)}`)
    x.setRequestHeader('content-type', file.type || 'application/octet-stream')
    x.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total)
    x.onload = () => {
      let j: (HostedFile & { error?: string }) | null = null
      try {
        j = JSON.parse(x.responseText)
      } catch {
        /* not JSON */
      }
      if (x.status >= 200 && x.status < 300 && j?.url) resolve(j)
      else reject(new Error(j?.error ?? 'The upload did not go through. Try again.'))
    }
    x.onerror = () => reject(new Error('The upload was interrupted. Try again.'))
    x.send(file)
  })
}

export async function removeHosted(id: string): Promise<void> {
  const r = await fetch(`/api/me/host?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
  if (!r.ok) throw new Error(((await r.json().catch(() => ({}))) as { error?: string }).error ?? "couldn't remove that file.")
}
