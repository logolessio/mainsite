'use client'

import { Check, Link2, Loader2, Music2, Sticker, Trash2, Upload, Video } from 'lucide-react'
import { useRef, useState } from 'react'
import { GifPicker } from '@/components/profile/gif-picker'
import { type MediaKind, cleanMediaUrl, imgSrc, isMediaUrl, mediaKindOf } from '@/lib/bio'
import { giphyImage } from '@/lib/profile-extras'
import { cn } from '@/lib/utils'
import { Btn, Input } from './ui'

const EXT: Record<MediaKind, string> = { image: '.jpg, .png, .webp or .gif', video: '.mp4 or .webm', audio: '.mp3, .wav, .flac, .m4a or .ogg' }

/**
 * One of your own files: a picture, a GIF, a video or a song. Upload it (small ones are kept here), or paste a link to it if it is big or already lives
 * somewhere (Discord, Imgur, your own site): a link has no size limit, because the visitor's browser fetches it from there.
 */
export function MediaField({
  value,
  kinds,
  onChange,
  upload,
  accept,
  uploadLabel = 'Upload',
  hint,
  toast,
  round = false,
  gifs = false,
}: {
  /** an upload id, a link, or empty */
  value: string
  kinds: readonly MediaKind[]
  onChange: (ref: string) => void
  /** sends a chosen file to be kept here and gives back its id; leave it out for link-only */
  upload?: (f: File, onProgress?: (done: number) => void) => Promise<string>
  accept?: string
  uploadLabel?: string
  hint?: string
  toast: (m: string) => void
  round?: boolean
  /** also offer the GIF library: search for one and press it */
  gifs?: boolean
}) {
  const file = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [pct, setPct] = useState(0)
  const [asking, setAsking] = useState(false)
  const [picking, setPicking] = useState(false)
  const [text, setText] = useState(isMediaUrl(value) ? value : '')
  const link = isMediaUrl(value)
  const kind = link ? mediaKindOf(value) : kinds[0]
  const types = kinds.map((k) => EXT[k]).join(', or ')

  const pick = async (f: File | undefined) => {
    if (!f || !upload) return
    setBusy(true)
    setPct(0)
    try {
      onChange(await upload(f, setPct))
      setText('')
      setAsking(false)
    } catch (e) {
      toast(e instanceof Error ? e.message : "couldn't upload that. try again.")
    }
    setBusy(false)
  }
  const paste = (v: string) => {
    setText(v)
    const ok = cleanMediaUrl(v, kinds)
    if (ok) onChange(ok)
  }
  const bad = text.trim() !== '' && !cleanMediaUrl(text, kinds)
  const good = text.trim() !== '' && !bad

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className={cn('grid size-14 shrink-0 place-items-center overflow-hidden border border-[var(--ed-line2)] bg-white/[0.05] text-white/45', round ? 'rounded-full' : 'rounded-xl')}>
          {value && kind === 'image' ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imgSrc(value)} alt="" referrerPolicy="no-referrer" className="size-full object-cover" />
          ) : value && kind === 'video' ? (
            <Video className="size-5" strokeWidth={1.6} />
          ) : value && kind === 'audio' ? (
            <Music2 className="size-5" strokeWidth={1.6} />
          ) : upload ? (
            <Upload className="size-5" strokeWidth={1.6} />
          ) : (
            <Link2 className="size-5" strokeWidth={1.6} />
          )}
        </span>
        <div className="flex min-w-0 flex-1 flex-wrap gap-2">
          {upload && (
            <>
              <input ref={file} type="file" accept={accept} hidden onChange={(e) => (void pick(e.target.files?.[0]), (e.target.value = ''))} />
              <Btn onClick={() => file.current?.click()} disabled={busy}>
                {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />} {busy && pct > 0 ? `${Math.round(pct * 100)}%` : value ? 'Change' : uploadLabel}
              </Btn>
            </>
          )}
          {gifs && (
            <Btn onClick={() => setPicking((v) => !v)} aria-expanded={picking}>
              <Sticker className="size-3.5" /> Pick a GIF
            </Btn>
          )}
          <Btn variant={upload || gifs ? 'ghost' : 'solid'} onClick={() => setAsking((v) => !v)} aria-expanded={asking}>
            <Link2 className="size-3.5" /> {link ? 'Change link' : 'Paste a link'}
          </Btn>
          {value && (
            <Btn
              variant="quiet"
              onClick={() => {
                onChange('')
                setText('')
              }}
            >
              <Trash2 className="size-3.5" /> Remove
            </Btn>
          )}
        </div>
      </div>
      {picking && (
        <div className="max-h-80 overflow-auto rounded-xl border border-[var(--ed-line)] p-2">
          <GifPicker
            selected={/giphy\.com\/media\/([A-Za-z0-9]+)\//.exec(value)?.[1]}
            onPick={(g) => {
              onChange(giphyImage(g.id))
              setText('')
              setPicking(false)
            }}
          />
        </div>
      )}
      {asking && (
        <div>
          <Input value={text} onChange={(e) => paste(e.target.value)} placeholder={`https://… ${EXT[kinds[0]].split(' ')[0]}`} inputMode="url" autoCapitalize="off" spellCheck={false} aria-label="Link to the file" autoFocus />
          <p className="mt-1.5 flex items-center gap-1.5 text-[0.74rem] text-[var(--ed-mute)]">
            {good ? (
              <>
                <Check className="size-3.5 text-white/70" /> Using that link.
              </>
            ) : bad ? (
              `That needs to be a direct https link to a file ending in ${types}.`
            ) : (
              `A direct link to the file: ${types}.`
            )}
          </p>
        </div>
      )}
      {hint && <p className="text-[0.74rem] leading-snug text-[var(--ed-mute)]">{hint}</p>}
    </div>
  )
}
