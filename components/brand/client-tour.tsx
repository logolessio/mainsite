'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Compass, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useFeature } from '@/components/shell/features-provider'
import { useTransitions } from '@/components/shell/transition-provider'
import { useDialog } from '@/hooks/use-dialog'
import { useMotionPrefs, useMounted } from '@/hooks/use-motion-prefs'
import { EASE_OUT } from '@/lib/layout'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { STEPS, type StepId, TOUR } from './tour-steps'

/*
 * The client walkthrough. It dims the page, cuts a soft hole around the real part it talks about, and puts a small card next to it.
 * Every brand page renders one <ClientTour />: the run in progress lives in sessionStorage, so when a stop is on another page we
 * go there and that page's tour picks up where this one left off.
 */

const RUN = 'logoless:client-tour'
const SEEN = 'logoless:client-tour-seen'
const START = 'logoless:tour'

type Run = { seq: StepId[]; i: number }
type Box = { x: number; y: number; w: number; h: number }

const readRun = (): Run | null => {
  try {
    const r = JSON.parse(window.sessionStorage.getItem(RUN) ?? 'null') as Run | null
    return r && Array.isArray(r.seq) && r.seq.every((s) => s in STEPS) && Number.isInteger(r.i) && r.seq[r.i] ? r : null
  } catch {
    return null
  }
}
const writeRun = (r: Run | null) => {
  try {
    if (r) window.sessionStorage.setItem(RUN, JSON.stringify(r))
    else window.sessionStorage.removeItem(RUN)
  } catch {
    /* private window: the tour still works on this page */
  }
}

/** True while a walkthrough (or a single "show me") is under way in this tab, so other guides wait their turn. */
export const tourRunning = () => typeof window !== 'undefined' && readRun() !== null

/** Saves "seen" on the server (every device) and in this browser (in case the server cannot be reached). */
export function rememberSeen(key: 'tour' | 'first-submission') {
  try {
    window.localStorage.setItem(key === 'tour' ? SEEN : 'logoless:first-sub-seen', '1')
  } catch {
    /* fine */
  }
  fetch('/api/me/guide', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ key }) }).catch(() => {})
}
const seenHere = (key: string) => {
  try {
    return window.localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}
export const firstSubSeenHere = () => seenHere('logoless:first-sub-seen')

/** Starts the whole walkthrough, or a single stop ("show me where that is"). Works from anywhere on a brand page. */
export function startTour(seq?: StepId[]) {
  window.dispatchEvent(new CustomEvent<{ seq?: StepId[] }>(START, { detail: { seq } }))
}

/** The small "Take the tour" button on the overview. */
export function TourButton() {
  const on = useFeature('client-tour')
  if (!on) return null
  return (
    <button
      type="button"
      data-tour="tour-button"
      onClick={() => startTour()}
      className="inline-flex h-10 items-center gap-2 rounded-pill border border-line-strong px-4 text-sm text-paper/80 transition-colors hover:bg-paper/10 hover:text-paper"
    >
      <Compass aria-hidden="true" className="size-4" /> Take the tour
    </button>
  )
}

/**
 * `auto`: "first" starts the walkthrough unless this browser already saw it (the server has checked too),
 * "force" starts it whatever happened before (the page was opened with ?tour=1).
 */
export function ClientTour({ auto }: { auto?: 'first' | 'force' }) {
  const on = useFeature('client-tour')
  const pathname = usePathname()
  const { navigate } = useTransitions()
  const [run, setRun] = useState<Run | null>(null)

  const go = useCallback(
    (next: Run | null) => {
      writeRun(next)
      if (!next) return setRun(null)
      const page = STEPS[next.seq[next.i]].page
      if (page === pathname) return setRun(next)
      // the next stop is on another page: that page's tour takes over when it arrives
      setRun(null)
      navigate(page)
    },
    [pathname, navigate],
  )

  // pick up a run that came from another page, or start on our own
  useEffect(() => {
    if (!on) return
    const r = readRun()
    if (r) {
      if (STEPS[r.seq[r.i]].page === pathname) setRun(r)
      else writeRun(null) // they left the tour by going somewhere else
      return
    }
    if (!auto || (auto === 'first' && seenHere(SEEN))) return
    rememberSeen('tour')
    if (auto === 'force') window.history.replaceState(null, '', pathname)
    go({ seq: TOUR, i: 0 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on])

  useEffect(() => {
    if (!on) return
    const start = (e: Event) => {
      const seq = (e as CustomEvent<{ seq?: StepId[] }>).detail?.seq
      if (!seq) rememberSeen('tour')
      go({ seq: seq?.length ? seq : TOUR, i: 0 })
    }
    window.addEventListener(START, start)
    return () => window.removeEventListener(START, start)
  }, [on, go])

  const mounted = useMounted()
  if (!on || !mounted) return null
  const close = (finished: boolean) => {
    const whole = run && run.seq.length > 1
    go(null)
    if (whole) toast(finished ? { text: 'That is everything. Replay the tour any time from the overview.', tone: 'ok' } : { text: 'Tour closed. Take it again any time from the overview.' })
  }
  return createPortal(
    <AnimatePresence>
      {run && (
        <Coach
          key="coach"
          run={run}
          onMove={(i) => go({ ...run, i })}
          onClose={close}
        />
      )}
    </AnimatePresence>,
    document.body,
  )
}

const PAD = 8
const TOP_SAFE = 88 // under the sticky top bar
const GAP = 14
const EDGE = 16

function findTarget(targets: string[]) {
  for (const sel of targets) {
    for (const el of Array.from(document.querySelectorAll<HTMLElement>(sel))) {
      const r = el.getBoundingClientRect()
      if (r.width > 4 && r.height > 4) return el
    }
  }
  return null
}

function boxOf(el: HTMLElement): Box {
  const r = el.getBoundingClientRect()
  return { x: r.left - PAD, y: r.top - PAD, w: r.width + PAD * 2, h: r.height + PAD * 2 }
}

const same = (a: Box | null, b: Box | null) => (!a || !b ? a === b : Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) < 0.5 && Math.abs(a.w - b.w) < 0.5 && Math.abs(a.h - b.h) < 0.5)

/** The dimmed page with its spotlight, and the card that talks about it. */
function Coach({ run, onMove, onClose }: { run: Run; onMove: (i: number) => void; onClose: (finished: boolean) => void }) {
  const { reduced } = useMotionPrefs()
  const id = run.seq[run.i]
  const step = STEPS[id]
  const total = run.seq.length
  const last = run.i === total - 1
  const single = total === 1
  const titleId = useId()
  const bodyId = useId()
  const maskId = `tour-mask-${useId().replace(/:/g, '')}`

  const [box, setBox] = useState<Box | null>(null)
  const [shown, setShown] = useState(false)
  const [glide, setGlide] = useState(false)
  const [view, setView] = useState({ w: 0, h: 0 })
  const [cardH, setCardH] = useState(220)
  const card = useDialog<HTMLDivElement>(true, () => onClose(false), { initial: 'none' })
  const nextBtn = useRef<HTMLButtonElement>(null)
  const docked = view.w > 0 && view.w < 640

  useLayoutEffect(() => {
    const size = () => setView({ w: window.innerWidth, h: window.innerHeight })
    size()
    window.addEventListener('resize', size)
    return () => window.removeEventListener('resize', size)
  }, [])

  // find the part of the page, bring it into view, wait for the page to settle, then light it up and keep the light on it
  useEffect(() => {
    let live = true
    let frame = 0
    let poll = 0
    setShown(false)
    const began = performance.now()
    const dockedNow = window.innerWidth < 640

    const track = (el: HTMLElement) => {
      let prev: Box | null = null
      const tick = () => {
        if (!live) return
        const b = el.isConnected ? boxOf(el) : null
        if (!same(b, prev)) setBox(b)
        prev = b
        frame = requestAnimationFrame(tick)
      }
      tick()
    }

    const reveal = (el: HTMLElement | null) => {
      setGlide(!reduced)
      if (el) track(el)
      else setBox(null)
      setShown(true)
      window.setTimeout(() => live && setGlide(false), 520)
    }

    const settle = (el: HTMLElement) => {
      let prev = boxOf(el)
      let still = 0
      const t0 = performance.now()
      const tick = () => {
        if (!live) return
        const b = boxOf(el)
        still = same(b, prev) ? still + 1 : 0
        prev = b
        if (still >= 4 || performance.now() - t0 > 1000) return reveal(el)
        frame = requestAnimationFrame(tick)
      }
      frame = requestAnimationFrame(tick)
    }

    const bring = (el: HTMLElement) => {
      if ('pinned' in step && step.pinned) return
      const r = el.getBoundingClientRect()
      const bottom = window.innerHeight - (dockedNow ? cardH + 32 : EDGE)
      if (r.top >= TOP_SAFE && r.bottom <= bottom) return
      const room = bottom - TOP_SAFE
      const offset = r.height + PAD * 2 >= room ? TOP_SAFE + PAD : TOP_SAFE + (room - r.height) / 2
      window.scrollTo({ top: Math.max(0, window.scrollY + r.top - offset), behavior: reduced ? 'auto' : 'smooth' })
    }

    const look = () => {
      if (!live) return
      const el = findTarget(step.targets)
      if (el) {
        bring(el)
        return settle(el)
      }
      // the page may still be arriving; after a while, show the card on its own in the middle
      if (performance.now() - began > 2500) return reveal(null)
      poll = window.setTimeout(look, 120)
    }
    look()

    return () => {
      live = false
      cancelAnimationFrame(frame)
      window.clearTimeout(poll)
    }
    // cardH is only a first guess for the scroll; re-running on it would restart the step
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, reduced])

  // focus the main button whenever a stop is shown, so Enter keeps going
  useEffect(() => {
    if (shown) nextBtn.current?.focus({ preventScroll: true })
  }, [shown, id])

  // keep the card's real height, so it is placed without overlapping the spotlight
  useLayoutEffect(() => {
    const el = card.current
    if (!el) return
    const ro = new ResizeObserver(() => setCardH(el.offsetHeight))
    ro.observe(el)
    return () => ro.disconnect()
  }, [card])

  const back = useCallback(() => run.i > 0 && onMove(run.i - 1), [run.i, onMove])
  const next = useCallback(() => (last ? onClose(true) : onMove(run.i + 1)), [last, onClose, onMove, run.i])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'ArrowRight') (e.preventDefault(), e.stopPropagation(), next())
      else if (e.key === 'ArrowLeft') (e.preventDefault(), e.stopPropagation(), back())
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [next, back])

  // where the card goes: under the spotlight, else above it, else beside it, else in the middle. On a phone it sits at the bottom.
  const cardW = Math.min(360, Math.max(0, view.w - EDGE * 2))
  let pos: { left: number; top: number } | null = null
  if (!docked && view.w) {
    if (!box) pos = { left: (view.w - cardW) / 2, top: Math.max(EDGE, (view.h - cardH) / 2) }
    else {
      const clampX = (x: number) => Math.min(Math.max(EDGE, x), view.w - cardW - EDGE)
      const clampY = (y: number) => Math.min(Math.max(TOP_SAFE - 16, y), view.h - cardH - EDGE)
      const below = box.y + box.h + GAP
      const above = box.y - GAP - cardH
      const right = box.x + box.w + GAP
      const left = box.x - GAP - cardW
      if (below + cardH <= view.h - EDGE) pos = { left: clampX(box.x), top: below }
      else if (above >= EDGE) pos = { left: clampX(box.x), top: above }
      else if (right + cardW <= view.w - EDGE) pos = { left: right, top: clampY(box.y) }
      else if (left >= EDGE) pos = { left, top: clampY(box.y) }
      else pos = { left: clampX(box.x + box.w / 2 - cardW / 2), top: view.h - cardH - EDGE }
    }
  }

  const hole = box && view.w ? box : { x: view.w / 2, y: view.h / 2, w: 0, h: 0 }
  const move = glide ? { duration: 0.48, ease: EASE_OUT } : { duration: 0 }

  return (
    <motion.div className="fixed inset-0 z-[130]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : 0.25 }}>
      {/* the dim, with a rounded hole over the part we are talking about. Clicks on the dim do nothing; the card has the controls. */}
      <svg aria-hidden="true" className="absolute inset-0 size-full" width={view.w} height={view.h}>
        <defs>
          <mask id={maskId}>
            <rect width="100%" height="100%" fill="white" />
            <motion.rect initial={false} animate={{ x: hole.x, y: hole.y, width: hole.w, height: hole.h }} transition={move} rx={18} fill="black" />
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgb(0 0 0 / 0.74)" mask={`url(#${maskId})`} />
        {box && <motion.rect initial={false} animate={{ x: hole.x, y: hole.y, width: hole.w, height: hole.h, opacity: shown ? 1 : 0 }} transition={move} rx={18} fill="none" stroke="color-mix(in srgb, var(--paper) 55%, transparent)" strokeWidth={1.5} />}
      </svg>

      <motion.div
        ref={card}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        initial={false}
        animate={{ opacity: shown ? 1 : 0, y: shown || reduced ? 0 : 10 }}
        transition={{ duration: reduced ? 0 : 0.3, ease: EASE_OUT }}
        style={docked ? undefined : { left: pos?.left ?? EDGE, top: pos?.top ?? EDGE, width: cardW }}
        className={cn(
          'absolute rounded-card border border-white/12 bg-gradient-to-b from-[#17171b] to-[#0b0b0d] p-5 shadow-[0_30px_80px_-20px_rgb(0_0_0/0.9)]',
          docked && 'inset-x-3 bottom-[max(12px,env(safe-area-inset-bottom))]',
          !shown && 'pointer-events-none',
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs text-mute tabular-nums" aria-live="polite">
            {single ? 'Here it is' : `${run.i + 1} of ${total}`}
          </p>
          <button type="button" onClick={() => onClose(false)} aria-label={single ? 'Close' : 'Skip the tour'} className="-mt-1.5 -mr-1.5 grid size-8 place-items-center rounded-pill text-mute transition-colors hover:bg-white/10 hover:text-paper">
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>
        <h2 id={titleId} className="mt-1 font-display text-2xl leading-tight tracking-[-0.02em]">
          {step.title}
        </h2>
        <p id={bodyId} className="mt-2 text-[15px] leading-relaxed text-paper/70">
          {step.body}
        </p>
        {'links' in step && step.links && (
          <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {step.links.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => onClose(true)} className="underline underline-offset-4 hover:text-paper">
                {l.label}
              </Link>
            ))}
          </p>
        )}

        <div className="mt-5 flex items-center justify-between gap-3">
          {single ? (
            <span />
          ) : (
            <span className="flex items-center gap-1.5" aria-hidden="true">
              {run.seq.map((s, n) => (
                <span key={s} className={cn('h-1.5 rounded-pill transition-all duration-300', n === run.i ? 'w-5 bg-paper' : n < run.i ? 'w-1.5 bg-paper/50' : 'w-1.5 bg-paper/20')} />
              ))}
            </span>
          )}
          <span className="flex items-center gap-2">
            {!single && run.i > 0 && (
              <button type="button" onClick={back} className="inline-flex h-10 items-center gap-1.5 rounded-pill px-3 text-sm text-mute transition-colors hover:bg-white/[0.07] hover:text-paper">
                <ArrowLeft aria-hidden="true" className="size-4" /> Back
              </button>
            )}
            <button ref={nextBtn} type="button" onClick={next} className="inline-flex h-10 items-center gap-1.5 rounded-pill bg-paper px-5 text-sm font-medium text-ink transition-colors hover:bg-paper/85">
              {single ? 'Got it' : last ? 'Done' : 'Next'}
              {!single && !last && <ArrowRight aria-hidden="true" className="size-4" />}
            </button>
          </span>
        </div>
        {!single && run.i === 0 && <p className="mt-4 hidden text-xs text-mute sm:block">Use the arrow keys to move, Esc to leave.</p>}
      </motion.div>
    </motion.div>
  )
}
