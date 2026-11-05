'use client'

import qrcode from 'qrcode-generator'
import { Download, Share2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

const QUIET = 2 // empty modules round the code, so phones can find its edges

function build(text: string) {
  const qr = qrcode(0, 'M')
  qr.addData(text)
  qr.make()
  const size = qr.getModuleCount()
  const cells: [number, number][] = []
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (qr.isDark(r, c)) cells.push([r, c])
  return { size, cells }
}

const save = (blob: Blob, name: string) => {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  window.setTimeout(() => URL.revokeObjectURL(a.href), 4000)
}

/** A scannable code for the page's address, to print, post or show on a phone. */
export function ShareCard({ handle }: { handle: string }) {
  const link = `https://logoless.io/${handle}`
  const { size, cells } = useMemo(() => build(link), [link])
  const full = size + QUIET * 2
  const [canShare, setCanShare] = useState(false)
  useEffect(() => setCanShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function'), [])

  const path = useMemo(() => cells.map(([r, c]) => `M${c + QUIET} ${r + QUIET}h1v1h-1z`).join(''), [cells])
  const svg = useMemo(() => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${full} ${full}" shape-rendering="crispEdges"><rect width="${full}" height="${full}" fill="#fff"/><path d="${path}" fill="#0a0a0a"/></svg>`, [full, path])

  const png = () => {
    const px = 16
    const cv = document.createElement('canvas')
    cv.width = cv.height = full * px
    const ctx = cv.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, cv.width, cv.height)
    ctx.fillStyle = '#0a0a0a'
    for (const [r, c] of cells) ctx.fillRect((c + QUIET) * px, (r + QUIET) * px, px, px)
    cv.toBlob((b) => b && save(b, `logoless-${handle}.png`), 'image/png')
  }
  const vector = () => save(new Blob([svg], { type: 'image/svg+xml' }), `logoless-${handle}.svg`)
  const share = () => void navigator.share?.({ title: handle, url: link }).catch(() => {})

  const btn = 'inline-flex h-9 items-center gap-2 rounded-full border border-[var(--ed-line2)] px-4 text-[0.76rem] text-white/80 transition-[background,color,border-color,transform] duration-200 hover:-translate-y-px hover:border-white/30 hover:bg-white/[0.06] hover:text-white'
  return (
    <div className="flex shrink-0 flex-col items-start gap-3 sm:items-center">
      <div role="img" aria-label={`QR code for ${link}`} className="size-[8.5rem] overflow-hidden rounded-2xl bg-white p-0 shadow-[var(--ed-lift)]" dangerouslySetInnerHTML={{ __html: svg.replace('<svg ', '<svg width="100%" height="100%" ') }} />
      <div className="flex flex-wrap gap-2 sm:justify-center">
        <button type="button" onClick={png} className={btn}>
          <Download className="size-3.5" /> PNG
        </button>
        <button type="button" onClick={vector} className={btn}>
          <Download className="size-3.5" /> SVG
        </button>
        {canShare && (
          <button type="button" onClick={share} className={btn}>
            <Share2 className="size-3.5" /> Share
          </button>
        )}
      </div>
    </div>
  )
}
