'use client'

import { type MotionValue, motion, useTransform } from 'framer-motion'
import { Music2, Pause, Play, Volume2, VolumeX } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { audioSrc, imgSrc, isMediaUrl } from '@/lib/bio'
import { cn } from '@/lib/utils'
import { useBio } from './context'

/**
 * The music of a page. It starts when the page is entered (or on the first press anywhere, when there is no enter screen), loops, and drives `level`, the
 * loudness the backgrounds and the picture's ring react to. How it looks is the person's choice (a pill, a card with the cover, a spinning record, a bar,
 * a bubble, or nothing), and where it sits, and whether it shows a bar to skip through.
 */
export function MusicPlayer({ level }: { level: MotionValue<number> }) {
  const { cfg, mode, entered, reduced } = useBio()
  const a = cfg.audio
  const el = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const [at, setAt] = useState(0)
  const [len, setLen] = useState(0)
  const ctx = useRef<{ ac: AudioContext; an: AnalyserNode; data: Uint8Array<ArrayBuffer> } | null>(null)
  const bars = [0.7, 1, 0.55, 0.9]
  const on = Boolean(a.id) && mode !== 'mini'

  // volume follows the setting
  useEffect(() => {
    if (el.current) el.current.volume = muted ? 0 : a.volume / 100
  }, [a.volume, muted])

  const play = async () => {
    const e = el.current
    if (!e) return
    try {
      // the page can only listen to a file of ours: a file from another address is silenced if it is routed through the analyser
      if (a.reactive && !isMediaUrl(a.id) && !ctx.current && typeof AudioContext !== 'undefined') {
        const ac = new AudioContext()
        const src = ac.createMediaElementSource(e)
        const an = ac.createAnalyser()
        an.fftSize = 128
        an.smoothingTimeConstant = 0.82
        src.connect(an)
        an.connect(ac.destination)
        ctx.current = { ac, an, data: new Uint8Array(an.frequencyBinCount) as Uint8Array<ArrayBuffer> }
      }
      await ctx.current?.ac.resume()
      await e.play()
      setPlaying(true)
      setBlocked(false)
    } catch {
      setBlocked(true) // the browser wants a press first
    }
  }

  // start when entered; otherwise on the first press
  useEffect(() => {
    if (!on || !entered) return
    if (a.autoplay) void play()
    const first = () => {
      if (el.current?.paused) void play()
    }
    if (!a.autoplay) return
    window.addEventListener('pointerdown', first, { once: true })
    window.addEventListener('keydown', first, { once: true })
    return () => {
      window.removeEventListener('pointerdown', first)
      window.removeEventListener('keydown', first)
    }
  }, [on, entered, a.autoplay]) // eslint-disable-line react-hooks/exhaustive-deps

  // the loudness, a few times a frame
  useEffect(() => {
    if (!on) return
    let raf = 0
    const tick = () => {
      const c = ctx.current
      if (c && playing) {
        c.an.getByteFrequencyData(c.data)
        let s = 0
        const n = Math.min(24, c.data.length)
        for (let i = 0; i < n; i++) s += c.data[i]
        level.set(Math.min(1, (s / n / 255) * 1.6))
      } else level.set(level.get() * 0.9)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [on, playing, level])

  useEffect(
    () => () => {
      void ctx.current?.ac.close().catch(() => undefined)
      ctx.current = null
    },
    [],
  )

  if (!on) return null
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
      loop={a.loop}
      preload="auto"
      onPlay={() => setPlaying(true)}
      onPause={() => setPlaying(false)}
      onTimeUpdate={(e) => setAt(e.currentTarget.currentTime)}
      onLoadedMetadata={(e) => setLen(Number.isFinite(e.currentTarget.duration) ? e.currentTarget.duration : 0)}
      onDurationChange={(e) => setLen(Number.isFinite(e.currentTarget.duration) ? e.currentTarget.duration : 0)}
    />
  )
  if (a.player === 'hidden') return <div className="hidden">{audio}</div>

  const top = a.place[0] === 't'
  const pos = cn('absolute z-30', top ? 'top-4' : 'bottom-4', a.place[1] === 'l' ? 'left-4' : a.place[1] === 'r' ? 'right-4' : 'left-1/2 -translate-x-1/2')
  const name = blocked ? 'press to play' : a.title || 'now playing'
  const by = [a.artist, a.album].filter(Boolean).join(' · ')
  const cover = a.cover ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={imgSrc(a.cover)} alt="" referrerPolicy="no-referrer" className="size-full object-cover" />
  ) : (
    <Music2 className="size-1/2 text-[var(--bio-mute)]" strokeWidth={1.5} />
  )
  const playBtn = (size: string, extra?: string) => (
    <button type="button" onClick={toggle} aria-label={playing ? 'Pause the music' : 'Play the music'} className={cn('grid shrink-0 place-items-center rounded-full bg-[var(--bio-fg)] text-[var(--bio-bg)] transition-transform hover:scale-105', size, extra)}>
      {playing ? <Pause className="size-[42%]" fill="currentColor" /> : <Play className="size-[42%] translate-x-px" fill="currentColor" />}
    </button>
  )
  const muteBtn = (
    <button type="button" onClick={() => setMuted((v) => !v)} aria-label={muted ? 'Unmute' : 'Mute'} className="grid size-7 shrink-0 place-items-center rounded-full text-[var(--bio-mute)] transition-colors hover:text-[var(--bio-fg)]">
      {muted ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5" />}
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

  if (a.player === 'card') {
    return (
      <div className={cn(pos, frame, 'w-[min(17.5rem,calc(100%-2rem))] rounded-2xl p-3')}>
        {audio}
        <div className="flex items-center gap-3">
          <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-[var(--bio-line)]">{cover}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[0.84rem] font-medium text-[var(--bio-fg)]">{name}</span>
            {by && <span className="block truncate text-[0.72rem] text-[var(--bio-mute)]">{by}</span>}
          </span>
          {playBtn('size-9')}
        </div>
        {a.progress && (
          <div className="mt-3 flex items-center gap-2">
            <span className="w-8 text-[0.64rem] text-[var(--bio-mute)] tabular-nums">{clock(at)}</span>
            <Seek at={at} len={len} onSeek={seek} />
            <span className="w-8 text-right text-[0.64rem] text-[var(--bio-mute)] tabular-nums">{clock(len)}</span>
            {muteBtn}
          </div>
        )}
      </div>
    )
  }

  if (a.player === 'vinyl') {
    return (
      <div className={cn(pos, 'flex items-center gap-3', a.place[1] === 'r' && 'flex-row-reverse')}>
        {audio}
        <button type="button" onClick={toggle} aria-label={playing ? 'Pause the music' : 'Play the music'} className="relative grid size-[4.5rem] shrink-0 place-items-center rounded-full shadow-[0_10px_30px_-8px_rgb(0_0_0/0.8)]" style={{ background: 'repeating-radial-gradient(circle at 50% 50%, #0b0b0b 0 2px, #1b1b1b 2px 3px)' }}>
          <span aria-hidden="true" className="absolute inset-0 rounded-full" style={{ background: 'conic-gradient(from 20deg, transparent 0 20%, rgb(255 255 255 / 0.1) 25%, transparent 30% 70%, rgb(255 255 255 / 0.08) 75%, transparent 80%)', animation: 'bio-spin 3.6s linear infinite', animationPlayState: playing && !reduced ? 'running' : 'paused' }} />
          <span className="relative grid size-[44%] place-items-center overflow-hidden rounded-full bg-[var(--bio-bg)] ring-2 ring-black/60" style={{ animation: 'bio-spin 3.6s linear infinite', animationPlayState: playing && !reduced ? 'running' : 'paused' }}>
            {cover}
          </span>
          <span aria-hidden="true" className="absolute size-1.5 rounded-full bg-black" />
        </button>
        <span className={cn(frame, 'max-w-[11rem] min-w-0 rounded-2xl px-3 py-2', a.place[1] === 'r' && 'text-right')}>
          <span className="block truncate text-[0.8rem] font-medium text-[var(--bio-fg)]">{name}</span>
          {by && <span className="block truncate text-[0.68rem] text-[var(--bio-mute)]">{by}</span>}
          {a.progress && (
            <span className="mt-1.5 block">
              <Seek at={at} len={len} onSeek={seek} />
            </span>
          )}
        </span>
      </div>
    )
  }

  if (a.player === 'bar') {
    return (
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
        {eq}
        {muteBtn}
      </div>
    )
  }

  if (a.player === 'bubble') {
    const r = len > 0 ? Math.min(1, at / len) : 0
    return (
      <div className={cn(pos, 'group')}>
        {audio}
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
      </div>
    )
  }

  // the pill
  return (
    <div className={cn(pos, frame, 'flex items-center gap-1.5 overflow-hidden rounded-full p-1.5 pr-3')}>
      {audio}
      {playBtn('size-8')}
      {eq}
      <span className="max-w-[10rem] truncate text-[0.74rem] text-[var(--bio-mute)]">{name}</span>
      {muteBtn}
      {a.progress && len > 0 && <span aria-hidden="true" className="absolute inset-x-4 bottom-0 h-[2px] rounded-full bg-[var(--bio-fg)] opacity-60" style={{ transform: `scaleX(${Math.min(1, at / len)})`, transformOrigin: 'left' }} />}
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
