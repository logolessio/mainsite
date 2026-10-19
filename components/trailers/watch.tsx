'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ExternalLink, Maximize2, MonitorPlay, Pause, Play, Volume2, VolumeX } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { GlassSurface } from '@/components/glass/glass'
import { type Clip, backdrop } from '@/lib/trailers/types'
import { api, miniOf, useTrailers } from './ctx'
import { Theater, TrailerPlayer } from './player'
import { ActionRail } from './rail'
import { Skeleton, EASE, GButton } from './ui'
import { WherePopup } from './where'
import { watchUrl } from './yt'

const hours = (m: number) => (m ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m` : '')
const SLIDE = 'transform 620ms cubic-bezier(0.22, 1, 0.36, 1)'

/** A layer that carries every trailer's page and slides one page for each trailer (on the graphics chip, with a transform, not on the processor). */
function Slide({ index, H, children }: { index: number; H: number; children: React.ReactNode }) {
  return (
    <div className="absolute inset-x-0 top-0 will-change-transform" style={{ transform: `translate3d(0, ${-index * H}px, 0)`, transition: SLIDE }}>
      {children}
    </div>
  )
}

/** What is behind the video: the film's own picture, which also shows while the trailer loads or if it cannot play. */
function Back({ clip, top, H, active, lite }: { clip: Clip; top: number; H: number; active: boolean; lite: boolean }) {
  return (
    <div className="absolute inset-x-0 overflow-hidden bg-black" style={{ top, height: H }}>
      {clip.backdrop && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={backdrop(clip.backdrop, lite ? 780 : 1280)} alt="" draggable={false} decoding="async" className={`absolute inset-0 size-full object-cover ${active && !lite ? 'tr-kb' : ''}`} />
      )}
    </div>
  )
}

function Genre({ children, lite }: { children: string; lite: boolean }) {
  if (lite) return <span className="rounded-full bg-white/15 px-3.5 py-1.5 text-[13px] text-paper/90">{children}</span>
  return (
    <GlassSurface flat className="w-fit" inner="px-3.5 py-1.5 text-[13px] text-paper/90">
      <span className="relative z-10">{children}</span>
    </GlassSurface>
  )
}

function Details({ clip, lite }: { clip: Clip; lite: boolean }) {
  return (
    <motion.div
      initial={lite ? { opacity: 0, y: 20 } : { opacity: 0, y: 36, filter: 'blur(14px)' }}
      animate={lite ? { opacity: 1, y: 0 } : { opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={lite ? { opacity: 0, transition: { duration: 0.15 } } : { opacity: 0, y: -16, filter: 'blur(8px)', transition: { duration: 0.2 } }}
      transition={{ duration: lite ? 0.45 : 0.8, ease: EASE, delay: lite ? 0 : 0.12 }}
    >
      <div className="flex flex-wrap items-center gap-2.5 text-[14px] text-paper/80">
        {clip.genres.map((g) => (
          <Genre key={g} lite={lite}>{g}</Genre>
        ))}
        <span className="text-paper/60">{[clip.year, hours(clip.runtime), clip.cert].filter(Boolean).join('  ·  ')}</span>
        {clip.rating > 0 && <span className="rounded-full bg-paper/15 px-2.5 py-1 text-[13px] text-paper">★ {clip.rating.toFixed(1)}</span>}
      </div>
      <h2 className="mt-5 font-display text-[clamp(3rem,6.2vw,6.8rem)] leading-[1.0] text-paper [text-shadow:0_4px_40px_rgb(0_0_0/0.5)]">{clip.title}</h2>
      {clip.tagline && <p className="mt-3 font-display text-[clamp(1.1rem,1.5vw,1.5rem)] text-paper/70 italic">{clip.tagline}</p>}
      <p className="mt-5 line-clamp-3 max-w-[600px] text-[clamp(.95rem,1.1vw,1.1rem)] leading-relaxed text-paper/70">{clip.overview}</p>
      {(clip.cast.length > 0 || clip.director) && (
        <p className="mt-5 text-[14px] text-paper/50">
          {clip.director && <>Directed by <span className="text-paper/80">{clip.director}</span></>}
          {clip.director && clip.cast.length > 0 && '  ·  '}
          {clip.cast.length > 0 && <>With <span className="text-paper/80">{clip.cast.slice(0, 3).join(', ')}</span></>}
        </p>
      )}
    </motion.div>
  )
}

/** What is in front of the video: light to read by, the film's glow, and the words. */
function Front({ clip, top, H, active, ambient, lite }: { clip: Clip; top: number; H: number; active: boolean; ambient: boolean; lite: boolean }) {
  return (
    <div className="absolute inset-x-0" style={{ top, height: H }}>
      {ambient && !lite && clip.poster && (
        // the film's own colours, spread soft behind the words
        // eslint-disable-next-line @next/next/no-img-element
        <img src={backdrop(clip.poster, 780)} alt="" aria-hidden="true" draggable={false} className="pointer-events-none absolute -bottom-[10%] -left-[8%] h-[85%] w-[62%] object-cover opacity-40 mix-blend-screen blur-[90px]" />
      )}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgb(0_0_0/0.86)_0%,rgb(0_0_0/0.4)_30%,transparent_58%),linear-gradient(to_right,rgb(0_0_0/0.55),transparent_55%),linear-gradient(to_bottom,rgb(0_0_0/0.5),transparent_22%)]" />
      <div className="pointer-events-none absolute bottom-[19vh] left-[5.5vw] max-w-[min(720px,52vw)]">
        <AnimatePresence mode="wait">{active && <Details key={clip.id} clip={clip} lite={lite} />}</AnimatePresence>
      </div>
    </div>
  )
}

export function WatchView({ suspended, jump, onJumped, whereOpen, setWhereOpen }: { suspended: boolean; jump: Clip | null; onJumped: () => void; whereOpen: boolean; setWhereOpen: (b: boolean) => void }) {
  const { settings, liked, saved, toggle, toast, patchSettings, lite } = useTrailers()
  const [clips, setClips] = useState<Clip[]>([])
  const [index, setIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState('')
  const [paused, setPaused] = useState(false)
  const [muted, setMuted] = useState(true)
  const [stuck, setStuck] = useState(false)
  const [theater, setTheater] = useState(false)
  const [H, setH] = useState(800)
  const inflight = useRef(false)
  const clipsRef = useRef<Clip[]>([])
  const indexRef = useRef(0)
  const cursorRef = useRef(0)
  const bar = useRef<HTMLDivElement>(null)
  clipsRef.current = clips
  indexRef.current = index

  // sound: on when the person has asked for it and the browser has been touched (otherwise it would be blocked, or it would stop the video)
  useEffect(() => {
    const active = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation?.hasBeenActive ?? false
    setMuted(!(settings.sound && active))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const f = () => setH(window.innerHeight)
    f()
    window.addEventListener('resize', f, { passive: true })
    return () => window.removeEventListener('resize', f)
  }, [])

  const more = useCallback(async (from?: number) => {
    if (inflight.current) return
    inflight.current = true
    try {
      const have = clipsRef.current.map((c) => c.id).slice(-200)
      const r = await api<{ clips: Clip[]; next: number }>(`/api/trailers/feed?cursor=${from ?? cursorRef.current}&exclude=${have.join(',')}`)
      cursorRef.current = r.next
      setClips((cur) => {
        const ids = new Set(cur.map((c) => c.id))
        return [...cur, ...r.clips.filter((c) => !ids.has(c.id))]
      })
      setFailed('')
    } catch (e) {
      setFailed(e instanceof Error ? e.message : 'Could not load trailers.')
    } finally {
      inflight.current = false
      setLoading(false)
    }
  }, [])

  // the first trailers (a shared link opens its movie first)
  useEffect(() => {
    let live = true
    ;(async () => {
      const m = new URLSearchParams(location.search).get('m')
      if (m && /^\d+$/.test(m)) {
        try {
          const r = await api<{ clip: Clip }>(`/api/trailers/movie/${m}`)
          if (live) setClips([r.clip])
        } catch {
          /* the link's movie has no trailer: carry on with the feed */
        }
      }
      if (live) await more(0)
    })()
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // a movie chosen elsewhere (the search, a list) plays next
  useEffect(() => {
    if (!jump) return
    const at = clipsRef.current.findIndex((c) => c.id === jump.id)
    if (at >= 0) setIndex(at)
    else {
      const i = indexRef.current
      setClips((cur) => [...cur.slice(0, i + 1), jump, ...cur.slice(i + 1)])
      setIndex(i + 1)
    }
    setPaused(false)
    onJumped()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jump])

  // moving between trailers does not depend on anything that changes while it runs (the scroll handler below keeps its place across calls)
  const go = useCallback(
    (d: number) => {
      const n = Math.max(0, Math.min(clipsRef.current.length - 1, indexRef.current + d))
      if (n === indexRef.current) {
        if (d > 0) void more()
        return
      }
      indexRef.current = n
      setIndex(n)
      setPaused(false)
      if (n >= clipsRef.current.length - 3) void more()
    },
    [more],
  )

  const blocked = suspended || whereOpen || theater

  // Scrolling: one flick of a wheel or a trackpad is one trailer, however long the momentum carries on, and one notch of a mouse wheel is one
  // trailer too. Wheels report in pixels, lines or pages depending on the browser, so everything is turned into pixels first, and a gesture only
  // has to add up to a small push. A gesture is over when the events stop for a moment.
  useEffect(() => {
    if (blocked) return
    let acc = 0
    let last = 0
    let locked = false
    let lockedAt = 0
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return // a pinch on a trackpad zooms the page: leave it alone
      e.preventDefault()
      const dy = e.deltaMode === 1 ? e.deltaY * 32 : e.deltaMode === 2 ? e.deltaY * window.innerHeight : e.deltaY
      if (Math.abs(dy) < 1) return
      const now = performance.now()
      const gap = now - last
      last = now
      if (locked) {
        if (gap > 140 && now - lockedAt > 380) locked = false
        else return
      }
      if (gap > 160) acc = 0
      acc += dy
      if (Math.abs(acc) >= 24) {
        go(acc > 0 ? 1 : -1)
        acc = 0
        locked = true
        lockedAt = now
      }
    }
    window.addEventListener('wheel', onWheel, { passive: false })
    return () => window.removeEventListener('wheel', onWheel)
  }, [go, blocked])

  const cur = clips[index]
  const share = useCallback(async () => {
    if (!cur) return
    const link = `${location.origin}${location.hostname.startsWith('scroll.') ? '/' : '/trailers'}?m=${cur.id}`
    try {
      await navigator.clipboard.writeText(link)
      toast('Link copied')
    } catch {
      toast(link)
    }
  }, [cur, toast])

  // keys
  useEffect(() => {
    if (blocked) return
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const k = e.key.toLowerCase()
      if (k === 'arrowdown' || k === 'j' || k === 'pagedown') (e.preventDefault(), go(1))
      else if (k === 'arrowup' || k === 'k' || k === 'pageup') (e.preventDefault(), go(-1))
      else if (k === ' ') (e.preventDefault(), setPaused((p) => !p))
      else if (k === 'm') setMuted((m) => !m)
      else if (k === 'l' && cur) void toggle('like', miniOf(cur))
      else if (k === 's' && cur) void toggle('save', miniOf(cur))
      else if (k === 'w' && cur) setWhereOpen(true)
      else if (k === 'f') (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.())
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, blocked, cur, toggle, setWhereOpen])

  const broken = useCallback(
    (id: number) => {
      setClips((cs) => {
        const at = cs.findIndex((c) => c.id === id)
        if (at < 0) return cs
        const next = cs.filter((c) => c.id !== id)
        const i = indexRef.current
        if (at < i) setIndex(Math.max(0, i - 1))
        else if (next.length <= i) setIndex(Math.max(0, next.length - 1))
        if (next.length < i + 4) void more()
        return next
      })
    },
    [more],
  )

  // the progress line is drawn by hand: it changes four times a second, which should never mean drawing the whole page again
  const curId = clips[index]?.id
  useEffect(() => {
    if (bar.current) bar.current.style.width = '0%'
  }, [curId])
  const onTime = useCallback((t: number, d: number) => {
    if (bar.current) bar.current.style.width = d > 0 ? `${Math.min(100, (t / d) * 100)}%` : '0%'
  }, [])

  if (!clips.length) {
    return (
      <div className="absolute inset-0 grid place-items-center bg-black">
        {failed ? (
          <div className="max-w-sm text-center">
            <p className="font-display text-3xl">The trailers did not load.</p>
            <p className="mt-3 text-paper/55">{failed}</p>
            <button type="button" onClick={() => { setLoading(true); void more(0) }} className="mt-6 text-paper underline underline-offset-4">Try again</button>
          </div>
        ) : (
          <Skeleton className="size-full" />
        )}
      </div>
    )
  }

  // only the trailer on screen and the ones beside it are drawn
  const near = clips.map((c, i) => ({ c, i })).filter(({ i }) => Math.abs(i - index) <= 1)

  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      <Slide index={index} H={H}>
        {near.map(({ c, i }) => (
          <Back key={c.id} clip={c} top={i * H} H={H} active={i === index} lite={lite} />
        ))}
      </Slide>

      {cur && (
        <TrailerPlayer
          videoKey={cur.trailer.key}
          run={!paused && !blocked}
          muted={muted}
          lite={lite}
          loop={!settings.autoNext}
          onEnded={() => go(1)}
          onBroken={() => broken(cur.id)}
          onTime={onTime}
          onStuck={setStuck}
        />
      )}

      <Slide index={index} H={H}>
        {near.map(({ c, i }) => (
          <Front key={c.id} clip={c} top={i * H} H={H} active={i === index && !suspended} ambient={settings.ambient} lite={lite} />
        ))}
      </Slide>

      {/* a click anywhere pauses or plays */}
      <button type="button" aria-label={paused ? 'Play the trailer' : 'Pause the trailer'} onClick={() => setPaused((p) => !p)} className="absolute inset-0 cursor-default rounded-none outline-none" />

      {!suspended && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-[3px] bg-white/10">
          <div ref={bar} className="h-full w-0 bg-paper/90" />
        </div>
      )}
      <AnimatePresence>
        {!suspended && paused && (
          <motion.div initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.2 }} transition={{ type: 'spring', stiffness: 400, damping: 26 }} className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <GlassSurface lens className="size-24" inner="grid place-items-center">
              <Play className="relative z-10 size-9 fill-paper text-paper" aria-hidden="true" />
            </GlassSurface>
          </motion.div>
        )}
      </AnimatePresence>

      {cur && !suspended && (
        <>
          <ActionRail
            actions={[
              { id: 'like', label: liked(cur.id) ? 'Unlike' : 'Like', on: liked(cur.id), onClick: () => void toggle('like', miniOf(cur)) },
              { id: 'save', label: saved(cur.id) ? 'Remove from saved' : 'Save', on: saved(cur.id), onClick: () => void toggle('save', miniOf(cur)) },
              { id: 'share', label: 'Share', onClick: () => void share() },
              { id: 'watch', label: 'Where to watch', onClick: () => setWhereOpen(true) },
            ]}
          />
          <div className="fixed top-7 right-8 z-40 flex items-center gap-3">
            <TopButton label="Watch the trailer in a window" lite={lite} onClick={() => setTheater(true)}>
              <MonitorPlay className="size-5" />
            </TopButton>
            <TopButton label={muted ? 'Turn the sound on' : 'Turn the sound off'} lite={lite} onClick={() => { setMuted((m) => !m); if (muted && !settings.sound) void patchSettings({ sound: true }) }}>
              {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
            </TopButton>
            <TopButton label={paused ? 'Play' : 'Pause'} lite={lite} onClick={() => setPaused((p) => !p)}>
              {paused ? <Play className="size-5" /> : <Pause className="size-5" />}
            </TopButton>
            <TopButton label="Full screen" lite={lite} onClick={() => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.())}>
              <Maximize2 className="size-[18px]" />
            </TopButton>
          </div>
          <div className="pointer-events-none fixed top-1/2 left-5 z-30 hidden -translate-y-1/2 flex-col items-center gap-1.5 xl:flex" aria-hidden="true">
            {clips.slice(Math.max(0, index - 3), index + 4).map((c) => (
              <span key={c.id} className="block w-[3px] rounded-full bg-paper transition-all duration-500" style={{ height: c.id === cur.id ? 26 : 6, opacity: c.id === cur.id ? 0.95 : 0.25 }} />
            ))}
          </div>

          {/* the trailer would not start by itself: say so, and give two ways that always work */}
          <div className="pointer-events-none fixed inset-x-0 top-24 z-40 flex justify-center">
            <AnimatePresence>
              {stuck && !paused && !blocked && (
                <motion.div initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }} transition={{ duration: 0.45, ease: EASE }} className="pointer-events-auto">
                  <GlassSurface radius={34} flat className="w-fit" inner="flex items-center gap-6 py-3 pr-3 pl-7">
                    <div className="relative z-10">
                      <p className="text-[15px] text-paper">This trailer did not start by itself.</p>
                      <p className="mt-0.5 text-[12.5px] text-paper/55">Your browser or YouTube is holding it back.</p>
                    </div>
                    <div className="relative z-10 flex items-center gap-1.5">
                      <GButton size="sm" variant="primary" onClick={() => setTheater(true)}>Play it here</GButton>
                      <a href={watchUrl(cur.trailer.key)} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-full px-4 text-[14px] text-paper/85 transition-colors hover:text-paper">
                        Open on YouTube <ExternalLink className="size-3.5" aria-hidden="true" />
                      </a>
                    </div>
                  </GlassSurface>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </>
      )}

      <AnimatePresence>{whereOpen && cur && <WherePopup clip={cur} onClose={() => setWhereOpen(false)} />}</AnimatePresence>
      <AnimatePresence>{theater && cur && <Theater clip={cur} onClose={() => setTheater(false)} />}</AnimatePresence>
      {loading && <span className="sr-only">Loading more trailers</span>}
    </div>
  )
}

function TopButton({ children, label, onClick, lite }: { children: React.ReactNode; label: string; onClick: () => void; lite: boolean }) {
  return (
    <motion.button type="button" aria-label={label} title={label} onClick={onClick} whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.9 }} transition={{ type: 'spring', stiffness: 520, damping: 24 }} className="relative grid size-12 place-items-center rounded-full text-paper outline-none focus-visible:ring-2 focus-visible:ring-paper/70">
      {lite ? <span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-full border border-white/15 bg-black/55" /> : <GlassSurface shine flat className="pointer-events-none absolute inset-0" />}
      <span className="relative z-10">{children}</span>
    </motion.button>
  )
}
