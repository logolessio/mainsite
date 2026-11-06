'use client'

import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { type BioBlock, IMAGE_SHAPES, STATUS_STATES, TAG_STYLES, cleanUrl, imgSrc, isMediaUrl, mediaKindOf } from '@/lib/bio'
import { uploadBackground } from '@/lib/image-client'
import type { Tags } from '@/lib/audio-tags'
import { cn } from '@/lib/utils'
import { MediaField } from './media-field'
import { SongDetails, UploadSong, seedFrom } from './song-details'
import { type Song, SongSearch, lookUp } from './song-search'
import { Btn, Input, Row, Seg, Switch } from './ui'

type Of<T extends BioBlock['t']> = Extract<BioBlock, { t: T }>
type Set = (p: Record<string, unknown>) => void
const UPLOAD = /^[0-9a-f-]{36}$/

/** A song: find it by name (the cover, title and artist come with it), paste its link, or upload your own. */
export function MusicFields({ b, set, toast }: { b: Of<'music'>; set: Set; toast: (m: string) => void }) {
  const [busy, setBusy] = useState(false)
  const [seed, setSeed] = useState('')
  const [fileCover, setFileCover] = useState<Blob | null>(null)
  const [text, setText] = useState(UPLOAD.test(b.url) ? '' : b.url)
  const own = UPLOAD.test(b.url)
  const fill = (s: Song, keepUrl = false) =>
    set({ ...(keepUrl ? {} : { url: s.url }), title: s.title || b.title, artist: s.artist || b.artist || '', album: s.album || b.album || '', cover: s.cover || b.cover || '', preview: s.preview || '' })
  const link = async (v: string) => {
    setText(v)
    const url = cleanUrl(v)
    if (!url) return
    set({ url })
    setBusy(true)
    const s = await lookUp(url)
    setBusy(false)
    if (s) fill({ ...s, url }, true)
  }
  const done = (id: string, t: Tags) => {
    set({ url: id, preview: '', title: t.title, artist: t.artist, album: t.album, cover: '' })
    setText('')
    setSeed(seedFrom(t))
    setFileCover(t.cover)
  }
  return (
    <div className="space-y-4">
      <div>
        <p className="mb-1.5 text-[0.76rem] text-[var(--ed-mute)]">Find a song</p>
        <SongSearch onPick={(s) => (fill(s), setText(s.url))} />
      </div>
      <div>
        <p className="mb-1.5 flex items-center gap-2 text-[0.76rem] text-[var(--ed-mute)]">
          Or paste a link {busy && <Loader2 className="size-3.5 animate-spin" />}
        </p>
        <Input value={text} onChange={(e) => void link(e.target.value)} placeholder="Spotify, Apple Music, SoundCloud, YouTube, Deezer, or a file" inputMode="url" autoCapitalize="off" spellCheck={false} />
        <p className="mt-1.5 text-[0.72rem] leading-snug text-[var(--ed-mute)]">The cover, title and artist are filled in from the link.</p>
      </div>
      <UploadSong own={own} onDone={done} toast={toast} label="Upload your own (mp3, wav, flac)" />
      {own ? (
        <SongDetails info={{ title: b.title, artist: b.artist ?? '', album: b.album ?? '', cover: b.cover ?? '' }} set={(p) => set(p)} seed={seed || seedFrom({ title: b.title, artist: b.artist ?? '' })} fileCover={fileCover} toast={toast} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Title" value={b.title} maxLength={80} onChange={(e) => set({ title: e.target.value })} />
            <Input placeholder="Artist" value={b.artist ?? ''} maxLength={80} onChange={(e) => set({ artist: e.target.value })} />
          </div>
          <MediaField value={b.cover ?? ''} kinds={['image']} accept="image/*" uploadLabel="Cover picture" upload={uploadBackground} onChange={(v) => set({ cover: v })} toast={toast} />
        </>
      )}
      <Switch checked={Boolean(b.player)} onChange={(v) => set({ player: v })} label="Show the full player" hint="The service's own player (Spotify, SoundCloud and so on) instead of the card." />
    </div>
  )
}

/** A picture or GIF on the page. */
export function ImageFields({ b, set, toast }: { b: Of<'image'>; set: Set; toast: (m: string) => void }) {
  return (
    <div className="space-y-3">
      <MediaField value={b.src} kinds={['image']} accept="image/*" uploadLabel="Upload a picture or GIF" gifs upload={uploadBackground} onChange={(v) => set({ src: v })} toast={toast} hint="Your own picture or GIF. Anything that fits your 50 MB." />
      <Input placeholder="A caption (optional)" value={b.title} maxLength={80} onChange={(e) => set({ title: e.target.value })} />
      <Input placeholder="Where it goes when pressed (optional)" value={b.url} inputMode="url" autoCapitalize="off" spellCheck={false} onChange={(e) => set({ url: e.target.value })} onBlur={() => set({ url: cleanUrl(b.url) })} />
      <Row label="Shape">
        <Seg value={b.shape} options={IMAGE_SHAPES} onChange={(v) => set({ shape: v })} />
      </Row>
    </div>
  )
}

/** A row of small labels. Type them with commas between. */
export function TagsFields({ b, set }: { b: Of<'tags'>; set: Set }) {
  const [draft, setDraft] = useState(b.items.join(', '))
  return (
    <div className="space-y-3">
      <Input
        placeholder="Editor, Premiere, After Effects, London"
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value)
          set({ items: e.target.value.split(',').map((x) => x.trim().replace(/^#+/, '')).filter(Boolean).slice(0, 16) })
        }}
      />
      <p className="text-[0.72rem] text-[var(--ed-mute)]">Put a comma between them. Up to 16.</p>
      <Row label="Look">
        <Seg value={b.style} options={TAG_STYLES} onChange={(v) => set({ style: v })} />
      </Row>
    </div>
  )
}

/** A line with a coloured dot. */
export function StatusFields({ b, set }: { b: Of<'status'>; set: Set }) {
  return (
    <div className="space-y-3">
      <Input placeholder="Open for work from May" value={b.text} maxLength={60} onChange={(e) => set({ text: e.target.value })} />
      <Row label="Dot">
        <div role="radiogroup" className="grid grid-cols-4 gap-1 rounded-xl border border-[var(--ed-line)] bg-white/[0.02] p-1">
          {STATUS_STATES.map((s) => (
            <button key={s.id} type="button" role="radio" aria-checked={b.state === s.id} onClick={() => set({ state: s.id })} className={cn('flex h-8 items-center justify-center gap-1.5 rounded-lg text-[0.74rem] transition-colors', b.state === s.id ? 'bg-[#ececec] text-[#0a0a0a]' : 'text-[var(--ed-mute)] hover:text-white')}>
              <span className="size-2 rounded-full" style={{ background: s.dot }} /> {s.name}
            </button>
          ))}
        </div>
      </Row>
    </div>
  )
}

/** The thumbnail shown in a block's row in the list. */
export function blockThumb(b: BioBlock): string | null {
  if (b.t === 'music' && b.cover) return imgSrc(b.cover)
  if (b.t === 'image' && (isMediaUrl(b.src) ? mediaKindOf(b.src) === 'image' : true)) return imgSrc(b.src)
  return null
}
