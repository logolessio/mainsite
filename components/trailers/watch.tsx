'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Maximize2, Pause, Play, Volume2, VolumeX } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { GlassSurface } from '@/components/glass/glass'
import { type Clip, backdrop } from '@/lib/trailers/types'
import { api, miniOf, useTrailers } from './ctx'
import { ActionRail } from './rail'
import { Skeleton, EASE } from './ui'
import { WherePopup } from './where'
import { INITIAL, type YtState, embedUrl, send, watch } from './yt'

const hours = (m: number) => (m ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m` : '')

/** One trailer: the film's backdrop, the video over it once it plays, and the details. */
function Card({ clip, active, near, paused, muted, autoNext, ambient, onEnded, onBroken, onToggle }: { clip: Clip; active: boolean; near: boolean; paused: boolean; muted: boolean; autoNext: boolean; ambient: boolean; onEnded: () => void; onBroken: () => void; onToggle: () => void }) {
  const frame = useRef<HTMLIFrameElement>(null)
  const [st, setSt] = useState<YtState>(INITIAL)
  const url = useMemo(() => (near && typeof window !== 'undefined' ? embedUrl(clip.trailer.key, window.location.origin) : null), [near, clip.trailer.key])

  useEffect(() => {
    if (!url) {
      setSt(INITIAL)
      return
    }
    const f = frame.current
    if (!f) return
    const onLoad = () => watch(f, (p) => setSt((s) => ({ ...s, ...p })))
    let stop: (() => void) | undefined
    const run = () => {
      stop?.()
      stop = onLoad()
    }
    f.addEventListener('load', run)
    if (f.contentDocument?.readyState === 'complete') run()
    return () => {
      f.removeEventListener('load', run)
      stop?.()
    }
  }, [url])

  // play while this is the one on screen, rest while it is not
  useEffect(() => {
    if (!st.ready) return
    if (active && !paused) send(frame.current, 'playVideo')
    else send(frame.current, 'pauseVideo')
    if (!active) send(frame.current, 'seekTo', [0, true])
  }, [active, paused, st.ready])
  useEffect(() => {
    if (st.ready) send(frame.current, muted ? 'mute' : 'unMute')
  }, [muted, st.ready, active])

  useEffect(() => {
    if (active && st.ended) {
      if (autoNext) onEnded()
      else {
        send(frame.current, 'seekTo', [0, true])
        send(frame.current, 'playVideo')
      }
    }
  }, [st.ended, active, autoNext, onEnded])
  useEffect(() => {
    if (st.error) onBroken()
  }, [st.error, onBroken])

  const pct = st.duration ? Math.min(100, (st.time / st.duration) * 100) : 0

  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      {clip.backdrop && (
        // eslint-disable-next-line @next/next/no-img-element
        <motion.img src={backdrop(clip.backdrop, 1280)} alt="" draggable={false} className="absolute inset-0 size-full object-cover" initial={false} animate={{ scale: active ? 1.08 : 1 }} transition={{ duration: 14, ease: 'linear' }} />
      )}
      {url && (
        <iframe
          ref={frame}
          src={url}
          title={`${clip.title}: trailer`}
          allow="autoplay; encrypted-media; picture-in-picture"
          tabIndex={-1}
          className="pointer-events-none absolute top-1/2 left-1/2 border-0 transition-opacity duration-[900ms]"
          style={{ width: 'max(100vw, 177.78vh)', height: 'max(56.25vw, 100vh)', transform: 'translate(-50%, -50%) scale(1.12)', opacity: st.playing && active ? 1 : 0 }}
        />
      )}
      {ambient && clip.poster && (
        // the film's own colours, spread soft behind the words
        // eslint-disable-next-line @next/next/no-img-element
        <img src={backdrop(clip.poster, 780)} alt="" aria-hidden="true" draggable={false} className="pointer-events-none absolute -bottom-[10%] -left-[8%] h-[85%] w-[62%] object-cover opacity-40 mix-blend-screen blur-[90px]" />
      )}
      {/* light to read by, and a click anywhere pauses or plays */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgb(0_0_0/0.86)_0%,rgb(0_0_0/0.4)_30%,transparent_58%),linear-gradient(to_right,rgb(0_0_0/0.55),transparent_55%),linear-gradient(to_bottom,rgb(0_0_0/0.5),transparent_22%)]" />
      <button type="button" aria-label={paused ? 'Play the trailer' : 'Pause the trailer'} onClick={onToggle} className="absolute inset-0 cursor-default rounded-none outline-none" />

      <div className="pointer-events-none absolute bottom-[19vh] left-[5.5vw] max-w-[min(720px,52vw)]">
        <AnimatePresence mode="wait">
          {active && (
            <motion.div key={clip.id} initial={{ opacity: 0, y: 36, filter: 'blur(14px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, y: -16, filter: 'blur(8px)', transition: { duration: 0.2 } }} transition={{ duration: 0.8, ease: EASE, delay: 0.12 }}>
              <div className="flex flex-wrap items-center gap-2.5 text-[14px] text-paper/80">
                {clip.genres.map((g) => (
                  <GlassSurface key={g} flat className="w-fit" inner="px-3.5 py-1.5 text-[13px] text-paper/90">
                    <span className="relative z-10">{g}</span>
                  </GlassSurface>
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
          )}
        </AnimatePresence>
      </div>

      {active && (
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[3px] bg-white/10">
          <div className="h-full bg-paper/90 transition-[width] duration-300 ease-linear" style={{ width: `${pct}%` }} />
        </div>
      )}
      <AnimatePresence>
        {active && paused && (
          <motion.div initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.2 }} transition={{ type: 'spring', stiffness: 400, damping: 26 }} className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <GlassSurface lens className="size-24" inner="grid place-items-center">
              <Play className="relative z-10 size-9 fill-paper text-paper" aria-hidden="true" />
            </GlassSurface>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function WatchView({ suspended, jump, onJumped, whereOpen, setWhereOpen }: { suspended: boolean; jump: Clip | null; onJumped: () => void; whereOpen: boolean; setWhereOpen: (b: boolean) => void }) {
  const { profile, settings, liked, saved, toggle, toast, patchSettings } = useTrailers()
  const [clips, setClips] = useState<Clip[]>([])
  const [index, setIndex] = useState(0)
  const [cursor, setCursor] = useState(0)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState('')
  const [paused, setPaused] = useState(false)
  const [muted, setMuted] = useState(true)
  const [H, setH] = useState(800)
  const inflight = useRef(false)
  const clipsRef = useRef<Clip[]>([])
  clipsRef.current = clips

  // sound: on when the person has asked for it and the browser has been touched (otherwise it would be blocked)
  useEffect(() => {
    const active = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation?.hasBeenActive ?? true
    setMuted(!(settings.sound && active))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const f = () => setH(window.innerHeight)
    f()
    window.addEventListener('resize', f)
    return () => window.removeEventListener('resize', f)
  }, [])

  const more = useCallback(
    async (fromCursor?: number) => {
      if (inflight.current) return
      inflight.current = true
      try {
        const have = clipsRef.current.map((c) => c.id).slice(-200)
        const r = await api<{ clips: Clip[]; next: number }>(`/api/trailers/feed?cursor=${fromCursor ?? cursor}&exclude=${have.join(',')}`)
        setCursor(r.next)
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
    },
    [cursor],
  )

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
      setClips((cur) => [...cur.slice(0, index + 1), jump, ...cur.slice(index + 1)])
      setIndex(index + 1)
    }
    setPaused(false)
    onJumped()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jump])

  const go = useCallback(
    (d: number) => {
      setIndex((i) => {
        const n = Math.max(0, Math.min(clipsRef.current.length - 1, i + d))
        if (n >= clipsRef.current.length - 3) void more()
        return n
      })
      setPaused(false)
    },
    [more],
  )

  // scrolling: one flick of a wheel or a trackpad is one trailer, however long the momentum carries on
  useEffect(() => {
    if (suspended || whereOpen) return
    let acc = 0
    let last = 0
    let locked = false
    let lockedAt = 0
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const now = performance.now()
      const gap = now - last
      last = now
      if (locked) {
        // the momentum of the last flick has died down once there is a pause in the events (and the page has settled)
        if (gap > 120 && now - lockedAt > 500) locked = false
        else return
      }
      if (gap > 200) acc = 0
      acc += e.deltaY
      if (Math.abs(acc) > 70) {
        go(acc > 0 ? 1 : -1)
        acc = 0
        locked = true
        lockedAt = now
      }
    }
    window.addEventListener('wheel', onWheel, { passive: false })
    return () => window.removeEventListener('wheel', onWheel)
  }, [go, suspended, whereOpen])

  const cur = clips[index]
  const share = useCallback(async () => {
    if (!cur) return
    const link = `${location.origin}/trailers?m=${cur.id}`
    try {
      await navigator.clipboard.writeText(link)
      toast('Link copied')
    } catch {
      toast(link)
    }
  }, [cur, toast])

  // keys
  useEffect(() => {
    if (suspended) return
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (whereOpen) return
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
  }, [go, suspended, whereOpen, cur, toggle, setWhereOpen])

  const broken = useCallback(
    (id: number) => {
      setClips((cs) => {
        const at = cs.findIndex((c) => c.id === id)
        if (at < 0) return cs
        const next = cs.filter((c) => c.id !== id)
        if (at < index) setIndex((i) => Math.max(0, i - 1))
        else if (next.length <= index) setIndex(Math.max(0, next.length - 1))
        if (next.length < index + 4) void more()
        return next
      })
    },
    [index, more],
  )

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

  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      <motion.div className="absolute inset-x-0 top-0" animate={{ y: -index * H }} transition={{ type: 'spring', stiffness: 150, damping: 27, mass: 1.15 }}>
        {clips.map((c, i) =>
          Math.abs(i - index) <= 2 ? (
            <div key={c.id} className="absolute inset-x-0" style={{ top: i * H, height: H }}>
              <Card clip={c} active={i === index && !suspended} near={Math.abs(i - index) <= 1} paused={paused || suspended || (i === index && whereOpen && false)} muted={muted} autoNext={settings.autoNext} ambient={settings.ambient} onEnded={() => go(1)} onBroken={() => broken(c.id)} onToggle={() => setPaused((p) => !p)} />
            </div>
          ) : null,
        )}
      </motion.div>

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
            <TopButton label={muted ? 'Turn the sound on' : 'Turn the sound off'} onClick={() => { setMuted((m) => !m); if (muted && !settings.sound) void patchSettings({ sound: true }) }}>
              {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
            </TopButton>
            <TopButton label={paused ? 'Play' : 'Pause'} onClick={() => setPaused((p) => !p)}>
              {paused ? <Play className="size-5" /> : <Pause className="size-5" />}
            </TopButton>
            <TopButton label="Full screen" onClick={() => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.())}>
              <Maximize2 className="size-[18px]" />
            </TopButton>
          </div>
          <div className="pointer-events-none fixed top-1/2 left-5 z-30 hidden -translate-y-1/2 flex-col items-center gap-1.5 xl:flex" aria-hidden="true">
            {clips.slice(Math.max(0, index - 3), index + 4).map((c) => (
              <span key={c.id} className="block w-[3px] rounded-full bg-paper transition-all duration-500" style={{ height: c.id === cur.id ? 26 : 6, opacity: c.id === cur.id ? 0.95 : 0.25 }} />
            ))}
          </div>
        </>
      )}

      <AnimatePresence>{whereOpen && cur && <WherePopup clip={cur} onClose={() => setWhereOpen(false)} />}</AnimatePresence>
      {loading && <span className="sr-only">Loading more trailers</span>}
      {profile ? null : null}
    </div>
  )
}

function TopButton({ children, label, onClick }: { children: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <motion.button type="button" aria-label={label} title={label} onClick={onClick} whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.9 }} transition={{ type: 'spring', stiffness: 520, damping: 24 }} className="relative grid size-12 place-items-center rounded-full text-paper outline-none focus-visible:ring-2 focus-visible:ring-paper/70">
      <GlassSurface shine flat className="pointer-events-none absolute inset-0" />
      <span className="relative z-10">{children}</span>
    </motion.button>
  )
}
