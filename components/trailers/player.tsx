'use client'

import { motion } from 'framer-motion'
import { ExternalLink } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Clip } from '@/lib/trailers/types'
import { GButton } from './ui'
import { type YtEvent, embedUrl, listen, send, theaterUrl, watchUrl } from './yt'

/** How long a trailer may take to start before we say so and offer another way to watch it. */
const STUCK_MS = 7000

type Props = {
  videoKey: string
  /** it should be playing right now */
  run: boolean
  muted: boolean
  /** a smaller video and no frills, for a slower computer */
  lite: boolean
  /** when it ends, play it again (rather than calling `onEnded`) */
  loop: boolean
  onEnded: () => void
  /** YouTube says this video cannot be played in a page like this one */
  onBroken: () => void
  onTime: (time: number, duration: number) => void
  /** true when the trailer has not started after a while (YouTube asking for a check, or the browser holding autoplay back) */
  onStuck: (stuck: boolean) => void
}

/**
 * The one YouTube player of the trailers site. It is made once and then told which trailer to hold, so scrolling through trailers never builds
 * or tears down a player (a YouTube player is the heaviest thing on the page). It plays muted at first, is shown only once it really plays, and
 * is drawn smaller than the screen and scaled up, which makes YouTube choose a lighter video.
 */
export function TrailerPlayer(p: Props) {
  const frame = useRef<HTMLIFrameElement>(null)
  const stop = useRef<(() => void) | null>(null)
  const [src] = useState(() => embedUrl(p.videoKey, window.location.origin))
  const [ready, setReady] = useState(false)
  const [shown, setShown] = useState(false)
  const [scale, setScale] = useState(1.3)
  const loaded = useRef(p.videoKey) // the trailer the player has been told to hold
  const inPlayer = useRef<string | null>(null) // the trailer the player says it is holding
  const live = useRef(p)
  useEffect(() => {
    live.current = p
  })

  // drawn at 720p (480p when light) and scaled to cover the screen
  const W = p.lite ? 768 : 1280
  const H = Math.round((W * 9) / 16)
  useEffect(() => {
    const f = () => setScale(Math.max(window.innerWidth / W, window.innerHeight / H) * 1.04)
    f()
    window.addEventListener('resize', f)
    return () => window.removeEventListener('resize', f)
  }, [W, H])

  const onEvent = useCallback((e: YtEvent) => {
    const c = live.current
    const mine = () => inPlayer.current === null || inPlayer.current === loaded.current
    if (e.type === 'ready') setReady(true)
    else if (e.type === 'video') inPlayer.current = e.id
    else if (e.type === 'time') {
      if (mine()) c.onTime(e.time, e.duration)
    } else if (e.type === 'state') {
      if (e.state === 1) {
        if (mine()) {
          setShown(true)
          c.onStuck(false)
        }
      } else if (e.state === -1 || e.state === 5) setShown(false)
      else if (e.state === 0 && mine()) {
        if (c.loop) {
          send(frame.current, 'seekTo', [0, true])
          send(frame.current, 'playVideo')
        } else c.onEnded()
      }
    } else if (e.type === 'error') {
      // 2, 5: the player failed; 100: gone or private; 101, 150: the owner does not allow it in other pages
      if ([2, 5, 100, 101, 150].includes(e.code)) c.onBroken()
      else c.onStuck(true) // 153 and the like: YouTube wants more than we can give it here
    }
  }, [])

  const onLoad = useCallback(() => {
    const f = frame.current
    if (!f) return
    stop.current?.()
    stop.current = listen(f, onEvent)
  }, [onEvent])
  useEffect(() => () => stop.current?.(), [])

  // a different trailer: stop the old one at once, and ask for the new one once the scrolling has settled
  useEffect(() => {
    setShown(false)
    live.current.onStuck(false)
    if (!ready || p.videoKey === loaded.current) return
    // from now on anything the old trailer says is ignored (it is not the one we want)
    loaded.current = p.videoKey
    send(frame.current, 'pauseVideo')
    const t = setTimeout(() => send(frame.current, live.current.run ? 'loadVideoById' : 'cueVideoById', [live.current.videoKey, 0]), 320)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.videoKey, ready])

  useEffect(() => {
    if (ready) send(frame.current, p.run ? 'playVideo' : 'pauseVideo')
  }, [p.run, ready])
  useEffect(() => {
    if (ready) send(frame.current, p.muted ? 'mute' : 'unMute')
  }, [p.muted, ready])

  // a hidden tab plays nothing
  useEffect(() => {
    const f = () => {
      if (!live.current.run) return
      send(frame.current, document.visibilityState === 'visible' ? 'playVideo' : 'pauseVideo')
    }
    document.addEventListener('visibilitychange', f)
    return () => document.removeEventListener('visibilitychange', f)
  }, [])

  // it should be playing, and is not: say so after a while (never while the tab is hidden)
  useEffect(() => {
    if (!p.run || shown) return
    let t: ReturnType<typeof setTimeout>
    const check = () => {
      if (document.visibilityState !== 'visible') t = setTimeout(check, 2000)
      else live.current.onStuck(true)
    }
    t = setTimeout(check, STUCK_MS)
    return () => clearTimeout(t)
  }, [p.run, p.videoKey, shown])

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden" style={{ opacity: shown ? 1 : 0, transition: 'opacity 700ms ease' }}>
      <iframe
        ref={frame}
        src={src}
        title="Trailer"
        allow="autoplay; encrypted-media; picture-in-picture"
        referrerPolicy="strict-origin-when-cross-origin"
        tabIndex={-1}
        onLoad={onLoad}
        className="absolute top-1/2 left-1/2 border-0"
        style={{ width: W, height: H, transform: `translate(-50%, -50%) scale(${scale})` }}
      />
    </div>
  )
}

/**
 * The trailer in a window of its own, with YouTube's own controls. It is what a person gets when the shared player could not start by itself:
 * pressing play here is a real click, which is what browsers and YouTube's checks want to see.
 */
export function Theater({ clip, onClose }: { clip: Clip; onClose: () => void }) {
  const root = useRef<HTMLDivElement>(null)
  // keys go to the window until a click inside the video hands the focus to YouTube
  useEffect(() => {
    root.current?.focus()
  }, [])
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      onClose()
    }
    window.addEventListener('keydown', k, true)
    return () => window.removeEventListener('keydown', k, true)
  }, [onClose])

  return (
    <motion.div
      ref={root}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={`${clip.title}: trailer`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      onClick={onClose}
      className="fixed inset-0 z-[90] grid place-items-center bg-black/90 px-[6vw] outline-none"
    >
      <div className="w-full max-w-[1180px]" onClick={(e) => e.stopPropagation()}>
        <div className="relative aspect-video overflow-hidden rounded-[28px] border border-white/15 bg-black shadow-[0_40px_120px_-30px_rgb(0_0_0/0.9)]">
          <iframe src={theaterUrl(clip.trailer.key, window.location.origin)} title={`${clip.title}: trailer`} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" className="absolute inset-0 size-full border-0" />
        </div>
        <div className="mt-5 flex items-center justify-between gap-6">
          <p className="min-w-0 truncate font-display text-[1.7rem] text-paper">{clip.title}</p>
          <div className="flex shrink-0 items-center gap-3">
            <a href={watchUrl(clip.trailer.key)} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-full border border-white/20 px-5 text-[14px] text-paper/85 transition-colors hover:border-white/40 hover:text-paper">
              Open on YouTube <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
            <GButton size="sm" onClick={onClose}>Close</GButton>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
