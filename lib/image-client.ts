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
