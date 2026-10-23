'use client'

import { useEffect, useRef, useState } from 'react'
import { INTRO_BOX, INTRO_MS, INTRO_PX, INTRO_SRC } from '@/lib/logo-intro'
import { cn } from '@/lib/utils'
import { Logo } from './logo'

/**
 * The logo with the owner's animation, played once: the frames of the video itself, as a transparent animated image (public/logo-intro.webp, made by
 * scripts/make-logo-intro.py). An animated image is decoded and timed off the page's main thread, so it stays smooth while the page is still loading, and
 * it is the exact animation, not a redraw. When it has played, the still logo (an SVG) takes its place; people who ask their device for less motion get
 * the still logo straight away. `replay`: pointing at it plays it again. `initial="done"` skips the first play.
 */
export function IntroLogo({ className, replay = false, initial = 'playing' }: { className?: string; replay?: boolean; initial?: 'playing' | 'done' }) {
  const [phase, setPhase] = useState<'playing' | 'done'>(initial)
  const [src, setSrc] = useState(INTRO_SRC)
  const img = useRef<HTMLImageElement>(null)
  const timer = useRef<number | undefined>(undefined)
  const blob = useRef<string | null>(null)
  const playedAt = useRef(0)

  const finishIn = (ms: number) => {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setPhase('done'), ms)
  }

  useEffect(() => {
    if (phase !== 'playing') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return setPhase('done')
    const el = img.current
    if (el?.complete && el.naturalWidth) {
      // it loaded, and started playing, before the page woke up: count the time from when it arrived
      const e = performance.getEntriesByName(el.currentSrc)[0] as PerformanceResourceTiming | undefined
      const started = e ? e.responseEnd : performance.now()
      finishIn(Math.max(150, started + INTRO_MS + 150 - performance.now()))
    }
    return () => window.clearTimeout(timer.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(
    () => () => {
      if (blob.current) URL.revokeObjectURL(blob.current)
    },
    [],
  )

  const again = async () => {
    if (!replay || phase !== 'done' || Date.now() - playedAt.current < 800) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    playedAt.current = Date.now()
    try {
      // a fresh address makes the browser start the image from its first frame again (the same address would show its last frame); the file is already cached
      const url = URL.createObjectURL(await (await fetch(INTRO_SRC)).blob())
      await new Promise<void>((done) => {
        // have the first frame ready before the still logo is taken away, so there is no empty moment
        const probe = new Image()
        probe.src = url
        probe.decode().then(() => done(), () => done())
      })
      if (blob.current) URL.revokeObjectURL(blob.current)
      blob.current = url
      setSrc(url)
      setPhase('playing')
    } catch {
      /* the still logo simply stays */
    }
  }

  return (
    <span role="img" aria-label="logoless" onMouseEnter={replay ? () => void again() : undefined} className="relative block w-fit">
      {/* the still logo sets the size; it is hidden (but keeps its room) while the animation plays, and shown at once if the person wants less motion */}
      <Logo decorative className={cn(className, phase === 'playing' && 'invisible motion-reduce:visible')} />
      {phase === 'playing' && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          ref={img}
          data-logo
          src={src}
          alt=""
          aria-hidden="true"
          width={INTRO_PX.width}
          height={INTRO_PX.height}
          decoding="async"
          fetchPriority="high"
          draggable={false}
          onLoad={() => {
            playedAt.current = Date.now()
            finishIn(INTRO_MS + 150)
          }}
          onError={() => setPhase('done')}
          style={{ position: 'absolute', maxWidth: 'none', pointerEvents: 'none', left: `${INTRO_BOX.left}%`, top: `${INTRO_BOX.top}%`, width: `${INTRO_BOX.width}%`, height: `${INTRO_BOX.height}%` }}
          className="motion-reduce:hidden"
        />
      )}
    </span>
  )
}
