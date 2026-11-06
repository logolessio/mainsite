'use client'

import { Check, ImageIcon, Loader2, Music2, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { type Tags, readTags } from '@/lib/audio-tags'
import { uploadAudio, uploadBackground } from '@/lib/image-client'
import { cn } from '@/lib/utils'
import { MediaField } from './media-field'
import { type Song, SongSearch } from './song-search'
import { Btn, Input } from './ui'

export const SONG_ACCEPT = 'audio/mpeg,audio/mp4,audio/ogg,audio/wav,audio/flac,audio/x-flac,.mp3,.m4a,.ogg,.wav,.flac'

/** What the details of a song are (the page's music and a music block both have these). */
export type SongInfo = { title: string; artist: string; album: string; cover: string }

/**
 * Upload a song from your own files (MP3, WAV, FLAC, M4A, OGG). When it is in, what the file says about itself (its tags, or its name) is read, and it is
 * handed over so the song can be looked up: that fills in the title, artist, album and cover.
 */
export function UploadSong({ onDone, toast, own, label }: { onDone: (id: string, tags: Tags, file: File) => void; toast: (m: string) => void; own: boolean; label?: string }) {
  const file = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [pct, setPct] = useState(0)
  const pick = async (f: File | undefined) => {
    if (!f) return
    setBusy(true)
    setPct(0)
    try {
      const id = await uploadAudio(f, setPct)
      onDone(id, await readTags(f), f)
    } catch (e) {
      toast(e instanceof Error ? e.message : "couldn't upload that. try again.")
    }
    setBusy(false)
  }
  return (
    <div className="flex flex-wrap items-center gap-3">
      <input ref={file} type="file" accept={SONG_ACCEPT} hidden onChange={(e) => (void pick(e.target.files?.[0]), (e.target.value = ''))} />
      <Btn variant="solid" onClick={() => file.current?.click()} disabled={busy}>
        {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />} {busy ? (pct > 0 ? `Uploading ${Math.round(pct * 100)}%` : 'Starting…') : own ? 'Change the song' : (label ?? 'Upload a song')}
      </Btn>
      <p className="min-w-0 flex-1 text-[0.78rem] leading-snug text-[var(--ed-mute)]">{own ? 'Your file plays right on the page.' : 'An MP3, WAV, FLAC, M4A or OGG from your own files. Any size that fits your 50 MB.'}</p>
    </div>
  )
}

/**
 * The details of a song: a search (already started from the file's own tags when there are some) that fills in everything with one press, and the fields
 * to correct by hand. If the file had a picture inside it, that can be used as the cover.
 */
export function SongDetails({ info, set, seed, fileCover, toast, searchLabel = 'Find its details' }: { info: SongInfo; set: (p: Partial<SongInfo>) => void; seed: string; fileCover: Blob | null; toast: (m: string) => void; searchLabel?: string }) {
  const [busy, setBusy] = useState(false)
  const [used, setUsed] = useState(false)
  const fill = (s: Song) => {
    set({ title: s.title || info.title, artist: s.artist || info.artist, album: s.album || info.album, cover: s.cover || info.cover })
    setUsed(true)
  }
  const useFileCover = async () => {
    if (!fileCover) return
    setBusy(true)
    try {
      const ext = /png/.test(fileCover.type) ? 'png' : 'jpg'
      set({ cover: await uploadBackground(new File([fileCover], `cover.${ext}`, { type: fileCover.type || 'image/jpeg' })) })
    } catch (e) {
      toast(e instanceof Error ? e.message : "couldn't use that cover. try another.")
    }
    setBusy(false)
  }
  return (
    <div className="space-y-4">
      <div>
        <p className="mb-1.5 flex items-center gap-2 text-[0.8rem] text-[var(--ed-mute)]">
          {searchLabel}
          {used && (
            <span className="inline-flex items-center gap-1 text-white/70">
              <Check className="size-3.5" /> filled in
            </span>
          )}
        </p>
        <SongSearch seed={seed} onPick={fill} placeholder="Song title and artist" />
        <p className="mt-1.5 text-[0.76rem] leading-snug text-[var(--ed-mute)]">Press the right one and the cover, title, artist and album are filled in.</p>
      </div>
      <div className="flex items-start gap-3">
        <span className={cn('grid size-20 shrink-0 place-items-center overflow-hidden rounded-xl border border-[var(--ed-line2)] bg-white/[0.04]')}>
          {info.cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={/^[0-9a-f-]{36}$/.test(info.cover) ? `/api/img/${info.cover}` : info.cover} alt="" referrerPolicy="no-referrer" className="size-full object-cover" />
          ) : (
            <Music2 className="size-6 text-white/35" strokeWidth={1.4} />
          )}
        </span>
        <div className="grid min-w-0 flex-1 gap-2">
          <Input placeholder="Title" value={info.title} maxLength={80} onChange={(e) => set({ title: e.target.value })} aria-label="Title" />
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Artist" value={info.artist} maxLength={80} onChange={(e) => set({ artist: e.target.value })} aria-label="Artist" />
            <Input placeholder="Album" value={info.album} maxLength={80} onChange={(e) => set({ album: e.target.value })} aria-label="Album" />
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {fileCover && (
          <Btn onClick={() => void useFileCover()} disabled={busy}>
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : <ImageIcon className="size-3.5" />} Use the picture inside the file
          </Btn>
        )}
        <details className="group w-full">
          <summary className="cursor-pointer list-none text-[0.78rem] text-[var(--ed-mute)] transition-colors hover:text-white">Or use your own cover picture or GIF</summary>
          <div className="mt-3">
            <MediaField value={info.cover} kinds={['image']} accept="image/*" uploadLabel="Upload a cover" upload={uploadBackground} onChange={(v) => set({ cover: v })} toast={toast} />
          </div>
        </details>
      </div>
    </div>
  )
}

/** The words to start a search with, from what a file said about itself. */
export const seedFrom = (t: Pick<Tags, 'title' | 'artist'>) => [t.artist, t.title].filter(Boolean).join(' ').slice(0, 80)
