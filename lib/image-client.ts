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

/** An animated GIF is sent as it is (a canvas would keep only its first frame), so it must already be small. */
export async function prepareGif(file: File, maxSide: number): Promise<string> {
  if (file.size > 1300 * 1024) throw new Error('That GIF is over 1.3 MB. Make it smaller, or host it anywhere and paste a link to it.')
  const bmp = await createImageBitmap(file).catch(() => {
    throw new Error('That file is not a GIF we can read.')
  })
  const side = Math.max(bmp.width, bmp.height)
  bmp.close()
  if (side > maxSide) throw new Error(`That GIF is ${side} px wide or tall; the most is ${maxSide}. Shrink it, or paste a link to it.`)
  const buf = new Uint8Array(await file.arrayBuffer())
  let bin = ''
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000))
  return btoa(bin)
}

export type UploadKind = 'avatar' | 'banner' | 'cover' | 'background' | 'cursor'
const SIZES: Record<UploadKind, [number, number]> = { avatar: [512, 512], banner: [1600, 900], cover: [900, 900], background: [1600, 900], cursor: [64, 64] }

export async function uploadImage(kind: UploadKind, file: File): Promise<string> {
  const data = file.type === 'image/gif' && kind !== 'cursor' ? await prepareGif(file, SIZES[kind][0]) : await prepareImage(file, ...SIZES[kind])
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
export async function uploadBackground(file: File): Promise<string> {
  if (file.type === 'image/gif') return send('background', await prepareGif(file, 1920))
  const bmp = await createImageBitmap(file).catch(() => {
    throw new Error('That file is not a picture we can read.')
  })
  const s = Math.min(1, 1920 / Math.max(bmp.width, bmp.height))
  const [w, h] = [Math.max(32, Math.round(bmp.width * s)), Math.max(32, Math.round(bmp.height * s))]
  bmp.close()
  return send('background', await prepareImage(file, w, h))
}

/** A short looping video for the page background. Sent as it is, so it must already be small. */
export async function uploadBgVideo(file: File): Promise<string> {
  if (!/^video\/(mp4|webm)$/.test(file.type)) throw new Error('Pick an MP4 or WebM video.')
  if (file.size > 1300 * 1024) throw new Error('That video is too large. Keep it under 1.3 MB: a few seconds at a small size.')
  const buf = new Uint8Array(await file.arrayBuffer())
  let bin = ''
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000))
  return send('bgvideo', btoa(bin))
}

async function send(kind: string, data: string) {
  const res = await fetch('/api/me/upload', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind, data }) })
  const j = (await res.json().catch(() => ({}))) as { id?: string; error?: string }
  if (!res.ok || !j.id) throw new Error(j.error ?? 'Upload failed.')
  return j.id
}

/** A short audio preview (MP3, M4A, OGG or WAV, up to 1 MB). The server checks the real type. */
export async function uploadAudio(file: File): Promise<string> {
  if (file.size > 1024 * 1024) throw new Error('That file is too large. Keep the preview under 1 MB (about 30 seconds of MP3).')
  const buf = new Uint8Array(await file.arrayBuffer())
  let bin = ''
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000))
  const res = await fetch('/api/me/audio', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ data: btoa(bin) }) })
  const j = (await res.json().catch(() => ({}))) as { id?: string; error?: string }
  if (!res.ok || !j.id) throw new Error(j.error ?? 'Upload failed.')
  return j.id
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
