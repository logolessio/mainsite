'use client'

import { Check, Link2, Loader2, Music2, Trash2, Upload, Video } from 'lucide-react'
import { useRef, useState } from 'react'
import { type MediaKind, cleanMediaUrl, imgSrc, isMediaUrl, mediaKindOf } from '@/lib/bio'
import { cn } from '@/lib/utils'
import { Btn, Input } from './ui'

const EXT: Record<MediaKind, string> = { image: '.jpg, .png, .webp or .gif', video: '.mp4 or .webm', audio: '.mp3, .m4a, .ogg or .wav' }

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
}: {
  /** an upload id, a link, or empty */
  value: string
  kinds: readonly MediaKind[]
  onChange: (ref: string) => void
  /** sends a chosen file to be kept here and gives back its id; leave it out for link-only */
  upload?: (f: File) => Promise<string>
  accept?: string
  uploadLabel?: string
  hint?: string
  toast: (m: string) => void
  round?: boolean
}) {
  const file = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [asking, setAsking] = useState(false)
  const [text, setText] = useState(isMediaUrl(value) ? value : '')
  const link = isMediaUrl(value)
  const kind = link ? mediaKindOf(value) : kinds[0]
  const types = kinds.map((k) => EXT[k]).join(', or ')

  const pick = async (f: File | undefined) => {
    if (!f || !upload) return
    setBusy(true)
    try {
      onChange(await upload(f))
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
          ) : (
            <Upload className="size-5" strokeWidth={1.6} />
          )}
        </span>
        <div className="flex min-w-0 flex-1 flex-wrap gap-2">
          {upload && (
            <>
              <input ref={file} type="file" accept={accept} hidden onChange={(e) => (void pick(e.target.files?.[0]), (e.target.value = ''))} />
              <Btn onClick={() => file.current?.click()} disabled={busy}>
                {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />} {value ? 'Change' : uploadLabel}
              </Btn>
            </>
          )}
          <Btn variant={upload ? 'ghost' : 'solid'} onClick={() => setAsking((v) => !v)} aria-expanded={asking}>
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
