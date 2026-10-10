'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, BookOpen, Banknote, Headphones, Image as ImageIcon, LayoutGrid, ListChecks, Search, Send, SlidersHorizontal } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTransitions } from '@/components/shell/transition-provider'
import { useMotionPrefs, useMounted } from '@/hooks/use-motion-prefs'
import { campaigns } from '@/lib/campaigns'
import { EASE_OUT } from '@/lib/layout'

type Step = {
  target?: string
  title: string
  body: string
  icon: React.ComponentType<{ className?: string }>
  radius?: number
  pad?: number
  fixed?: boolean // target is fixed to the viewport, so the page never needs to scroll for it
  cta?: string // label for the Next button
  go?: string // when set, the Next button closes the tour and navigates here
}

export const HOME_STEPS: Step[] = [
  {
    target: '[data-tour="search"]',
    title: 'Search for campaigns',
    body: 'Type an artist, streamer, song or type of content. The grid narrows as you type.',
    icon: Search,
    radius: 999,
    pad: 12,
  },
  {
    target: '[data-tour="filters"]',
    title: 'Use the filters',
    body: 'Narrow by category or platform, and sort by the highest rate, the closest deadline or the biggest budget.',
    icon: SlidersHorizontal,
    radius: 999,
    pad: 10,
  },
  {
    target: '[data-tour="tile"]',
    title: 'Open any campaign',
    body: 'Every square is a campaign. Let us open one and walk through everything on its page.',
    icon: LayoutGrid,
    radius: 14,
    pad: 12,
    cta: 'Open a campaign',
    go: '__first_campaign__',
  },
]

export const CAMPAIGN_STEPS: Step[] = [
  {
    target: '[data-tour="cc-head"] h1',
    title: 'The campaign at a glance',
    body: 'The name, who it is for and the platforms that count. Everything else lives on this one card.',
    icon: ImageIcon,
    radius: 24,
    pad: 18,
  },
  {
    target: '[data-tour="cc-earn"]',
    title: 'What you earn',
    body: 'Your rate for every 1,000 verified views, the total budget and the deadline.',
    icon: Banknote,
    radius: 24,
    pad: 8,
  },
  {
    target: '[data-tour="cc-preview"]',
    title: 'Hear it first',
    body: 'Play the preview to get a feel for the track before you decide to clip it.',
    icon: Headphones,
    radius: 999,
    pad: 8,
  },
  {
    target: '[data-tour="cc-brief"]',
    title: 'The brief',
    body: 'What the campaign is about and the kind of clip the brand wants to see.',
    icon: BookOpen,
    radius: 24,
    pad: 8,
  },
  {
    target: '[data-tour="cc-rules"]',
    title: 'Do this, not that',
    body: 'Ideas worth clipping, and the off-limits list that gets a clip rejected.',
    icon: ListChecks,
    radius: 24,
    pad: 8,
  },
  {
    target: '[data-tour="cc-submit"]',
    title: 'Submit your clip',
    body: 'Post it on your own account, then paste the link here. Once approved, every verified view earns.',
    icon: Send,
    radius: 24,
    pad: 8,
    cta: 'Done',
  },
]

const firstCampaignId = campaigns[0].id
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b)

export function GuidedTour({
  open,
  onClose,
  steps = HOME_STEPS,
}: {
  open: boolean
  onClose: () => void
  steps?: Step[]
}) {
  const mounted = useMounted()
  if (!mounted) return null
  return createPortal(
    <AnimatePresence>{open && <TourLayer key="tour" steps={steps} onClose={onClose} />}</AnimatePresence>,
    document.body,
  )
}

function TourLayer({ steps, onClose }: { steps: Step[]; onClose: () => void }) {
  const { reduced } = useMotionPrefs()
  const { navigate } = useTransitions()
  const [index, setIndex] = useState(0)
  const step = steps[index]
  const last = index === steps.length - 1

  const veil = useRef<HTMLDivElement>(null)
  const ring = useRef<HTMLDivElement>(null)
  const card = useRef<HTMLDivElement>(null)
  const nextBtn = useRef<HTMLButtonElement>(null)
  const stepRef = useRef(step)
  stepRef.current = step
  const placement = useRef<'below' | 'above' | 'center'>('center')

  // Smoothed values, written straight to the DOM every frame so nothing re-renders mid-glide.
  const view = useRef({ x: 0, y: 0, w: 0, h: 0, r: 0, cx: 0, cy: 0, init: false })
  const scrollAnim = useRef(0)

  // Lock the page while the tour is open. Programmatic scrolling still works.
  useEffect(() => {
    const root = document.documentElement
    const prev = root.style.overflow
    root.style.overflow = 'hidden'
    root.dataset.tour = '1' // pauses the background particles while the tour is open
    return () => {
      root.style.overflow = prev
      delete root.dataset.tour
    }
  }, [])

  // Per-step: decide where the card sits and glide the page so the target ends up comfortably in view.
  useEffect(() => {
    cancelAnimationFrame(scrollAnim.current)
    const vh = window.innerHeight
    const pad = step.pad ?? 8
    const cardH = card.current?.offsetHeight ?? 260
    const el = step.target ? document.querySelector(step.target) : null
    let desired = step.target ? window.scrollY : 0
    let finalTop = vh / 2
    let finalBottom = vh / 2

    if (el) {
      const r = el.getBoundingClientRect()
      if (!step.fixed) {
        const maxScroll = document.documentElement.scrollHeight - vh
        const tall = r.height > vh * 0.6
        desired = clamp(window.scrollY + r.top + (tall ? -120 : r.height / 2 - vh * 0.38), 0, Math.max(0, maxScroll))
      }
      const shift = window.scrollY - desired
      finalTop = r.top + shift - pad
      finalBottom = r.bottom + shift + pad
      const roomBelow = vh - finalBottom
      if (roomBelow >= cardH + 36) placement.current = 'below'
      else if (finalTop >= cardH + 36) placement.current = 'above'
      else if (r.width > window.innerWidth * 0.5) placement.current = roomBelow >= finalTop ? 'below' : 'above' // wide target: take the roomier side
      else placement.current = 'center'
    } else {
      placement.current = 'center'
    }

    const from = window.scrollY
    const delta = desired - from
    if (Math.abs(delta) < 3) return
    if (reduced) {
      window.scrollTo(0, desired)
      return
    }
    const duration = clamp(650 + Math.abs(delta) * 0.35, 750, 1300)
    const t0 = performance.now()
    const tick = (now: number) => {
      const p = clamp((now - t0) / duration, 0, 1)
      window.scrollTo(0, from + delta * ease(p))
      if (p < 1) scrollAnim.current = requestAnimationFrame(tick)
    }
    scrollAnim.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(scrollAnim.current)
  }, [index, step, reduced])

  // One loop moves the spotlight, the ring and the card together toward wherever the current target is.
  useEffect(() => {
    let raf = 0
    let prev = performance.now()
    const v = view.current

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const dt = Math.min(0.05, (now - prev) / 1000)
      prev = now
      const vw = window.innerWidth
      const vh = window.innerHeight
      const s = stepRef.current
      const el = s.target ? document.querySelector(s.target) : null

      let tx = vw / 2
      let ty = vh / 2
      let tw = 0
      let th = 0
      let tr = 0
      if (el) {
        const r = el.getBoundingClientRect()
        const pad = s.pad ?? 8
        tx = r.left - pad
        ty = r.top - pad
        tw = r.width + pad * 2
        th = r.height + pad * 2
        tr = s.radius ?? 8
      }
      if (!v.init) {
        Object.assign(v, { x: vw / 2, y: vh / 2, w: 0, h: 0, r: 0, cx: vw / 2, cy: vh / 2, init: true })
      }

      const a = reduced ? 1 : 1 - Math.exp(-dt * 7.5)
      v.x += (tx - v.x) * a
      v.y += (ty - v.y) * a
      v.w += (tw - v.w) * a
      v.h += (th - v.h) * a
      v.r += (tr - v.r) * a

      const hasHole = v.w > 2 && v.h > 2
      const rr = Math.min(v.r, v.w / 2, v.h / 2)
      if (veil.current) {
        const hole = hasHole
          ? ` M${v.x + rr} ${v.y}H${v.x + v.w - rr}A${rr} ${rr} 0 0 1 ${v.x + v.w} ${v.y + rr}V${v.y + v.h - rr}A${rr} ${rr} 0 0 1 ${v.x + v.w - rr} ${v.y + v.h}H${v.x + rr}A${rr} ${rr} 0 0 1 ${v.x} ${v.y + v.h - rr}V${v.y + rr}A${rr} ${rr} 0 0 1 ${v.x + rr} ${v.y}Z`
          : ''
        veil.current.style.clipPath = `path(evenodd, "M0 0H${vw}V${vh}H0Z${hole}")`
      }
      if (ring.current) {
        const st = ring.current.style
        st.transform = `translate3d(${v.x}px, ${v.y}px, 0)`
        st.width = `${Math.max(v.w, 0)}px`
        st.height = `${Math.max(v.h, 0)}px`
        st.borderRadius = `${rr}px`
        st.opacity = hasHole ? '1' : '0'
      }
      if (card.current) {
        const cw = card.current.offsetWidth
        const ch = card.current.offsetHeight
        const gap = 22
        let wantX = vw / 2 - cw / 2
        let wantY = vh / 2 - ch / 2
        if (el && placement.current !== 'center') {
          wantX = clamp(tx + tw / 2 - cw / 2, 16, vw - cw - 16)
          wantY = placement.current === 'below' ? ty + th + gap : ty - ch - gap
        } else if (el) {
          // no room above or below: sit beside it
          wantX = tx + tw / 2 > vw / 2 ? tx - cw - gap : tx + tw + gap
          wantX = clamp(wantX, 16, vw - cw - 16)
          wantY = clamp(ty + th / 2 - ch / 2, 16, vh - ch - 16)
        }
        wantY = clamp(wantY, 16, Math.max(16, vh - ch - 16))
        const b = reduced ? 1 : 1 - Math.exp(-dt * 6)
        v.cx += (wantX - v.cx) * b
        v.cy += (wantY - v.cy) * b
        card.current.style.transform = `translate3d(${v.cx}px, ${v.cy}px, 0)`
      }
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [reduced])

  useEffect(() => {
    nextBtn.current?.focus({ preventScroll: true })
  }, [index])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (e.key === 'Enter' && document.activeElement?.tagName === 'BUTTON') return
        setIndex((i) => Math.min(i + 1, steps.length - 1))
      } else if (e.key === 'ArrowLeft') setIndex((i) => Math.max(i - 1, 0))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, steps.length])

  const advance = () => {
    if (!last) return setIndex((i) => i + 1)
    onClose()
    if (step.go) {
      // open the same tile that is highlighted, which depends on the current sort and filters
      const shown = document.querySelector('[data-tour="tile"]')?.getAttribute('data-campaign') ?? firstCampaignId
      navigate(step.go === '__first_campaign__' ? `/campaign/${shown}?tour=1` : step.go)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45, ease: EASE_OUT }}
      className="fixed inset-0 z-[60]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-title"
      aria-describedby="tour-body"
    >
      {/* Everything outside the spotlight is blurred and darkened. The hole is cut with a moving clip-path. */}
      <div
        ref={veil}
        aria-hidden="true"
        className="absolute inset-0 bg-black/60 backdrop-blur-[6px]"
      />
      <div
        ref={ring}
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-0 border border-white/50 shadow-[0_0_0_1px_rgb(0_0_0/0.4),0_0_60px_-6px_rgb(255_255_255/0.3),inset_0_0_30px_rgb(255_255_255/0.06)] rounded-2xl"
      />

      <div
        ref={card}
        className="absolute top-0 left-0 w-[min(400px,calc(100vw-32px))] will-change-transform"
        style={{ transform: 'translate3d(-9999px, 0, 0)' }}
      >
        <div className="liquid-glass overflow-hidden rounded-[28px]">
          <div className="p-7 pb-5">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: EASE_OUT }}
                aria-live="polite"
                className="min-h-[150px]"
              >
                <div className="flex items-center justify-between">
                  <span className="grid size-11 place-items-center rounded-full bg-white/12 shadow-[inset_0_1px_0_rgb(255_255_255/0.4)]">
                    <step.icon className="size-5" />
                  </span>
                  <p className="font-mono text-[11px] tracking-widest text-white/60">
                    {index + 1} / {steps.length}
                  </p>
                </div>
                <h2 id="tour-title" className="mt-5 font-display text-[1.7rem] leading-tight">
                  {step.title}
                </h2>
                <p id="tour-body" className="mt-3 text-sm leading-relaxed text-white/70">
                  {step.body}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="flex items-center justify-between gap-3 px-7 pb-6">
            <div className="flex items-center gap-1.5" aria-hidden="true">
              {steps.map((_, i) => (
                <motion.span
                  key={i}
                  initial={false}
                  animate={{ width: i === index ? 20 : 6, opacity: i <= index ? 1 : 0.3 }}
                  transition={{ duration: 0.4, ease: EASE_OUT }}
                  className="h-1.5 rounded-full bg-white"
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Previous step"
                disabled={index === 0}
                onClick={() => setIndex((i) => i - 1)}
                className="grid size-11 place-items-center rounded-full bg-white/12 shadow-[inset_0_1px_0_rgb(255_255_255/0.35)] transition-colors hover:bg-white/20 disabled:opacity-30"
              >
                <ArrowLeft className="size-4" />
              </button>
              <button
                ref={nextBtn}
                type="button"
                onClick={advance}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-6 text-sm font-medium text-black transition-transform hover:scale-[1.03] active:scale-95"
              >
                {step.cta ?? (last ? 'Done' : 'Next')}
                <ArrowRight className="size-4" />
              </button>
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-center gap-4 text-xs text-white/60">
          <button type="button" onClick={onClose} className="rounded-full px-3 py-1 transition-colors hover:text-white">
            Skip tour
          </button>
        </div>
      </div>
    </motion.div>
  )
}
