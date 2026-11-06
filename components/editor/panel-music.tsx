'use client'

import { Music2, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { AUDIO_PLACES, AUDIO_PLAYERS, isMediaUrl } from '@/lib/bio'
import { cn } from '@/lib/utils'
import { MediaField } from './media-field'
import { SongDetails, UploadSong, seedFrom } from './song-details'
import { SongSearch } from './song-search'
import type { EditorApi } from './types'
import { Btn, Group, Row, Slider, Switch } from './ui'
import type { Tags } from '@/lib/audio-tags'

/** A small picture of each player style (nothing runs, so a row of these costs nothing). */
function PlayerThumb({ id }: { id: (typeof AUDIO_PLAYERS)[number]['id'] }) {
  const line = 'block rounded-full bg-white/40'
  return (
    <span aria-hidden="true" className="relative block h-14 w-full overflow-hidden rounded-lg bg-white/[0.04]">
      {id === 'pill' && (
        <span className="absolute bottom-2 left-2 flex h-5 w-16 items-center gap-1 rounded-full border border-white/20 bg-white/10 px-1">
          <span className="size-3 rounded-full bg-white" />
          <span className={cn(line, 'h-[3px] w-8')} />
        </span>
      )}
      {id === 'card' && (
        <span className="absolute right-2 bottom-2 left-2 flex h-8 items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-1.5">
          <span className="size-5 rounded bg-white/50" />
          <span className="grid flex-1 gap-1">
            <span className={cn(line, 'h-[3px] w-full')} />
            <span className={cn(line, 'h-[3px] w-2/3 opacity-60')} />
          </span>
        </span>
      )}
      {id === 'vinyl' && (
        <span className="absolute bottom-1.5 left-2 grid size-10 place-items-center rounded-full border border-white/20 bg-black">
          <span className="size-3.5 rounded-full bg-white/60" />
        </span>
      )}
      {id === 'bar' && (
        <span className="absolute inset-x-0 bottom-0 flex h-5 items-center gap-1.5 border-t border-white/20 bg-white/10 px-2">
          <span className="size-3 rounded bg-white/50" />
          <span className={cn(line, 'h-[3px] flex-1')} />
        </span>
      )}
      {id === 'bubble' && <span className="absolute bottom-2 left-2 size-8 rounded-full border-2 border-white/60 bg-white/20" />}
      {id === 'hidden' && <span className="absolute inset-0 grid place-items-center text-[0.7rem] text-white/35">no player</span>}
    </span>
  )
}

/**
 * Your music: upload a song (MP3, WAV or FLAC), find its details (cover, title, artist, album), and choose how the player looks and where it sits.
 * Only a person's own upload can drive the page's pulse; a pasted link just plays.
 */
export function MusicGroups({ api }: { api: EditorApi }) {
  const { cfg, up, toast } = api
  const au = cfg.audio
  const own = Boolean(au.id) && !isMediaUrl(au.id)
  const [seed, setSeed] = useState('')
  const [fileCover, setFileCover] = useState<Blob | null>(null)
  const done = (id: string, t: Tags) => {
    up('audio', { id, title: t.title, artist: t.artist, album: t.album, cover: '' })
    setSeed(seedFrom(t))
    setFileCover(t.cover)
  }
  return (
    <>
      <Group title="Music" hint="Plays when someone enters your page. Upload a song from your own files, then find its details and the cover comes with them.">
        <UploadSong own={own} onDone={done} toast={toast} />
        {au.id ? (
          <>
            <SongDetails info={{ title: au.title, artist: au.artist, album: au.album, cover: au.cover }} set={(p) => up('audio', p)} seed={seed || seedFrom({ title: au.title, artist: au.artist })} fileCover={fileCover} toast={toast} />
            <Row label="Volume" value={au.volume}>
              <Slider label="Volume" value={au.volume} onChange={(v) => up('audio', { volume: v })} />
            </Row>
            <Switch checked={au.autoplay} onChange={(v) => up('audio', { autoplay: v })} label="Start by itself" hint="When the page is entered. A browser may still wait for one press first." />
            <Switch checked={au.loop} onChange={(v) => up('audio', { loop: v })} label="Loop" />
            {own && <Switch checked={au.reactive} onChange={(v) => up('audio', { reactive: v })} label="The page reacts to it" hint="Your picture pulses with the sound." />}
            <Btn variant="quiet" onClick={() => (up('audio', { id: '', title: '', artist: '', album: '', cover: '' }), setSeed(''), setFileCover(null))}>
              <Trash2 className="size-3.5" /> Remove the music
            </Btn>
          </>
        ) : (
          <>
            <details className="group">
              <summary className="cursor-pointer list-none text-[0.8rem] text-[var(--ed-mute)] transition-colors hover:text-white">No file? Play a 30 second clip of a real song, or paste a link to a file</summary>
              <div className="mt-3 space-y-4">
                <div>
                  <p className="mb-1.5 text-[0.8rem] text-[var(--ed-mute)]">Find a song (plays a 30 second clip, looping)</p>
                  <SongSearch
                    onPick={(s) => (s.preview ? up('audio', { id: s.preview, title: s.title.slice(0, 60), artist: s.artist, album: s.album, cover: s.cover }) : toast('That one has no clip to play. Pick another, or upload the song.'))}
                  />
                </div>
                <MediaField value="" kinds={['audio']} onChange={(v) => up('audio', { id: v })} toast={toast} />
              </div>
            </details>
            <p className="flex items-center gap-2 text-[0.78rem] text-[var(--ed-dim)]">
              <Music2 className="size-3.5" /> Nothing playing yet.
            </p>
          </>
        )}
      </Group>
      {au.id && (
        <Group title="Player" hint="How the music shows on your page, and where.">
          <div className="grid grid-cols-3 gap-2">
            {AUDIO_PLAYERS.map((p) => (
              <button key={p.id} type="button" onClick={() => up('audio', { player: p.id })} aria-pressed={au.player === p.id} title={p.note} className={cn('rounded-xl border p-1.5 text-left transition-[border-color,background,transform] duration-200 hover:-translate-y-px', au.player === p.id ? 'border-white bg-white/[0.07]' : 'border-[var(--ed-line)] hover:border-white/35')}>
                <PlayerThumb id={p.id} />
                <span className="mt-1.5 block px-1 pb-0.5 text-[0.78rem] text-white">{p.name}</span>
              </button>
            ))}
          </div>
          <p className="text-[0.78rem] text-[var(--ed-mute)]">{AUDIO_PLAYERS.find((p) => p.id === au.player)?.note}</p>
          {au.player !== 'hidden' && (
            <>
              <Row label="Where it sits">
                <div className="grid grid-cols-3 gap-1">
                  {AUDIO_PLACES.map((p) => (
                    <button key={p.id} type="button" onClick={() => up('audio', { place: p.id })} aria-pressed={au.place === p.id} className={cn('h-9 rounded-lg border text-[0.76rem] transition-colors', au.place === p.id ? 'border-white bg-white text-black' : 'border-[var(--ed-line)] text-white/70 hover:border-white/35 hover:text-white')}>
                      {p.name}
                    </button>
                  ))}
                </div>
              </Row>
              <Switch checked={au.progress} onChange={(v) => up('audio', { progress: v })} label="Show a bar to skip through" hint="With the time, so people can jump to any part of the song." />
            </>
          )}
        </Group>
      )}
    </>
  )
}

