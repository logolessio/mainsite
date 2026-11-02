'use client'

import { type MotionValue, motion, useTransform } from 'framer-motion'
import { Pause, Play, Volume2, VolumeX } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { useBio } from './context'

/**
 * The music of a page. It starts when the page is entered (or on the first press anywhere, when there is no enter screen), loops, and drives `level`, the
 * loudness the backgrounds and the picture's ring react to. A small pill in the corner pauses it and changes the volume.
 */
export function MusicPlayer({ level }: { level: MotionValue<number> }) {
  const { cfg, mode, entered, reduced } = useBio()
  const a = cfg.audio
  const el = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [blocked, setBlocked] = useState(false)
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
      if (a.reactive && !ctx.current && typeof AudioContext !== 'undefined') {
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
  }, [on, entered]) // eslint-disable-line react-hooks/exhaustive-deps

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
  return (
    <div className="absolute bottom-4 left-4 z-30 flex items-center gap-1.5 rounded-full border border-[var(--bio-line)] bg-[var(--bio-soft)] p-1.5 pr-3 backdrop-blur-xl">
      <audio ref={el} src={`/api/audio/${a.id}`} loop={a.loop} preload="auto" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} />
      <button type="button" onClick={toggle} aria-label={playing ? 'Pause the music' : 'Play the music'} className="grid size-8 place-items-center rounded-full bg-[var(--bio-fg)] text-[var(--bio-bg)] transition-transform hover:scale-105">
        {playing ? <Pause className="size-3.5" fill="currentColor" /> : <Play className="size-3.5 translate-x-px" fill="currentColor" />}
      </button>
      <span className="flex h-4 items-end gap-[3px]" aria-hidden="true">
        {bars.map((m, i) => (
          <Bar key={i} level={level} m={m} playing={playing && !reduced} i={i} />
        ))}
      </span>
      <span className="max-w-[10rem] truncate text-[0.74rem] text-[var(--bio-mute)]">{blocked ? 'press to play' : a.title || 'now playing'}</span>
      <button type="button" onClick={() => setMuted((v) => !v)} aria-label={muted ? 'Unmute' : 'Mute'} className={cn('grid size-6 place-items-center rounded-full text-[var(--bio-mute)] transition-colors hover:text-[var(--bio-fg)]')}>
        {muted ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5" />}
      </button>
    </div>
  )
}

function Bar({ level, m, playing, i }: { level: MotionValue<number>; m: number; playing: boolean; i: number }) {
  const h = useTransform(level, (v) => (playing ? 0.18 + Math.min(1, v * m * 1.4 + 0.12 * Math.abs(Math.sin(i + performance.now() / 260))) * 0.82 : 0.18))
  return <motion.span className="block h-full w-[3px] origin-bottom rounded-full bg-[var(--bio-fg)]" style={{ scaleY: h }} />
}
