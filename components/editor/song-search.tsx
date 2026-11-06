'use client'

import { Loader2, Music2, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

export type Song = { title: string; artist: string; album: string; cover: string; preview: string; url: string }

/** What a song link says about itself (cover, title, artist), or null if it is not one we can read. */
export async function lookUp(url: string): Promise<Song | null> {
  try {
    const r = await fetch(`/api/music?url=${encodeURIComponent(url)}`, { cache: 'no-store' })
    return r.ok ? ((await r.json()) as { song: Song }).song : null
  } catch {
    return null
  }
}

/** Type a song's name, see the matches with their covers, and press one: everything about it is filled in. */
export function SongSearch({ onPick, placeholder = 'Search for a song or an artist' }: { onPick: (s: Song) => void; placeholder?: string }) {
  const [q, setQ] = useState('')
  const [songs, setSongs] = useState<Song[] | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    const t = q.trim()
    if (t.length < 2) return setSongs(null)
    setBusy(true)
    const ctl = new AbortController()
    const id = window.setTimeout(() => {
      fetch(`/api/music?q=${encodeURIComponent(t)}`, { signal: ctl.signal, cache: 'no-store' })
        .then((r) => (r.ok ? (r.json() as Promise<{ songs: Song[] }>) : { songs: [] }))
        .then((j) => {
          setSongs(j.songs)
          setBusy(false)
        })
        .catch(() => undefined)
    }, 320)
    return () => {
      ctl.abort()
      window.clearTimeout(id)
    }
  }, [q])
  return (
    <div>
      <div className="flex h-10 items-center gap-2.5 rounded-xl border border-[var(--ed-line)] bg-white/[0.03] px-3.5 transition-colors focus-within:border-white/40">
        {busy ? <Loader2 className="size-4 shrink-0 animate-spin text-white/45" /> : <Search className="size-4 shrink-0 text-white/45" />}
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} aria-label="Search for a song" spellCheck={false} className="h-full min-w-0 flex-1 bg-transparent text-[0.88rem] text-white outline-none placeholder:text-white/25" />
      </div>
      {songs && (
        <ul className={cn('mt-2 max-h-72 divide-y divide-[var(--ed-line)] overflow-y-auto rounded-xl border border-[var(--ed-line)]', songs.length === 0 && 'hidden')}>
          {songs.map((s) => (
            <li key={`${s.url}${s.title}`}>
              <button
                type="button"
                onClick={() => {
                  onPick(s)
                  setQ('')
                  setSongs(null)
                }}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-white/[0.06]"
              >
                <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-white/[0.06]">
                  {s.cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.cover} alt="" referrerPolicy="no-referrer" className="size-full object-cover" />
                  ) : (
                    <Music2 className="size-4 text-white/40" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.84rem] text-white">{s.title}</span>
                  <span className="block truncate text-[0.72rem] text-[var(--ed-mute)]">{[s.artist, s.album].filter(Boolean).join(' · ')}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {songs && songs.length === 0 && !busy && <p className="mt-2 text-[0.76rem] text-[var(--ed-mute)]">Nothing found. Try the artist too, or paste a link instead.</p>}
    </div>
  )
}
