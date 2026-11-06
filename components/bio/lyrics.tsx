'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { type CSSProperties, type RefObject, useEffect, useRef, useState } from 'react'
import type { BioConfig, LyricLine } from '@/lib/bio'
import { lineAt } from '@/lib/lyrics'
import { cn } from '@/lib/utils'
import { fontClass } from './bits'

const EASE = [0.2, 0.8, 0.2, 1] as const

/** How long a line is sung: until the next line, but never more than a few seconds (an instrumental gap is not part of the line). */
const lineSpan = (lines: LyricLine[], i: number) => {
  const words = Math.max(1, lines[i].x.split(/\s+/).length)
  const next = lines[i + 1]?.t ?? lines[i].t + 4000
  return Math.max(400, Math.min(next - lines[i].t, 1800 + words * 420))
}

/**
 * The page's lyrics, in time with the song. It reads the song's own clock (so it stays right when the song is slowed down or sped up) and the owner's
 * offset. The words light up as they are sung: a wipe drawn by a CSS variable that is set every frame without re-rendering. In the editor's preview,
 * before the song is playing, it steps through the first lines by itself so the owner can see the style.
 */
export function LyricsView({ cfg, audio, playing, demo, font, reduced }: { cfg: BioConfig['lyrics']; audio: RefObject<HTMLAudioElement | null>; playing: boolean; demo: boolean; font: string; reduced: boolean }) {
  const lines = cfg.lines
  const [idx, setIdx] = useState(-1)
  const [shown, setShown] = useState(0)
  const box = useRef<HTMLDivElement>(null)
  const cfgRef = useRef(cfg)
  cfgRef.current = cfg
  const live = useRef({ playing, demo })
  live.current = { playing, demo }

  useEffect(() => {
    let raf = 0
    const t0 = performance.now()
    let lastIdx = -2
    let lastShown = -1
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const c = cfgRef.current
      const L = c.lines
      if (!L.length) return
      let ms: number
      const e = audio.current
      if (live.current.playing && e) ms = (e.currentTime + c.offset) * 1000
      else if (live.current.demo) {
        // the preview: a made-up clock that walks the first dozen lines, a line every 2.6 s
        const n = Math.min(12, L.length)
        const step = ((now - t0) / 2600) % n
        const i = Math.floor(step)
        ms = L[i].t + (step - i) * lineSpan(L, i)
      } else ms = e ? (e.currentTime + c.offset) * 1000 : -1
      const i = lineAt(L, ms)
      if (i !== lastIdx) {
        lastIdx = i
        setIdx(i)
      }
      const p = i >= 0 ? Math.min(1, Math.max(0, (ms - L[i].t) / lineSpan(L, i))) : 0
      box.current?.style.setProperty('--lp', String(p))
      if (c.style === 'kinetic' && i >= 0) {
        const words = L[i].x.split(/\s+/).length
        const n = Math.min(words, Math.ceil(p * words * 1.15 + 0.01))
        if (n !== lastShown) {
          lastShown = n
          setShown(n)
        }
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [audio])

  if (!lines.length) return null
  const k = cfg.size / 100
  const place = cfg.place === 'top' ? 'top-[9%]' : cfg.place === 'centre' ? 'top-1/2 -translate-y-1/2' : 'bottom-[13%]'
  const dim = cfg.dim / 100
  const shade =
    cfg.place === 'centre'
      ? `radial-gradient(70% 45% at 50% 50%, color-mix(in srgb, var(--bio-bg) ${dim * 100}%, transparent), transparent)`
      : `linear-gradient(${cfg.place === 'top' ? '180deg' : '0deg'}, color-mix(in srgb, var(--bio-bg) ${dim * 100}%, transparent) 10%, transparent 75%)`
  const cur = idx >= 0 ? lines[idx] : null
  const style = { '--lp': 0, fontSize: `calc(${k} * clamp(1.15rem, 3.4cqmin, 2.6rem))` } as CSSProperties

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[25] [container-type:size]">
      {dim > 0 && <div className={cn('absolute inset-x-0', cfg.place === 'top' ? 'top-0 h-[42%]' : cfg.place === 'centre' ? 'inset-y-0' : 'bottom-0 h-[42%]')} style={{ background: shade }} />}
      <div ref={box} className={cn('absolute inset-x-0 mx-auto w-full max-w-[min(56rem,92cqw)] px-6 text-center', place, fontClass(font))} style={style}>
        {cfg.style === 'flow' && <Flow lines={lines} idx={idx} reduced={reduced} />}
        {cfg.style === 'focus' && (
          <AnimatePresence mode="wait">
            <motion.p key={idx} className="ly-line text-[1.45em] leading-[1.1] font-semibold tracking-[-0.02em]">
              {(cur?.x || '♪').split(/\s+/).map((w, i) => (
                <motion.span key={i} className="inline-block pr-[0.28em]" initial={reduced ? false : { opacity: 0, filter: 'blur(10px)', y: 12 }} animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }} exit={{ opacity: 0, filter: 'blur(6px)', transition: { duration: 0.18 } }} transition={{ duration: 0.5, delay: i * 0.05, ease: EASE }}>
                  {w}
                </motion.span>
              ))}
            </motion.p>
          </AnimatePresence>
        )}
        {cfg.style === 'subtitle' && (
          <AnimatePresence mode="wait">
            {cur && cur.x && (
              <motion.p key={idx} initial={reduced ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="mx-auto inline-block rounded-[0.4em] bg-[color-mix(in_srgb,var(--bio-bg)_70%,transparent)] px-[0.6em] py-[0.25em] text-[0.62em] leading-snug font-medium backdrop-blur-md">
                {cur.x}
              </motion.p>
            )}
          </AnimatePresence>
        )}
        {cfg.style === 'kinetic' && (
          <p key={idx} className="text-[1.7em] leading-[0.98] font-extrabold tracking-[-0.03em] uppercase">
            {(cur?.x || '♪').split(/\s+/).map((w, i) => (
              <motion.span key={i} className="inline-block pr-[0.24em]" initial={false} animate={i < shown || !cur?.x ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 1.5, y: -6 }} transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 22 }}>
                {w}
              </motion.span>
            ))}
          </p>
        )}
      </div>
    </div>
  )
}

/** Lines that scroll past: two sung, the one being sung (lit as it goes), two to come. */
function Flow({ lines, idx, reduced }: { lines: LyricLine[]; idx: number; reduced: boolean }) {
  const from = Math.max(0, idx - 1)
  const view = lines.slice(from, Math.max(idx, 0) + 3).map((l, j) => ({ l, i: from + j }))
  return (
    <div className="flex flex-col items-center gap-[0.35em]">
      <AnimatePresence initial={false} mode="popLayout">
        {view.map(({ l, i }) => {
          const now = i === idx
          const d = Math.abs(i - idx)
          return (
            <motion.p
              key={`${i}-${l.t}`}
              layout={reduced ? false : 'position'}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: now ? 1 : d === 1 ? 0.42 : 0.2, y: 0, scale: now ? 1 : 0.86, filter: now || reduced ? 'blur(0px)' : `blur(${Math.min(2, d)}px)` }}
              exit={{ opacity: 0, y: -24 }}
              transition={{ duration: reduced ? 0 : 0.5, ease: EASE }}
              className={cn('leading-[1.15] font-semibold tracking-[-0.02em]', now && 'ly-wipe')}
            >
              {l.x || '♪'}
            </motion.p>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
