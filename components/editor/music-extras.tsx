'use client'

import { Captions, Check, Loader2, Minus, Plus, Search, Trash2, X } from 'lucide-react'
import { type ReactNode, useEffect, useState } from 'react'
import { LYRIC_PLACES, LYRIC_STYLES, SOUND_PRESETS, VISUALISERS, VIS_PLACES, type VisualiserKind, audioSrc, isMediaUrl } from '@/lib/bio'
import type { LyricHit } from '@/lib/lyrics'
import { cn } from '@/lib/utils'
import type { EditorApi } from './types'
import { Btn, Group, Row, Seg, Slider, Switch } from './ui'

/*
 * The parts of the Music section that change how the song sounds and what it draws: Sound (slowed + reverb and the rest), the visualiser, and synced lyrics
 * found by searching for the song. Sound and the visualiser need an uploaded song (one from another address can't be routed through the page's sound chain).
 */

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`
/** The preview's own audio element, for "sync to now". */
const previewAudio = () => document.querySelector<HTMLAudioElement>('[aria-label="preview"] .bio-root audio')

/** A grid of named choices, one on. */
function Choices<T extends string>({ value, options, onChange, cols = 3 }: { value: T; options: readonly { id: T; name: string; note?: string }[]; onChange: (v: T) => void; cols?: number }) {
  return (
    <div role="radiogroup" className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={value === o.id} onClick={() => onChange(o.id)} title={o.note} className={cn('min-h-9 rounded-lg border px-2 py-1.5 text-left text-[0.76rem] transition-colors', value === o.id ? 'border-white bg-white text-black' : 'border-[var(--ed-line)] text-[var(--ed-mute)] hover:border-white/40 hover:text-white')}>
          {o.name}
          {o.note && <span className={cn('mt-0.5 block text-[0.66rem] leading-tight', value === o.id ? 'text-black/60' : 'text-white/35')}>{o.note}</span>}
        </button>
      ))}
    </div>
  )
}

/** A small "?" that explains a control on hover or focus. */
function Hint({ children }: { children: ReactNode }) {
  return (
    <span className="group/hint relative inline-grid size-4 cursor-help place-items-center rounded-full border border-white/25 text-[0.6rem] text-white/50" tabIndex={0}>
      ?
      <span role="tooltip" className="pointer-events-none absolute right-0 bottom-full z-50 mb-2 w-56 rounded-lg border border-[var(--ed-line2)] bg-black px-3 py-2 text-[0.72rem] leading-snug text-white/80 opacity-0 transition-opacity group-hover/hint:opacity-100 group-focus/hint:opacity-100">
        {children}
      </span>
    </span>
  )
}

/** How long the page's song is (for "this looks like a full song" and to match lyrics to it). */
function useSongLength(id: string) {
  const [len, setLen] = useState<number | null>(null)
  useEffect(() => {
    if (!id) return setLen(null)
    const a = new Audio()
    a.preload = 'metadata'
    a.onloadedmetadata = () => setLen(Number.isFinite(a.duration) ? a.duration : null)
    a.src = audioSrc(id)
    return () => {
      a.src = ''
    }
  }, [id])
  return len
}

export function MusicExtras({ api }: { api: EditorApi }) {
  const { cfg } = api
  const au = cfg.audio
  const songLen = useSongLength(au.id)
  if (!au.id) return null
  const own = !isMediaUrl(au.id)
  return (
    <>
      {own && <SoundGroup api={api} songLen={songLen} />}
      {own && <VisualiserGroup api={api} />}
      <LyricsGroup api={api} songLen={songLen} />
    </>
  )
}

function SoundGroup({ api, songLen }: { api: EditorApi; songLen: number | null }) {
  const { cfg, up } = api
  const au = cfg.audio
  const preset = SOUND_PRESETS.find((p) => Object.entries(p.set).every(([k, v]) => au[k as keyof typeof au] === v))?.id ?? null
  return (
    <Group title="Sound" hint="How the song plays. Press play in the preview to hear it change as you drag.">
      <div className="grid grid-cols-3 gap-1.5">
        {SOUND_PRESETS.map((p) => (
          <button key={p.id} type="button" onClick={() => up('audio', { ...p.set })} aria-pressed={preset === p.id} className={cn('h-9 rounded-lg border text-[0.74rem] transition-colors', preset === p.id ? 'border-white bg-white text-black' : 'border-[var(--ed-line)] text-[var(--ed-mute)] hover:text-white')}>
            {p.name}
          </button>
        ))}
      </div>
      <Row label="Speed" value={`${(au.speed / 100).toFixed(2)}×`}>
        <Slider label="Speed" min={50} max={150} value={au.speed} onChange={(v) => up('audio', { speed: v })} />
      </Row>
      <Switch checked={au.pitch} onChange={(v) => up('audio', { pitch: v })} label="Keep the pitch" hint="Off is the classic slowed sound: slower is also deeper, like a record." />
      <Row label="Reverb" value={au.reverb}>
        <Slider label="Reverb" value={au.reverb} onChange={(v) => up('audio', { reverb: v })} />
      </Row>
      <Row label="Bass boost" value={au.bass}>
        <Slider label="Bass boost" value={au.bass} onChange={(v) => up('audio', { bass: v })} />
      </Row>
      <Row label="Muffle (another room)" value={au.muffle}>
        <Slider label="Muffle" value={au.muffle} onChange={(v) => up('audio', { muffle: v })} />
      </Row>
      <Row label="Fade in" value={`${au.fade.toFixed(1)} s`}>
        <Slider label="Fade in" min={0} max={10} step={0.5} value={au.fade} onChange={(v) => up('audio', { fade: v })} />
      </Row>
      <Row label="Start at" value={fmt(au.start)}>
        <Slider label="Start at" min={0} max={Math.max(30, Math.floor(songLen ?? 600))} value={au.start} onChange={(v) => up('audio', { start: v })} />
      </Row>
      <p className="text-[0.74rem] text-[var(--ed-dim)]">It loops back to the start point, so you can skip a slow intro.</p>
      <Switch checked={au.speeds} onChange={(v) => up('audio', { speeds: v })} label="Let visitors switch the sound" hint="A button on the player: normal, slowed or sped up." />
    </Group>
  )
}

/** A tiny drawing of each visualiser, for its button. */
function VisIcon({ kind }: { kind: VisualiserKind }) {
  const bars = [5, 9, 6, 12, 8, 11, 4, 7]
  const s = { stroke: 'currentColor', fill: 'none', strokeWidth: 1.4, strokeLinecap: 'round' as const }
  return (
    <svg viewBox="0 0 32 16" className="h-4 w-8" aria-hidden="true">
      {kind === 'none' && <path d="M4 8h24" {...s} strokeDasharray="2 3" />}
      {kind === 'bars' && bars.map((h, i) => <rect key={i} x={2 + i * 3.6} y={15 - h} width={2.2} height={h} rx={1} fill="currentColor" />)}
      {kind === 'mirror' && bars.map((h, i) => <rect key={i} x={2 + i * 3.6} y={8 - h / 2} width={2.2} height={h} rx={1} fill="currentColor" />)}
      {kind === 'blocks' && bars.map((h, i) => Array.from({ length: Math.round(h / 3) }, (_, k) => <rect key={`${i}${k}`} x={2 + i * 3.6} y={13 - k * 3} width={2.4} height={2} fill="currentColor" />))}
      {kind === 'dots' && bars.map((h, i) => Array.from({ length: Math.round(h / 3) }, (_, k) => <circle key={`${i}${k}`} cx={3 + i * 3.6} cy={14 - k * 3} r={1} fill="currentColor" />))}
      {kind === 'wave' && <path d="M2 8q3-7 6 0t6 0 6 0 6 0 4 0" {...s} />}
      {kind === 'line' && <path d="M2 12 C6 4, 10 13, 14 7 S22 3, 30 10" {...s} />}
      {kind === 'spectrum' && <path d="M2 15 L2 12 C6 4, 10 13, 14 7 S22 3, 30 10 L30 15 Z" fill="currentColor" opacity={0.6} />}
      {kind === 'circle' && (
        <g {...s}>
          <circle cx={16} cy={8} r={3.5} />
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i / 12) * Math.PI * 2
            const l = 2 + (i % 3)
            return <path key={i} d={`M${16 + Math.cos(a) * 4.5} ${8 + Math.sin(a) * 4.5}L${16 + Math.cos(a) * (4.5 + l)} ${8 + Math.sin(a) * (4.5 + l)}`} />
          })}
        </g>
      )}
      {kind === 'rings' && (
        <g {...s}>
          <circle cx={16} cy={8} r={2} />
          <circle cx={16} cy={8} r={4.5} opacity={0.7} />
          <circle cx={16} cy={8} r={7} opacity={0.4} />
        </g>
      )}
      {kind === 'burst' && <path d="M16 1 L18 6 L23 4 L20 8 L24 12 L18 10 L16 15 L14 10 L8 12 L12 8 L9 4 L14 6 Z" fill="currentColor" opacity={0.7} />}
    </svg>
  )
}

function VisualiserGroup({ api }: { api: EditorApi }) {
  const { cfg, up } = api
  const v = cfg.vis
  const round = v.kind === 'circle' || v.kind === 'rings' || v.kind === 'burst'
  return (
    <Group title="Visualiser" hint="the music, drawn on your page. the preview shows it moving even before you press play.">
      <div className="grid grid-cols-4 gap-1.5">
        {VISUALISERS.map((k) => (
          <button key={k.id} type="button" onClick={() => up('vis', { kind: k.id, ...(k.id === 'circle' || k.id === 'rings' || k.id === 'burst' ? { place: v.place === 'bottom' || v.place === 'top' ? 'centre' : v.place } : {}) })} aria-pressed={v.kind === k.id} className={cn('flex h-14 flex-col items-center justify-center gap-1 border text-[0.66rem] transition-colors', v.kind === k.id ? 'border-white bg-white text-black' : 'border-[var(--ed-line)] text-[var(--ed-mute)] hover:border-white/40 hover:text-white')}>
            <VisIcon kind={k.id} />
            {k.name}
          </button>
        ))}
      </div>
      {v.kind !== 'none' && (
        <>
          <Row label="Where">
            <Seg value={v.place} options={VIS_PLACES} onChange={(x) => up('vis', { place: x })} />
          </Row>
          <Row label={v.place === 'centre' ? 'Size' : 'Height'} value={`${v.height}%`}>
            <Slider label="Visualiser height" min={10} max={100} value={v.height} onChange={(x) => up('vis', { height: x })} />
          </Row>
          <Row label="Strength" value={`${v.opacity}%`}>
            <Slider label="Visualiser strength" min={5} max={100} value={v.opacity} onChange={(x) => up('vis', { opacity: x })} />
          </Row>
          {v.kind !== 'wave' && v.kind !== 'rings' && (
            <Row label={round ? 'Rays' : 'Bars'} value={v.bands}>
              <Slider label="Bars" min={8} max={128} value={v.bands} onChange={(x) => up('vis', { bands: x })} />
            </Row>
          )}
          <Row
            label="Sensitivity"
            value={
              <span className="inline-flex items-center gap-2">
                {v.sensitivity}% <Hint>Loud songs are evened out by themselves, so the bars never get stuck at the top. Lower this for calmer movement, raise it for bigger jumps.</Hint>
              </span>
            }
          >
            <Slider label="Sensitivity" min={30} max={250} value={v.sensitivity} onChange={(x) => up('vis', { sensitivity: x })} />
          </Row>
          <Row label="Smoothness" value={v.smooth}>
            <Slider label="Smoothness" min={0} max={95} value={v.smooth} onChange={(x) => up('vis', { smooth: x })} />
          </Row>
          <Row label="Line thickness" value={`${v.thickness}px`}>
            <Slider label="Line thickness" min={1} max={10} value={v.thickness} onChange={(x) => up('vis', { thickness: x })} />
          </Row>
          <Row label="Glow" value={v.glow}>
            <Slider label="Glow" min={0} max={30} value={v.glow} onChange={(x) => up('vis', { glow: x })} />
          </Row>
          {!round && v.kind !== 'wave' && <Switch checked={v.centre} onChange={(x) => up('vis', { centre: x })} label="Grow from the middle" />}
        </>
      )}
    </Group>
  )
}

function LyricsGroup({ api, songLen }: { api: EditorApi; songLen: number | null }) {
  const { cfg, up, toast } = api
  const ly = cfg.lyrics
  const au = cfg.audio
  const [q, setQ] = useState(() => [au.title, au.artist].filter(Boolean).join(' '))
  const [hits, setHits] = useState<LyricHit[] | null>(null)
  const [state, setState] = useState<'idle' | 'searching' | 'error'>('idle')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState<number | null>(null)
  const [searching, setSearching] = useState(!ly.lines.length)

  useEffect(() => {
    if (!searching) return
    const s = q.trim()
    if (s.length < 2) return setHits(null)
    setState('searching')
    const ctl = new AbortController()
    const t = window.setTimeout(() => {
      fetch(`/api/lyrics?q=${encodeURIComponent(s)}`, { signal: ctl.signal, cache: 'no-store' })
        .then(async (r) => {
          const j = (await r.json()) as { hits?: LyricHit[]; error?: string }
          if (!r.ok) throw new Error(j.error ?? 'the search failed.')
          setHits(j.hits ?? [])
          setState('idle')
        })
        .catch((e: unknown) => {
          if (ctl.signal.aborted) return
          setError(e instanceof Error ? e.message : 'the search failed.')
          setState('error')
        })
    }, 450)
    return () => {
      ctl.abort()
      window.clearTimeout(t)
    }
  }, [q, searching])

  const choose = async (h: LyricHit) => {
    setLoading(h.id)
    try {
      const r = await fetch(`/api/lyrics?id=${h.id}`, { cache: 'no-store' })
      const j = (await r.json()) as { id: number; track: string; artist: string; duration: number; synced: boolean; lines: { t: number; x: string }[]; error?: string }
      if (!r.ok) throw new Error(j.error ?? "couldn't get those lyrics.")
      up('lyrics', { on: true, source: j.id, track: j.track, artist: j.artist, duration: j.duration, synced: j.synced, lines: j.lines, offset: 0 })
      if (!au.title) up('audio', { title: j.track.slice(0, 60), artist: au.artist || j.artist.slice(0, 60) })
      setSearching(false)
      toast(j.synced ? `lyrics added: ${j.lines.length} lines, in time with the song.` : 'lyrics added. these have no timing, so they are spread evenly over the song.')
    } catch (e) {
      toast(e instanceof Error ? e.message : "couldn't get those lyrics.")
    }
    setLoading(null)
  }

  const syncNow = () => {
    const a = previewAudio()
    if (!a || a.paused) return toast('press play in the preview first, then press this when the first line starts.')
    const first = ly.lines.find((l) => l.x)?.t ?? ly.lines[0].t
    up('lyrics', { offset: Math.max(-15, Math.min(15, Math.round((first / 1000 - a.currentTime) * 10) / 10)) })
    toast('synced. press play again from the start to check.')
  }

  return (
    <Group title="Lyrics" hint="search for your song and its lyrics play along on the page, line by line. works best with the full song.">
      {ly.lines.length > 0 && !searching ? (
        <>
          <div className="flex items-start gap-3 border border-[var(--ed-line2)] p-3">
            <Captions className="mt-0.5 size-4 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[0.84rem]">{ly.track}</p>
              <p className="truncate text-[0.74rem] text-[var(--ed-mute)]">
                {ly.artist} · {ly.lines.length} lines · {ly.synced ? 'in time' : 'no timing (spread out)'}
              </p>
            </div>
            <button type="button" onClick={() => setSearching(true)} className="text-[0.72rem] text-white/60 underline underline-offset-4 hover:text-white">
              change
            </button>
            <button type="button" aria-label="Remove the lyrics" onClick={() => up('lyrics', { on: false, lines: [], track: '', artist: '', source: 0 })} className="text-white/40 hover:text-white">
              <Trash2 className="size-4" />
            </button>
          </div>
          <Switch checked={ly.on} onChange={(v) => up('lyrics', { on: v })} label="Show the lyrics" hint="Visitors can hide them with the lyrics button on the player." />
          <Row label="Style">
            <Choices value={ly.style} options={LYRIC_STYLES} onChange={(v) => up('lyrics', { style: v })} cols={2} />
          </Row>
          <Row label="Where">
            <Seg value={ly.place} options={LYRIC_PLACES} onChange={(v) => up('lyrics', { place: v })} />
          </Row>
          <Row label="Size" value={`${ly.size}%`}>
            <Slider label="Lyrics size" min={60} max={180} value={ly.size} onChange={(v) => up('lyrics', { size: v })} />
          </Row>
          <Row label="Shade behind them" value={ly.dim}>
            <Slider label="Shade" min={0} max={90} value={ly.dim} onChange={(v) => up('lyrics', { dim: v })} />
          </Row>
          <Row label="Timing" value={`${ly.offset > 0 ? '+' : ''}${ly.offset.toFixed(1)} s`}>
            <div className="flex items-center gap-2">
              <button type="button" aria-label="Lyrics later" onClick={() => up('lyrics', { offset: Math.max(-15, Math.round((ly.offset - 0.2) * 10) / 10) })} className="grid size-8 shrink-0 place-items-center border border-[var(--ed-line)] hover:border-white/40">
                <Minus className="size-3.5" />
              </button>
              <Slider label="Lyrics timing" min={-15} max={15} step={0.1} value={ly.offset} onChange={(v) => up('lyrics', { offset: v })} />
              <button type="button" aria-label="Lyrics sooner" onClick={() => up('lyrics', { offset: Math.min(15, Math.round((ly.offset + 0.2) * 10) / 10) })} className="grid size-8 shrink-0 place-items-center border border-[var(--ed-line)] hover:border-white/40">
                <Plus className="size-3.5" />
              </button>
            </div>
          </Row>
          <div className="flex flex-wrap items-center gap-2">
            <Btn onClick={syncNow}>sync to now</Btn>
            <span className="text-[0.72rem] text-[var(--ed-mute)]">play the song in the preview and press this the moment the first line is sung.</span>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center border border-[var(--ed-line)] bg-black focus-within:border-white/50">
            <Search className="ml-3 size-4 shrink-0 text-white/40" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="song and artist" aria-label="Search for a song's lyrics" className="h-10 min-w-0 flex-1 bg-transparent px-3 text-[0.88rem] text-white outline-none placeholder:text-white/25" />
            {state === 'searching' && <Loader2 className="mr-3 size-4 animate-spin text-white/40" />}
            {ly.lines.length > 0 && (
              <button type="button" aria-label="Back" onClick={() => setSearching(false)} className="mr-2 grid size-7 place-items-center text-white/40 hover:text-white">
                <X className="size-4" />
              </button>
            )}
          </div>
          {state === 'error' && <p className="text-[0.76rem] text-white/60">{error}</p>}
          {hits && hits.length === 0 && state === 'idle' && <p className="text-[0.76rem] text-[var(--ed-mute)]">nothing found. try just the song name, or the artist and one word of it.</p>}
          {hits && hits.length > 0 && (
            <ul className="max-h-80 divide-y divide-[var(--ed-line)] overflow-y-auto border border-[var(--ed-line)]">
              {hits.map((h) => {
                const match = songLen !== null && Math.abs(h.duration - songLen) <= 3
                return (
                  <li key={h.id}>
                    <button type="button" disabled={h.instrumental || loading !== null} onClick={() => void choose(h)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-white/[0.05] disabled:opacity-40">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[0.82rem]">{h.track}</span>
                        <span className="block truncate text-[0.7rem] text-[var(--ed-mute)]">
                          {h.artist}
                          {h.album && h.album !== h.track ? ` · ${h.album}` : ''} · {fmt(h.duration)}
                        </span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-1">
                        {match && (
                          <span className="inline-flex items-center gap-1 bg-white px-1.5 text-[0.6rem] text-black">
                            <Check className="size-2.5" /> your song
                          </span>
                        )}
                        <span className="text-[0.6rem] tracking-wide text-white/40 uppercase">{h.instrumental ? 'instrumental' : h.synced ? 'in time' : 'words only'}</span>
                      </span>
                      {loading === h.id && <Loader2 className="size-4 animate-spin" />}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
          <p className="text-[0.7rem] leading-snug text-[var(--ed-dim)]">
            lyrics come from <a href="https://lrclib.net" target="_blank" rel="noreferrer" className="underline underline-offset-2">LRCLIB</a>, an open lyrics library. only what you type is sent. &quot;your song&quot; marks a version as long as your file, which will line up best.
          </p>
        </>
      )}
    </Group>
  )
}
