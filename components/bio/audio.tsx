'use client'

import { type MotionValue, motion, useTransform } from 'framer-motion'
import { Captions, Gauge, Music2, Pause, Play, Volume2, VolumeX } from 'lucide-react'
import { type CSSProperties, type ReactNode, type RefObject, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { audioSrc, imgSrc, isMediaUrl } from '@/lib/bio'
import { cn } from '@/lib/utils'
import { getPrefs, serverPrefs, subscribePrefs } from '@/lib/visitor-prefs'
import { useBio } from './context'
import { LyricsView } from './lyrics'
import { type Tap, Visualiser } from './visualiser'

/** The sound chain: the song → bass → muffle → (dry + reverb) → volume → analyser → speakers. */
type Graph = Tap & { ac: AudioContext; bass: BiquadFilterNode; low: BiquadFilterNode; dry: GainNode; wet: GainNode; master: GainNode }

/** A short room, made of decaying noise, for the reverb. */
function impulse(ac: AudioContext, seconds: number, decay: number) {
  const len = Math.floor(ac.sampleRate * seconds)
  const buf = ac.createBuffer(2, len, ac.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay)
  }
  return buf
}

/** What visitors can switch to (when the owner allows it). `null` is the owner's own sound. */
const VISITOR_SPEEDS = [
  { id: null, name: 'normal' },
  { id: { speed: 80, pitch: false }, name: 'slowed' },
  { id: { speed: 125, pitch: false }, name: 'sped up' },
] as const

/**
 * The music of a page. It starts when the page is entered (or on the first press anywhere, when there is no enter screen), loops, and drives `level`, the
 * loudness the backgrounds and the picture's ring react to. How it looks is the person's choice (a pill, a card with the cover, a spinning record, a bar,
 * a bubble, or nothing), and where it sits (a corner, or anywhere they dragged it), and whether it shows a bar to skip through.
 *
 * An uploaded song also goes through a small sound chain, so it can be slowed down, sped up, given reverb, more bass or a muffle, faded in and started
 * part way; and it can drive a visualiser and synced lyrics. (A song from another address can't be routed through the chain: the browser would silence it.)
 */
export function MusicPlayer({ level }: { level: MotionValue<number> }) {
  const { cfg, mode, entered, reduced } = useBio()
  const a = cfg.audio
  const prefs = useSyncExternalStore(subscribePrefs, getPrefs, serverPrefs)
  const el = useRef<HTMLAudioElement>(null)
  const graph = useRef<Graph | null>(null)
  const tap = useRef<Tap | null>(null)
  const rootRef = useRef<HTMLElement | null>(null)
  const anchor = useRef<HTMLSpanElement>(null)
  const faded = useRef(false)
  const peak = useRef(0.2)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const [at, setAt] = useState(0)
  const [len, setLen] = useState(0)
  const [vSpeed, setVSpeed] = useState(0)
  const [showLyrics, setShowLyrics] = useState(true)
  const bars = [0.7, 1, 0.55, 0.9]
  const on = Boolean(a.id) && mode !== 'mini'
  const ours = !isMediaUrl(a.id)
  const override = VISITOR_SPEEDS[vSpeed].id
  const rate = (override?.speed ?? a.speed) / 100
  const keepPitch = override ? override.pitch : a.pitch
  const vol = muted ? 0 : (a.volume / 100) * (prefs.volume / 100)

  useEffect(() => {
    rootRef.current = anchor.current?.closest('.bio-root') ?? null
  })

  // speed and pitch
  useEffect(() => {
    const e = el.current as (HTMLAudioElement & { webkitPreservesPitch?: boolean; mozPreservesPitch?: boolean }) | null
    if (!e) return
    e.preservesPitch = keepPitch
    e.webkitPreservesPitch = keepPitch
    e.mozPreservesPitch = keepPitch
    e.defaultPlaybackRate = rate
    e.playbackRate = rate
  }, [rate, keepPitch, on])

  // the effects follow the settings live (the editor's preview changes as you drag)
  useEffect(() => {
    const g = graph.current
    if (!g) return
    const now = g.ac.currentTime
    g.bass.gain.setTargetAtTime((a.bass / 100) * 15, now, 0.05)
    g.low.frequency.setTargetAtTime(20000 * Math.pow(450 / 20000, a.muffle / 100), now, 0.05)
    g.wet.gain.setTargetAtTime((a.reverb / 100) * 1.15, now, 0.05)
    g.dry.gain.setTargetAtTime(1 - (a.reverb / 100) * 0.4, now, 0.05)
    g.an.smoothingTimeConstant = cfg.vis.smooth / 100
  }, [a.bass, a.muffle, a.reverb, cfg.vis.smooth, playing])

  // volume (through the chain when there is one, so the fade-in is smooth)
  useEffect(() => {
    const e = el.current
    const g = graph.current
    if (!e) return
    if (g) {
      e.volume = 1
      if (faded.current) g.master.gain.setTargetAtTime(vol, g.ac.currentTime, 0.06)
    } else e.volume = vol
  }, [vol, playing])

  // the start point moves while the owner drags it
  useEffect(() => {
    const e = el.current
    if (e && a.start && e.currentTime < a.start) e.currentTime = a.start
  }, [a.start])

  const build = (e: HTMLAudioElement) => {
    if (graph.current || !ours || typeof AudioContext === 'undefined') return
    const ac = new AudioContext()
    const src = ac.createMediaElementSource(e)
    const bass = ac.createBiquadFilter()
    bass.type = 'lowshelf'
    bass.frequency.value = 160
    const low = ac.createBiquadFilter()
    low.type = 'lowpass'
    low.Q.value = 0.8
    low.frequency.value = 20000
    const dry = ac.createGain()
    const wet = ac.createGain()
    wet.gain.value = 0
    const conv = ac.createConvolver()
    conv.buffer = impulse(ac, 3.4, 2.4)
    const master = ac.createGain()
    master.gain.value = 0
    const an = ac.createAnalyser()
    an.fftSize = 512
    // the default ceiling (-30 dB) is below a loud master's level, which pinned everything at full; this range leaves room above and below
    an.minDecibels = -90
    an.maxDecibels = -8
    an.smoothingTimeConstant = cfg.vis.smooth / 100
    src.connect(bass)
    bass.connect(low)
    low.connect(dry)
    low.connect(conv)
    conv.connect(wet)
    dry.connect(master)
    wet.connect(master)
    master.connect(an)
    an.connect(ac.destination)
    const g: Graph = { ac, bass, low, dry, wet, master, an, freq: new Uint8Array(an.frequencyBinCount) as Uint8Array<ArrayBuffer>, wave: new Uint8Array(an.fftSize) as Uint8Array<ArrayBuffer> }
    graph.current = g
    tap.current = g
  }

  const play = async () => {
    const e = el.current
    if (!e) return
    // browsers only allow sound after a press; without one, wait for it
    const ua = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation
    if (ua && !ua.hasBeenActive) return setBlocked(true)
    try {
      build(e)
      const g = graph.current
      if (g && g.ac.state !== 'running') await Promise.race([g.ac.resume(), new Promise((r) => setTimeout(r, 400))])
      if (a.start && e.currentTime < a.start) e.currentTime = a.start
      await e.play()
      if (g && !faded.current) {
        faded.current = true
        const now = g.ac.currentTime
        g.master.gain.cancelScheduledValues(now)
        g.master.gain.setValueAtTime(0.0001, now)
        g.master.gain.linearRampToValueAtTime(Math.max(0.0001, vol), now + Math.max(0.05, a.fade))
      } else if (g) g.master.gain.setTargetAtTime(vol, g.ac.currentTime, 0.06)
      setPlaying(true)
      setBlocked(false)
    } catch {
      setBlocked(true) // the browser wants a press first
    }
  }

  // start when entered (unless the owner, the visitor's /preferences or the editor say wait); otherwise on the first press
  const auto = a.autoplay && prefs.autoplay && mode === 'live'
  useEffect(() => {
    if (!on || !entered || !auto) return
    void play()
    const first = () => {
      if (el.current?.paused) void play()
    }
    window.addEventListener('pointerdown', first, { once: true })
    window.addEventListener('keydown', first, { once: true })
    return () => {
      window.removeEventListener('pointerdown', first)
      window.removeEventListener('keydown', first)
    }
  }, [on, entered, auto]) // eslint-disable-line react-hooks/exhaustive-deps

  // M mutes, on the real page
  useEffect(() => {
    if (!on || mode !== 'live') return
    const k = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'm' || e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target as HTMLElement | null
      if (t && (t.isContentEditable || /^(input|textarea|select)$/i.test(t.tagName))) return
      setMuted((v) => !v)
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [on, mode])

  // the loudness, every frame, measured against the song's own recent loudest (so loud and quiet songs both make the page pulse)
  useEffect(() => {
    if (!on) return
    let raf = 0
    const tick = () => {
      const g = graph.current
      if (g && playing) {
        g.an.getByteFrequencyData(g.freq)
        let s = 0
        const n = Math.min(20, g.freq.length)
        for (let i = 0; i < n; i++) s += g.freq[i]
        const raw = s / n / 255
        peak.current = Math.max(raw, peak.current * 0.996, 0.15)
        level.set(Math.min(1, Math.pow(raw / peak.current, 1.6)))
      } else level.set(level.get() * 0.9)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [on, playing, level])

  useEffect(
    () => () => {
      void graph.current?.ac.close().catch(() => undefined)
      graph.current = null
      tap.current = null
    },
    [],
  )

  if (!on) return <span ref={anchor} hidden />
  const toggle = () => {
    const e = el.current
    if (!e) return
    if (e.paused) void play()
    else {
      e.pause()
      setPlaying(false)
    }
  }
  const seek = (r: number) => {
    const e = el.current
    if (e && len > 0) e.currentTime = Math.max(0, Math.min(len, r * len))
  }
  const audio = (
    <audio
      ref={el}
      src={audioSrc(a.id)}
      loop={a.loop && !a.start}
      preload="auto"
      onPlay={() => setPlaying(true)}
      onPause={() => setPlaying(false)}
      onTimeUpdate={(e) => setAt(e.currentTarget.currentTime)}
      onLoadedMetadata={(e) => setLen(Number.isFinite(e.currentTarget.duration) ? e.currentTarget.duration : 0)}
      onDurationChange={(e) => setLen(Number.isFinite(e.currentTarget.duration) ? e.currentTarget.duration : 0)}
      onEnded={(e) => {
        if (!a.loop) return
        e.currentTarget.currentTime = a.start
        void e.currentTarget.play()
      }}
    />
  )
  const hasLyrics = cfg.lyrics.on && cfg.lyrics.lines.length > 0
  const extras = (
    <>
      <span ref={anchor} hidden />
      {cfg.vis.kind !== 'none' && ours && !prefs.noVisualisers && !reduced && <Visualiser vis={cfg.vis} tap={tap} playing={playing} demo={mode === 'preview'} rootRef={rootRef} />}
      {hasLyrics && showLyrics && <LyricsView cfg={cfg.lyrics} audio={el} playing={playing} demo={mode === 'preview'} font={cfg.theme.font} reduced={reduced} />}
    </>
  )
  if (a.player === 'hidden')
    return (
      <>
        {extras}
        <div className="hidden">{audio}</div>
      </>
    )

  const top = a.place === 'free' ? a.y < 50 : a.place[0] === 't'
  const right = a.place === 'free' ? a.x > 60 : a.place[1] === 'r'
  const spot = a.place === 'free' ? '' : cn(top ? 'top-4' : 'bottom-4', a.place[1] === 'l' ? 'left-4' : a.place[1] === 'r' ? 'right-4' : 'left-1/2 -translate-x-1/2')
  const name = blocked && !playing ? 'press to play' : a.title || 'now playing'
  const by = [a.artist, a.album].filter(Boolean).join(' · ')
  const cover = a.cover ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={imgSrc(a.cover)} alt="" draggable={false} referrerPolicy="no-referrer" className="size-full object-cover" />
  ) : (
    <Music2 className="size-1/2 text-[var(--bio-mute)]" strokeWidth={1.5} />
  )
  const playBtn = (size: string, extra?: string) => (
    <button type="button" onClick={toggle} aria-label={playing ? 'Pause the music' : 'Play the music'} className={cn('grid shrink-0 place-items-center rounded-full bg-[var(--bio-fg)] text-[var(--bio-bg)] transition-transform hover:scale-105', size, extra)}>
      {playing ? <Pause className="size-[42%]" fill="currentColor" /> : <Play className="size-[42%] translate-x-px" fill="currentColor" />}
    </button>
  )
  const muteBtn = (
    <button type="button" onClick={() => setMuted((v) => !v)} aria-label={muted ? 'Unmute' : 'Mute'} title="mute (M)" className="grid size-7 shrink-0 place-items-center rounded-full text-[var(--bio-mute)] transition-colors hover:text-[var(--bio-fg)]">
      {muted ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5" />}
    </button>
  )
  const speedBtn = a.speeds && ours && (
    <button type="button" onClick={() => setVSpeed((vSpeed + 1) % VISITOR_SPEEDS.length)} aria-label={`Sound: ${VISITOR_SPEEDS[vSpeed].name}. Press for the next one.`} title="normal, slowed or sped up" className="inline-flex h-6 shrink-0 items-center gap-1 rounded-full border border-[var(--bio-line)] px-2 text-[0.64rem] text-[var(--bio-mute)] transition-colors hover:text-[var(--bio-fg)]">
      <Gauge className="size-3" /> {VISITOR_SPEEDS[vSpeed].name}
    </button>
  )
  const lyricsBtn = hasLyrics && (
    <button type="button" onClick={() => setShowLyrics((v) => !v)} aria-pressed={showLyrics} aria-label={showLyrics ? 'Hide the lyrics' : 'Show the lyrics'} title="lyrics" className={cn('grid size-7 shrink-0 place-items-center rounded-full transition-colors', showLyrics ? 'text-[var(--bio-fg)]' : 'text-[var(--bio-mute)] hover:text-[var(--bio-fg)]')}>
      <Captions className="size-3.5" />
    </button>
  )
  const eq = (
    <span className="flex h-4 items-end gap-[3px]" aria-hidden="true">
      {bars.map((m, i) => (
        <Bar key={i} level={level} m={m} playing={playing && !reduced} i={i} />
      ))}
    </span>
  )
  const frame = 'border border-[var(--bio-line)] bg-[var(--bio-soft)] backdrop-blur-xl'

  if (a.player === 'bar') {
    return (
      <>
        {extras}
        <div className={cn('absolute inset-x-0 z-30 flex h-14 items-center gap-3 px-4', top ? 'top-0 border-b' : 'bottom-0 border-t', 'border-[var(--bio-line)] bg-[var(--bio-soft)] backdrop-blur-xl')}>
          {audio}
          <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-[var(--bio-line)]">{cover}</span>
          {playBtn('size-9')}
          <span className="min-w-0 flex-1 sm:flex-none sm:basis-56">
            <span className="block truncate text-[0.8rem] font-medium text-[var(--bio-fg)]">{name}</span>
            {by && <span className="block truncate text-[0.68rem] text-[var(--bio-mute)]">{by}</span>}
          </span>
          {a.progress && (
            <span className="hidden min-w-0 flex-1 items-center gap-2 sm:flex">
              <span className="w-9 text-right text-[0.66rem] text-[var(--bio-mute)] tabular-nums">{clock(at)}</span>
              <Seek at={at} len={len} onSeek={seek} />
              <span className="w-9 text-[0.66rem] text-[var(--bio-mute)] tabular-nums">{clock(len)}</span>
            </span>
          )}
          {speedBtn}
          {lyricsBtn}
          {eq}
          {muteBtn}
        </div>
      </>
    )
  }

  let body: ReactNode
  if (a.player === 'card') {
    body = (
      <div className={cn(frame, 'w-[min(17.5rem,calc(100cqw-2rem))] rounded-2xl p-3')}>
        <div className="flex items-center gap-3">
          <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-[var(--bio-line)]">{cover}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[0.84rem] font-medium text-[var(--bio-fg)]">{name}</span>
            {by && <span className="block truncate text-[0.72rem] text-[var(--bio-mute)]">{by}</span>}
          </span>
          {playBtn('size-9')}
        </div>
        {(a.progress || speedBtn || lyricsBtn) && (
          <div className="mt-3 flex items-center gap-2">
            {a.progress ? (
              <>
                <span className="w-8 text-[0.64rem] text-[var(--bio-mute)] tabular-nums">{clock(at)}</span>
                <Seek at={at} len={len} onSeek={seek} />
                <span className="w-8 text-right text-[0.64rem] text-[var(--bio-mute)] tabular-nums">{clock(len)}</span>
              </>
            ) : (
              <span className="flex-1" />
            )}
            {speedBtn}
            {lyricsBtn}
            {muteBtn}
          </div>
        )}
      </div>
    )
  } else if (a.player === 'vinyl') {
    body = (
      <div className={cn('flex items-center gap-3', right && 'flex-row-reverse')}>
        <button type="button" onClick={toggle} aria-label={playing ? 'Pause the music' : 'Play the music'} className="relative grid size-[4.5rem] shrink-0 place-items-center rounded-full shadow-[0_10px_30px_-8px_rgb(0_0_0/0.8)]" style={{ background: 'repeating-radial-gradient(circle at 50% 50%, #0b0b0b 0 2px, #1b1b1b 2px 3px)' }}>
          <span aria-hidden="true" className="absolute inset-0 rounded-full" style={{ background: 'conic-gradient(from 20deg, transparent 0 20%, rgb(255 255 255 / 0.1) 25%, transparent 30% 70%, rgb(255 255 255 / 0.08) 75%, transparent 80%)', animation: 'bio-spin 3.6s linear infinite', animationPlayState: playing && !reduced ? 'running' : 'paused' }} />
          <span className="relative grid size-[44%] place-items-center overflow-hidden rounded-full bg-[var(--bio-bg)] ring-2 ring-black/60" style={{ animation: 'bio-spin 3.6s linear infinite', animationPlayState: playing && !reduced ? 'running' : 'paused' }}>
            {cover}
          </span>
          <span aria-hidden="true" className="absolute size-1.5 rounded-full bg-black" />
        </button>
        <span className={cn(frame, 'max-w-[12rem] min-w-0 rounded-2xl px-3 py-2', right && 'text-right')}>
          <span className="block truncate text-[0.8rem] font-medium text-[var(--bio-fg)]">{name}</span>
          {by && <span className="block truncate text-[0.68rem] text-[var(--bio-mute)]">{by}</span>}
          {a.progress && (
            <span className="mt-1.5 block">
              <Seek at={at} len={len} onSeek={seek} />
            </span>
          )}
          {(speedBtn || lyricsBtn) && (
            <span className={cn('mt-1.5 flex items-center gap-1', right && 'justify-end')}>
              {speedBtn}
              {lyricsBtn}
            </span>
          )}
        </span>
      </div>
    )
  } else if (a.player === 'bubble') {
    const r = len > 0 ? Math.min(1, at / len) : 0
    body = (
      <div className={cn('group flex items-center gap-2', right && 'flex-row-reverse')}>
        <button type="button" onClick={toggle} aria-label={playing ? 'Pause the music' : 'Play the music'} title={name} className="relative grid size-14 place-items-center rounded-full">
          <svg aria-hidden="true" viewBox="0 0 36 36" className="absolute inset-0 size-full -rotate-90">
            <circle cx="18" cy="18" r="16.5" fill="none" stroke="var(--bio-line)" strokeWidth="1.5" />
            {a.progress && <circle cx="18" cy="18" r="16.5" fill="none" stroke="var(--bio-fg)" strokeWidth="1.5" strokeLinecap="round" strokeDasharray={`${r * 103.7} 103.7`} />}
          </svg>
          <span className="grid size-[3.1rem] place-items-center overflow-hidden rounded-full bg-[var(--bio-soft)] backdrop-blur-xl" style={{ animation: 'bio-spin 8s linear infinite', animationPlayState: playing && !reduced ? 'running' : 'paused' }}>
            {cover}
          </span>
          <span className={cn('absolute inset-0 grid place-items-center rounded-full bg-black/45 text-white transition-opacity', playing ? 'opacity-0 group-hover:opacity-100' : 'opacity-100')}>
            {playing ? <Pause className="size-5" fill="currentColor" /> : <Play className="size-5 translate-x-px" fill="currentColor" />}
          </span>
        </button>
        {lyricsBtn && <span className={cn(frame, 'rounded-full p-0.5')}>{lyricsBtn}</span>}
      </div>
    )
  } else {
    // the pill
    body = (
      <div className={cn(frame, 'relative flex items-center gap-1.5 overflow-hidden rounded-full p-1.5 pr-3')}>
        {playBtn('size-8')}
        {eq}
        <span className="max-w-[10rem] truncate text-[0.74rem] text-[var(--bio-mute)]">{name}</span>
        {speedBtn}
        {lyricsBtn}
        {muteBtn}
        {a.progress && len > 0 && <span aria-hidden="true" className="absolute inset-x-4 bottom-0 h-[2px] rounded-full bg-[var(--bio-fg)] opacity-60" style={{ transform: `scaleX(${Math.min(1, at / len)})`, transformOrigin: 'left' }} />}
      </div>
    )
  }
  return (
    <>
      {extras}
      <Movable rootRef={rootRef} spot={spot}>
        {audio}
        {body}
      </Movable>
    </>
  )
}

/**
 * Where the player sits. The owner can drag it in the editor's preview (it is then kept as place "free", a position across and down the page); when the
 * owner allows it, visitors can drag it out of their way too (kept for that visit only). It follows the pointer's own position on the page, so it stays
 * under the pointer even in the editor's scaled-down preview. A drag never counts as a press.
 */
function Movable({ rootRef, spot, children }: { rootRef: RefObject<HTMLElement | null>; spot: string; children: ReactNode }) {
  const { cfg, mode, data, movePlayer } = useBio()
  const a = cfg.audio
  const owner = mode === 'preview' && Boolean(movePlayer)
  const canDrag = owner || (mode === 'live' && a.drag)
  const key = `logoless:player:${data.handle}`
  const [mine, setMine] = useState<{ x: number; y: number } | null>(null)
  const [live, setLive] = useState<{ x: number; y: number } | null>(null)
  const box = useRef<HTMLDivElement>(null)
  const drag = useRef<{ id: number; sx: number; sy: number; ox: number; oy: number; moved: boolean } | null>(null)
  const moved = useRef(false)
  useEffect(() => {
    if (mode !== 'live' || !a.drag) return setMine(null)
    try {
      const j = JSON.parse(sessionStorage.getItem(key) ?? 'null') as { x: number; y: number } | null
      if (j && Number.isFinite(j.x) && Number.isFinite(j.y)) setMine(j)
    } catch {
      /* nothing kept */
    }
  }, [key, mode, a.drag])
  const pos = live ?? mine ?? (a.place === 'free' ? { x: a.x, y: a.y } : null)
  const at = (clientX: number, clientY: number) => {
    const root = rootRef.current
    const el = box.current
    const d = drag.current
    if (!root || !el || !d) return null
    const r = root.getBoundingClientRect()
    const b = el.getBoundingClientRect()
    const clamp = (v: number) => Math.round(Math.min(100, Math.max(0, v)) * 10) / 10
    return { x: clamp(((clientX - d.ox - r.left) / Math.max(1, r.width - b.width)) * 100), y: clamp(((clientY - d.oy - r.top) / Math.max(1, r.height - b.height)) * 100) }
  }
  return (
    <div
      ref={box}
      data-player
      title={owner ? 'drag to move the player' : canDrag ? 'drag to move' : undefined}
      onPointerDown={(e) => {
        if (!canDrag || e.button !== 0) return
        const b = box.current!.getBoundingClientRect()
        const d = { id: e.pointerId, sx: e.clientX, sy: e.clientY, ox: e.clientX - b.left, oy: e.clientY - b.top, moved: false }
        drag.current = d
        // the whole window is listened to, so a quick flick that leaves the player at once still moves it
        const move = (ev: PointerEvent) => {
          if (ev.pointerId !== d.id) return
          if (!d.moved && Math.hypot(ev.clientX - d.sx, ev.clientY - d.sy) < 5) return
          d.moved = true
          setLive(at(ev.clientX, ev.clientY))
        }
        const up = (ev: PointerEvent) => {
          if (ev.pointerId !== d.id) return
          window.removeEventListener('pointermove', move)
          window.removeEventListener('pointerup', up)
          window.removeEventListener('pointercancel', up)
          const p = ev.type === 'pointerup' && d.moved ? at(ev.clientX, ev.clientY) : null
          drag.current = null
          setLive(null)
          if (!d.moved) return
          moved.current = true
          window.setTimeout(() => (moved.current = false), 60)
          if (!p) return
          if (owner) movePlayer?.(p.x, p.y)
          else {
            setMine(p)
            try {
              sessionStorage.setItem(key, JSON.stringify(p))
            } catch {
              /* kept for this view only */
            }
          }
        }
        window.addEventListener('pointermove', move)
        window.addEventListener('pointerup', up)
        window.addEventListener('pointercancel', up)
      }}
      // a cover picture would otherwise be dragged as a picture, which cancels the move
      onDragStart={(e) => canDrag && e.preventDefault()}
      onClickCapture={(e) => {
        if (!moved.current) return
        e.preventDefault()
        e.stopPropagation()
      }}
      className={cn('absolute z-30', !pos && spot, canDrag && 'cursor-grab touch-none select-none active:cursor-grabbing')}
      style={pos ? ({ left: `${pos.x}%`, top: `${pos.y}%`, translate: `-${pos.x}% -${pos.y}%` } as CSSProperties) : undefined}
    >
      {children}
    </div>
  )
}

const clock = (s: number) => (Number.isFinite(s) && s > 0 ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '0:00')

/** A thin bar to skip through the song: press or drag anywhere on it. */
function Seek({ at, len, onSeek }: { at: number; len: number; onSeek: (r: number) => void }) {
  const box = useRef<HTMLDivElement>(null)
  const from = (e: React.PointerEvent) => {
    const r = box.current!.getBoundingClientRect()
    onSeek(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)))
  }
  return (
    <div
      ref={box}
      role="slider"
      aria-label="Skip through the song"
      aria-valuemin={0}
      aria-valuemax={Math.round(len)}
      aria-valuenow={Math.round(at)}
      tabIndex={0}
      onPointerDown={(e) => {
        // the seek bar is not a handle for moving the player
        e.stopPropagation()
        e.currentTarget.setPointerCapture(e.pointerId)
        from(e)
      }}
      onPointerMove={(e) => e.buttons === 1 && from(e)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') onSeek(Math.min(1, (at + 5) / (len || 1)))
        else if (e.key === 'ArrowLeft') onSeek(Math.max(0, (at - 5) / (len || 1)))
      }}
      className="group/seek relative flex h-4 min-w-0 flex-1 cursor-pointer items-center"
    >
      <span className="relative block h-[3px] w-full overflow-hidden rounded-full bg-[var(--bio-line)]">
        <span className="absolute inset-y-0 left-0 block rounded-full bg-[var(--bio-fg)]" style={{ width: `${len > 0 ? Math.min(100, (at / len) * 100) : 0}%` }} />
      </span>
    </div>
  )
}

function Bar({ level, m, playing, i }: { level: MotionValue<number>; m: number; playing: boolean; i: number }) {
  const h = useTransform(level, (v) => (playing ? 0.18 + Math.min(1, v * m * 1.4 + 0.12 * Math.abs(Math.sin(i + performance.now() / 260))) * 0.82 : 0.18))
  return <motion.span className="block h-full w-[3px] origin-bottom rounded-full bg-[var(--bio-fg)]" style={{ scaleY: h }} />
}
