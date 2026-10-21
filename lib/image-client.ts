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

export type UploadKind = 'avatar' | 'banner' | 'cover'
const SIZES: Record<UploadKind, [number, number]> = { avatar: [512, 512], banner: [1600, 900], cover: [900, 900] }

export async function uploadImage(kind: UploadKind, file: File): Promise<string> {
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
export async function uploadBackground(file: File): Promise<string> {
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
