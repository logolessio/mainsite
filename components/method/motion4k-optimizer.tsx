'use client'

import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Clapperboard,
  Cpu,
  Download,
  Eraser,
  ExternalLink,
  Film,
  FlaskConical,
  Gauge,
  HardDrive,
  Layers,
  Loader2,
  Maximize2,
  MonitorSmartphone,
  PackageCheck,
  ScanLine,
  Settings2,
  ShieldCheck,
  Upload,
  Wand2,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { BrandIcon } from '@/components/brand-icon'
import { AutoHeight } from '@/components/launch/home/waitlist'
import { IntroLogo } from '@/components/logo-intro'
import { RingButton, RingCard } from '@/components/prelaunch/ring'
import { GradientField } from '@/components/shell/gradient-field'
import { cn } from '@/lib/utils'
import { DEFAULT_MULTIPLIER } from './frame-count-patch'
import { canEncodeHevc, EMPTY_LIVE, fpsText, patch, planFor, probeFile, supportProblem, testPack, UNSHARP, type Codec, type Live, type Plan, type Probe, type Result, type StageId } from './engine'

/*
 * Motion4K Optimizer (method.logoless.io): the page. The engine (the passes, the encoder, the file) is in engine.ts. The look is the pre-launch
 * sign-up's (beta.logoless.io): the moving gradient, the intro logo, the rainbow ring panels and buttons.
 */

const EASE = [0.22, 1, 0.36, 1] as const
const MAX_BYTES = 300 * 1_000_000
const ACCEPT = '.mp4,.mov,.m4v,.webm,video/mp4,video/quicktime,video/webm'
const GRAD = 'linear-gradient(90deg, rgb(var(--c-red)), rgb(var(--c-amber)), rgb(var(--c-teal)), rgb(var(--c-blue)))'

const move = {
  initial: { opacity: 0, y: 18, filter: 'blur(8px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -12, filter: 'blur(8px)' },
  transition: { duration: 0.45, ease: EASE },
}

const title = 'font-display text-[clamp(2rem,7.5vw,2.7rem)] leading-[1.04] tracking-[-0.01em] text-paper'
const sub = 'mt-3 text-[15px] leading-relaxed text-paper/55'
const tile = 'rounded-[calc(18px*var(--round,1))] border border-white/10 bg-white/[0.035]'

// ------------------------------------------------------------------------------------------------------------------------------------------------
// How things are shown
// ------------------------------------------------------------------------------------------------------------------------------------------------

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a)
const NAMED: [number, string][] = [
  [1, '1:1 Square'],
  [9 / 16, '9:16 Vertical'],
  [16 / 9, '16:9 Landscape'],
  [4 / 5, '4:5 Portrait'],
  [5 / 4, '5:4'],
  [3 / 4, '3:4 Portrait'],
  [4 / 3, '4:3'],
  [2 / 3, '2:3 Portrait'],
  [3 / 2, '3:2'],
  [21 / 9, '21:9 Ultrawide'],
  [9 / 21, '9:21 Tall'],
]
function aspectOf(w: number, h: number) {
  const r = w / h
  const named = NAMED.find(([v]) => Math.abs(v - r) / v < 0.012)
  if (named) return named[1]
  const g = gcd(w, h)
  const word = r < 0.98 ? 'Vertical' : r > 1.02 ? 'Landscape' : 'Square'
  return w / g <= 32 && h / g <= 32 ? `${w / g}:${h / g} ${word}` : `${r.toFixed(2)}:1 ${word}`
}

const mb = (n: number) => `${(n / 1_000_000).toFixed(1)} MB`
const clock = (s: number) => {
  const m = Math.floor(s / 60)
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`
}
function looksLikeVideo(f: File) {
  return /^video\/(mp4|quicktime|webm|x-m4v)$/i.test(f.type) || /\.(mp4|mov|m4v|webm)$/i.test(f.name)
}

// ------------------------------------------------------------------------------------------------------------------------------------------------
// The page
// ------------------------------------------------------------------------------------------------------------------------------------------------

type Phase = 'pick' | 'reading' | 'inspect' | 'patching' | 'done'

const STEPS: { id: 'pick' | 'inspect' | 'done'; label: string }[] = [
  { id: 'pick', label: 'Upload' },
  { id: 'inspect', label: 'Patch' },
  { id: 'done', label: 'Publish' },
]

/** Three bars, one per step, as on the sign-up: done ones are solid, the one you are on is the rainbow. */
function Progress({ at }: { at: 'pick' | 'inspect' | 'done' }) {
  const i = STEPS.findIndex((s) => s.id === at)
  return (
    <ol className="flex w-full max-w-[300px] gap-2" aria-label="Progress">
      {STEPS.map((s, k) => (
        <li key={s.id} className="flex-1" aria-current={k === i ? 'step' : undefined}>
          <span className="block h-[3px] overflow-hidden rounded-full bg-white/10">
            <motion.span className="block h-full rounded-full" style={{ background: k < i ? 'rgb(255 255 255 / 0.85)' : GRAD }} initial={false} animate={{ width: k <= i ? '100%' : '0%' }} transition={{ duration: 0.6, ease: EASE }} />
          </span>
          <span className={cn('mt-2 block text-center text-[12px] transition-colors duration-300', k === i ? 'text-paper/80' : 'text-paper/30')}>{s.label}</span>
        </li>
      ))}
    </ol>
  )
}

function Warning({ children, onClose }: { children: React.ReactNode; onClose?: () => void }) {
  return (
    <motion.div role="alert" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3, ease: EASE }} className="overflow-hidden">
      <div className="mt-4 flex items-start gap-3 rounded-[calc(18px*var(--round,1))] border border-red-400/25 bg-red-500/[0.07] p-3.5 text-left">
        <AlertTriangle aria-hidden="true" className="mt-0.5 size-[18px] shrink-0 text-red-300" />
        <p className="min-w-0 flex-1 text-[14px] leading-snug text-red-100/90">{children}</p>
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Dismiss" className="-m-1 grid size-7 shrink-0 place-items-center rounded-full text-red-200/60 transition-colors hover:bg-white/10 hover:text-red-100">
            <X aria-hidden="true" className="size-4" />
          </button>
        )}
      </div>
    </motion.div>
  )
}

function Back({ onClick, children = 'Back' }: { onClick: () => void; children?: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="mx-auto mt-5 flex items-center gap-1.5 rounded-full px-3 py-2 text-[13px] text-paper/45 transition-colors hover:text-paper/80">
      <ArrowLeft aria-hidden="true" className="size-3.5" /> {children}
    </button>
  )
}

/** The tool's name, in the pill the sign-up uses for "Founding member". */
function Badge() {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.05] px-3.5 py-1.5 text-[13px] text-paper/80">
      <ShieldCheck aria-hidden="true" className="size-3.5" /> Motion4K Optimizer
    </span>
  )
}

const PLATFORMS = [
  { icon: 'tiktok', label: 'TikTok' },
  { icon: 'instagram', label: 'Reels' },
  { icon: 'youtubeshorts', label: 'Shorts' },
]

// ---- 1: the upload pill ----
function Pick({ onFile, warning, clearWarning, unsupported }: { onFile: (f: File) => void; warning: string; clearWarning: () => void; unsupported: string | null }) {
  const [over, setOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const take = (list: FileList | null) => {
    const f = list?.[0]
    if (f) onFile(f)
  }
  return (
    <motion.div key="pick" {...move}>
      <RingCard on>
        <Badge />
        <h1 className={cn(title, 'mt-5')}>Patch your edit for TikTok.</h1>
        <p className={sub}>Drop a 4K or high frame rate edit. It is downscaled, sharpened against compression and blended to 60fps, right here on your device.</p>
        <button
          type="button"
          disabled={Boolean(unsupported)}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setOver(true)
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setOver(false)
            take(e.dataTransfer.files)
          }}
          className={cn(
            'group relative mt-6 flex w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-[calc(28px*var(--round,1))] border border-dashed px-6 py-10 text-center transition-[border-color,background-color,transform] duration-300 outline-none focus-visible:border-white/40 disabled:pointer-events-none disabled:opacity-50',
            over ? 'scale-[1.01] border-white/45 bg-white/[0.08]' : 'border-white/15 bg-white/[0.035] hover:border-white/30 hover:bg-white/[0.06]',
          )}
        >
          <motion.span
            className="grid size-14 place-items-center rounded-full bg-white/10 text-paper"
            animate={over ? { y: -4, scale: 1.06 } : { y: 0, scale: 1 }}
            transition={{ duration: 0.35, ease: EASE }}
          >
            <Upload aria-hidden="true" className="size-6" />
          </motion.span>
          <span className="text-[16px] font-medium text-paper">{over ? 'Drop it' : 'Drop your video here'}</span>
          <span className="text-[13px] text-paper/45">or click to choose · MP4, MOV or WebM · up to 300 MB</span>
        </button>
        <input ref={inputRef} type="file" accept={ACCEPT} className="hidden" onChange={(e) => (take(e.target.files), (e.target.value = ''))} />
        <AnimatePresence initial={false}>
          {(warning || unsupported) && <Warning onClose={warning ? clearWarning : undefined}>{warning || unsupported}</Warning>}
        </AnimatePresence>
        <ul className="mt-6 space-y-2.5 text-[14px] text-paper/70">
          {['Processed on your device, never uploaded', 'Keeps your shape: square, vertical, 4:5 or landscape', 'Takes up to 4K at 120fps'].map((t) => (
            <li key={t} className="flex items-center gap-2.5">
              <Check aria-hidden="true" className="size-4 shrink-0 text-paper/45" /> {t}
            </li>
          ))}
        </ul>
        <div className="mt-7 flex items-center justify-center gap-5 border-t border-white/[0.07] pt-5 text-[13px] text-paper/45">
          <span>Made for</span>
          {PLATFORMS.map((p) => (
            <span key={p.icon} className="flex items-center gap-1.5">
              <BrandIcon name={p.icon} className="size-4 text-paper/70" /> {p.label}
            </span>
          ))}
        </div>
      </RingCard>
    </motion.div>
  )
}

function Reading({ name }: { name: string }) {
  return (
    <motion.div key="reading" {...move}>
      <RingCard on>
        <div className="flex flex-col items-center py-6 text-center">
          <Loader2 aria-hidden="true" className="size-7 animate-spin text-paper/60" />
          <p className="mt-5 text-[16px] text-paper">Reading your video</p>
          <p className="mt-1 max-w-[30ch] truncate text-[13px] text-paper/45">{name}</p>
        </div>
      </RingCard>
    </motion.div>
  )
}

// ---- 2: the split inspector ----
function Toggle({ on }: { on: boolean }) {
  return (
    <span aria-hidden="true" className={cn('relative mt-1 h-6 w-10 shrink-0 rounded-full transition-colors duration-300', on ? 'bg-paper' : 'bg-white/15')}>
      <motion.span className={cn('absolute top-1 left-1 size-4 rounded-full', on ? 'bg-ink' : 'bg-paper/70')} initial={false} animate={{ x: on ? 16 : 0 }} transition={{ duration: 0.3, ease: EASE }} />
    </span>
  )
}

/** One choice in the inspector: an icon, what it does in a line or two, and a switch. */
function OptionRow({ icon: Icon, name, text, on, onChange, disabled, risky }: { icon: typeof Layers; name: string; text: React.ReactNode; on: boolean; onChange: (v: boolean) => void; disabled?: boolean; risky?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={cn(
        tile,
        'flex w-full items-start gap-3 p-3.5 text-left transition-colors duration-300 disabled:pointer-events-none disabled:opacity-45',
        on ? (risky ? 'border-red-400/30 bg-red-500/[0.07]' : 'border-white/20 bg-white/[0.06]') : 'hover:bg-white/[0.05]',
      )}
    >
      <span className={cn('grid size-10 shrink-0 place-items-center rounded-full', risky ? 'bg-red-500/15' : 'bg-white/10')}>
        <Icon aria-hidden="true" className={cn('size-[18px]', risky ? 'text-red-200' : 'text-paper/85')} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] text-paper">{name}</span>
        <span className="mt-0.5 block text-[12.5px] leading-snug text-paper/50">{text}</span>
      </span>
      <Toggle on={on} />
    </button>
  )
}

type Choices = { interpolate: boolean; cleanup: boolean; codec: Codec; pack: boolean; delivery: boolean }

// ---- 2: the split inspector ----
function Inspector({
  probe,
  plan,
  preview,
  onPatch,
  onReset,
  warning,
  clearWarning,
  choices,
  setChoices,
  hevc,
}: {
  probe: Probe
  plan: Plan
  preview: string
  onPatch: () => void
  onReset: () => void
  warning: string
  clearWarning: () => void
  choices: Choices
  setChoices: (c: Choices) => void
  hevc: boolean
}) {
  const [noPreview, setNoPreview] = useState(false)
  const [advanced, setAdvanced] = useState(choices.delivery)
  const portrait = probe.height > probe.width
  const set = (c: Partial<Choices>) => setChoices({ ...choices, ...c })
  const codecName = choices.pack ? 'test pack' : choices.codec === 'hevc' ? 'HEVC Main' : 'H.264 High 4.2'
  const cards = [
    { icon: Maximize2, label: 'Aspect · resolution', value: `${probe.width} × ${probe.height}`, note: aspectOf(probe.width, probe.height) },
    { icon: Gauge, label: 'Frame rate', value: `${fpsText(probe.fps)} FPS`, note: `${probe.codec} · ${probe.color}${probe.hdr ? ' (HDR)' : ''}` },
    { icon: HardDrive, label: 'File size', value: mb(probe.file.size), note: `${clock(probe.duration)}${probe.audio ? ` · ${probe.audio}` : ' · no audio'}` },
    { icon: MonitorSmartphone, label: 'Target output', value: `${plan.width} × ${plan.height}`, note: `${fpsText(plan.fps)} fps · ${codecName} · Rec.709` },
  ]
  const note = !probe.decodable
    ? `This browser cannot decode ${probe.codec}. Export the edit as H.264 or HEVC, or open this page in Safari.`
    : plan.mode === 'blend'
      ? `${fpsText(probe.fps)}fps is blended into 60fps, so the motion of every frame stays in the video.`
      : plan.mode === 'interp'
        ? `${fpsText(probe.fps)}fps is smoothed to 60fps with in-between frames made from the motion.`
        : probe.fps < 55
          ? `${fpsText(probe.fps)}fps is kept as it is. Turn on Smooth to 60fps for a 60fps upload.`
          : `Already ${fpsText(probe.fps)}fps, so every frame is kept as it is.`
  return (
    <motion.div key="inspect" {...move} className="grid gap-5 md:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] md:items-start">
      <RingCard on className="min-w-0">
        <div className={cn('relative mx-auto overflow-hidden rounded-[calc(20px*var(--round,1))] bg-black', portrait ? 'h-[min(64vh,600px)] max-w-full' : 'w-full')} style={{ aspectRatio: `${probe.width} / ${probe.height}` }}>
          {noPreview ? (
            <div className="absolute inset-0 grid place-items-center p-6 text-center">
              <div>
                <Film aria-hidden="true" className="mx-auto size-7 text-paper/40" />
                <p className="mt-3 text-[13px] leading-relaxed text-paper/50">This browser cannot play a preview of {probe.codec}, but it can still patch it.</p>
              </div>
            </div>
          ) : (
            <video src={preview} autoPlay muted loop playsInline onError={() => setNoPreview(true)} className="absolute inset-0 size-full object-contain" />
          )}
        </div>
        <div className="mt-4 flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white/10">
            <Clapperboard aria-hidden="true" className="size-[18px] text-paper/80" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] text-paper">{probe.file.name}</span>
            <span className="block text-[13px] text-paper/45">Live preview, looping</span>
          </span>
          <button type="button" onClick={onReset} className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-white/15 px-4 text-[14px] text-paper transition-colors hover:bg-white/10">
            Change
          </button>
        </div>
      </RingCard>

      <RingCard className="min-w-0">
        <h1 className={cn(title, 'text-[clamp(1.8rem,5vw,2.3rem)]')}>Your edit</h1>
        <p className={sub}>Read from the file on your device. This is what goes in, and what TikTok will get.</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
          {cards.map((c, i) => (
            <motion.div key={c.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: EASE, delay: 0.08 * i }} className={cn(tile, 'p-4', i === 3 && 'border-white/20 bg-white/[0.06]')}>
              <span className="flex items-center gap-2 text-[12px] whitespace-nowrap text-paper/45">
                <c.icon aria-hidden="true" className="size-3.5 shrink-0" /> {c.label}
              </span>
              <span className="mt-2 block font-display text-[clamp(18px,2.1vw,22px)] leading-tight whitespace-nowrap text-paper tabular-nums">{c.value}</span>
              <span className="mt-1 block text-[12.5px] leading-snug text-paper/50">{c.note}</span>
            </motion.div>
          ))}
        </div>

        <p className="mt-6 mb-3 text-[13px] text-paper/40">How it is made</p>
        <div className="space-y-2.5">
          {probe.fps < 55 && (
            <OptionRow
              icon={Wand2}
              name="Smooth to 60fps"
              text={`Makes real in-between frames from the motion, so a ${fpsText(probe.fps)}fps edit plays at 60fps. Fast cuts and flashes fall back to a soft crossfade.`}
              on={choices.interpolate}
              onChange={(v) => set({ interpolate: v })}
            />
          )}
          <OptionRow icon={Eraser} name="Clean-up before TikTok compresses it" text="A light denoise and deband, so TikTok's encoder spends its data on detail instead of grain and steps in gradients." on={choices.cleanup} onChange={(v) => set({ cleanup: v })} />
          <OptionRow
            icon={FlaskConical}
            name="Test pack"
            text="Three clean versions of this edit (different codecs and bitrates). Post them on a test account and keep whichever TikTok plays best."
            on={choices.pack}
            onChange={(v) => set({ pack: v, delivery: v ? false : choices.delivery })}
          />
          {!choices.pack && (
            <div className={cn(tile, 'flex items-center gap-3 p-3.5')}>
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white/10">
                <Cpu aria-hidden="true" className="size-[18px] text-paper/85" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] text-paper">Codec</span>
                <span className="mt-0.5 block text-[12.5px] leading-snug text-paper/50">{hevc ? 'Both are accepted by TikTok.' : 'This browser cannot encode HEVC.'}</span>
              </span>
              <span className="flex shrink-0 rounded-full border border-white/10 bg-white/[0.04] p-1" role="radiogroup" aria-label="Codec">
                {(['avc', 'hevc'] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    role="radio"
                    aria-checked={choices.codec === c}
                    disabled={c === 'hevc' && !hevc}
                    onClick={() => set({ codec: c, delivery: c === 'hevc' ? false : choices.delivery })}
                    className={cn('h-8 rounded-full px-3.5 text-[13px] transition-colors disabled:opacity-35', choices.codec === c ? 'bg-paper text-ink' : 'text-paper/70 hover:text-paper')}
                  >
                    {c === 'avc' ? 'H.264' : 'HEVC'}
                  </button>
                ))}
              </span>
            </div>
          )}
        </div>

        <button type="button" onClick={() => setAdvanced(!advanced)} aria-expanded={advanced} className="mt-4 flex items-center gap-1.5 text-[13px] text-paper/40 transition-colors hover:text-paper/70">
          <ChevronDown aria-hidden="true" className={cn('size-3.5 transition-transform duration-300', advanced && 'rotate-180')} /> Advanced
        </button>
        <AnimatePresence initial={false}>
          {advanced && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3, ease: EASE }} className="overflow-hidden">
              <div className="pt-3">
                <OptionRow
                  icon={AlertTriangle}
                  risky
                  name="Frame-count patch"
                  text={`Declares ${DEFAULT_MULTIPLIER}× the frames. Not recommended: TikTok has hidden posts made with it from everyone but their owner, even when they are public. H.264 only, not in the test pack.`}
                  on={choices.delivery}
                  disabled={choices.pack || choices.codec === 'hevc'}
                  onChange={(v) => set({ delivery: v })}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence initial={false}>{warning && <Warning onClose={clearWarning}>{warning}</Warning>}</AnimatePresence>
        <div className="mt-6">
          <RingButton onClick={onPatch} disabled={!probe.decodable}>
            {choices.pack ? 'Make the Test Pack' : 'Patch Video for TikTok'} <ArrowRight aria-hidden="true" className="size-[18px]" />
          </RingButton>
        </div>
        <p className="mt-4 text-center text-[12px] leading-relaxed text-paper/35">{note}</p>
      </RingCard>
    </motion.div>
  )
}

// ---- 3: the live processing overlay ----
type Run = { index: number; total: number; label: string; codec: Codec }

function Patching({ probe, plan, live, onCancel, choices, run }: { probe: Probe; plan: Plan; live: Live; onCancel: () => void; choices: Choices; run: Run }) {
  const temporal =
    plan.mode === 'blend'
      ? { detail: `Sub-frame motion blending, ${fpsText(probe.fps)}fps into a native 60fps container`, code: `tmix · ${fpsText(plan.ratio)}:1` }
      : plan.mode === 'interp'
        ? { detail: `Motion-compensated in-between frames, ${fpsText(probe.fps)}fps up to 60fps`, code: 'block match · warp · blend' }
        : { detail: `${fpsText(probe.fps)}fps is kept, frame for frame`, code: 'passthrough' }
  const stages: { id: StageId; icon: typeof Layers; name: string; detail: string; code: string }[] = [
    { id: 'spatial', icon: Maximize2, name: 'Spatial pass', detail: `Aspect-preserving Lanczos-4 downscale, ${probe.width}×${probe.height} to ${plan.width}×${plan.height}`, code: 'lanczos a=4' },
    { id: 'temporal', icon: Layers, name: 'Temporal pass', ...temporal },
    ...(choices.cleanup ? [{ id: 'cleanup' as const, icon: Eraser, name: 'Clean-up pass', detail: 'Edge-preserving denoise and deband, before TikTok compresses it', code: 'bilateral 5×5 · deband' }] : []),
    { id: 'contrast', icon: ScanLine, name: 'Contrast pass', detail: 'Unsharp high-pass mask on luma, then a fine dither to 8 bits', code: UNSHARP },
    {
      id: 'export',
      icon: PackageCheck,
      name: 'Export pass',
      detail: run.codec === 'hevc' ? 'HEVC Main, Rec.709 colour flags, MP4' : 'H.264 High Profile Level 4.2, Rec.709 colour flags, MP4',
      code: run.codec === 'hevc' ? 'hvc1.1.6.L123' : 'avc1.64002A',
    },
    ...(choices.delivery && !choices.pack && run.codec === 'avc'
      ? [{ id: 'delivery' as const, icon: AlertTriangle, name: 'Frame-count patch', detail: `The real frames kept, ${DEFAULT_MULTIPLIER}× declared`, code: `stts · ${DEFAULT_MULTIPLIER}× frames` }]
      : []),
  ]
  const pct = Math.round(((run.index + live.overall) / run.total) * 100)
  return (
    <motion.div key="patching" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }} className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/55 px-4 py-10 backdrop-blur-md">
      <motion.div {...move} className="w-full max-w-[520px]">
        <RingCard on>
          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className={title}>Patching.</h1>
              <p className={cn(sub, 'mt-2')}>{run.total > 1 ? `Version ${run.index + 1} of ${run.total}: ${run.label}.` : 'Keep this tab open. Everything happens on this device.'}</p>
            </div>
            <span className="font-display text-[clamp(2.4rem,9vw,3.4rem)] leading-none text-paper tabular-nums" aria-live="polite">
              {pct}%
            </span>
          </div>
          <div className="mt-6 h-[6px] overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
            <motion.div className="h-full rounded-full" style={{ background: GRAD }} initial={false} animate={{ width: `${Math.max(2, pct)}%` }} transition={{ duration: 0.3, ease: 'linear' }} />
          </div>
          <p className="mt-2.5 flex justify-between text-[12px] text-paper/40 tabular-nums">
            <span>{live.finalizing ? 'Finishing the MP4' : live.speed > 0 ? `${Math.round(live.speed)} frames a second` : 'Starting the passes'}</span>
            <span>{live.finalizing ? '' : live.eta != null ? `about ${clock(live.eta)} left` : ''}</span>
          </p>
          <ol className="mt-6 space-y-2.5">
            {stages.map((s) => {
              const v = live.stages[s.id]
              const done = v >= 0.999
              const active = !done && (v > 0 || s.id === 'spatial')
              return (
                <li key={s.id} className={cn(tile, 'flex items-center gap-3 p-3.5 transition-colors duration-300', active && 'border-white/20 bg-white/[0.06]')}>
                  <span className={cn('grid size-10 shrink-0 place-items-center rounded-full transition-colors duration-300', done ? 'bg-teal-400/15' : 'bg-white/10')}>
                    {done ? <Check aria-hidden="true" className="size-[18px] text-teal-300" /> : <s.icon aria-hidden="true" className={cn('size-[18px]', active ? 'text-paper' : 'text-paper/45')} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="text-[15px] text-paper">{s.name}</span>
                      <span className="text-[12px] text-paper/45 tabular-nums">{Math.round(v * 100)}%</span>
                    </span>
                    <span className="mt-0.5 block text-[12.5px] leading-snug text-paper/45">{s.detail}</span>
                    <code className="mt-1.5 inline-block rounded-md bg-white/[0.06] px-1.5 py-0.5 font-mono text-[11px] text-paper/55">{s.code}</code>
                  </span>
                </li>
              )
            })}
          </ol>
        </RingCard>
        <Back onClick={onCancel}>Stop</Back>
      </motion.div>
    </motion.div>
  )
}

// ---- 4: download and the publishing guide ----
type Made = Result & { label: string }

function save(r: Result) {
  const a = document.createElement('a')
  a.href = r.url
  a.download = r.name
  document.body.appendChild(a)
  a.click()
  a.remove()
}

function Done({ probe, plan, results, onAgain }: { probe: Probe; plan: Plan; results: Made[]; onAgain: () => void }) {
  const pack = results.length > 1
  const first = results[0]
  const guide: { icon: React.ReactNode; text: React.ReactNode }[] = [
    {
      icon: <BrandIcon name="tiktok" className="size-[18px]" />,
      text: (
        <>
          Open{' '}
          <a href="https://www.tiktok.com/tiktokstudio/upload" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-paper underline decoration-white/25 underline-offset-2 hover:decoration-white/60">
            TikTok Studio <ExternalLink aria-hidden="true" className="size-3" />
          </a>{' '}
          (tiktok.com/studio) or TikTok Web on a desktop computer.
        </>
      ),
    },
    { icon: <Upload aria-hidden="true" className="size-[18px]" />, text: pack ? <>Post each version separately, on a test account, with the same caption and sound.</> : <>Select the downloaded file, {first.name}.</> },
    { icon: <Settings2 aria-hidden="true" className="size-[18px]" />, text: <>Make sure “Allow HD uploads” is on before you publish.</> },
    pack
      ? {
          icon: <MonitorSmartphone aria-hidden="true" className="size-[18px]" />,
          text: <>From another account, watch each one on a high refresh phone, or download them and check the resolution and frame rate. Keep the version that comes back sharpest and smoothest, and use it for your edits from now on.</>,
        }
      : {
          icon: (
            <span className="flex items-center gap-1">
              <BrandIcon name="apple" className="size-[15px]" />
              <BrandIcon name="android" className="size-[15px]" />
            </span>
          ),
          text: <>Watch it on a high refresh phone (iPhone ProMotion or a 120Hz Android) for peak sharpness and fluid 60fps playback.</>,
        },
  ]
  const rows = [
    { label: 'Resolution', from: `${probe.width} × ${probe.height}`, to: `${plan.width} × ${plan.height}` },
    { label: 'Frame rate', from: `${fpsText(probe.fps)} fps`, to: `${fpsText(plan.fps)} fps` },
    ...(pack ? [] : [{ label: 'Size', from: mb(probe.file.size), to: mb(first.bytes) }]),
  ]
  const seconds = results.reduce((a, r) => a + r.seconds, 0)
  return (
    <motion.div key="done" {...move} className="space-y-5">
      <RingCard on>
        <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.05] px-3.5 py-1.5 text-[13px] text-paper/80">
          <Check aria-hidden="true" className="size-3.5" /> Patched in {clock(seconds)}
        </span>
        <h1 className={cn(title, 'mt-5')}>{pack ? 'Your test pack.' : 'Ready for TikTok.'}</h1>
        <p className={sub}>
          {pack ? `${results.length} clean versions of the same edit, Rec.709. ` : `${first.encoder}, Rec.709. `}
          {!pack && first.delivery ? `Frame-count patch applied: ${first.delivery.real.toLocaleString('en-GB')} frames declared as ${first.delivery.declared.toLocaleString('en-GB')}. ` : ''}
          {!pack && first.deliveryError ? `The frame-count patch could not be applied (${first.deliveryError}), so the file is the plain patched video. ` : ''}
          {first.audio === 'kept' ? 'The sound is copied as it was.' : first.audio === 'converted' ? 'The sound was converted to AAC.' : first.audio === 'dropped' ? 'This browser could not carry the sound across, so the file is silent.' : 'The edit had no sound.'}
        </p>
        <div className={cn(tile, 'mt-6 divide-y divide-white/[0.07]')}>
          {rows.map((r) => (
            <div key={r.label} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-[14px]">
              <span className="w-full shrink-0 text-[12px] text-paper/45 sm:w-24 sm:text-[14px]">{r.label}</span>
              <span className="flex-1 whitespace-nowrap text-paper/55 tabular-nums">{r.from}</span>
              <ArrowRight aria-hidden="true" className="size-3.5 shrink-0 text-paper/30" />
              <span className="flex-1 whitespace-nowrap text-right text-paper tabular-nums">{r.to}</span>
            </div>
          ))}
        </div>
        {!pack && first.delivery && (
          <p className="mt-4 text-[12.5px] leading-relaxed text-paper/40">
            Played on a computer, the file can show as about {Math.round((first.delivery.declared / first.delivery.real) * probe.duration)} seconds with the last frame held: that is the declared frames, not extra video. TikTok has hidden posts made this way from other viewers.
          </p>
        )}
        {pack ? (
          <ul className="mt-6 space-y-2.5">
            {results.map((r, i) => (
              <li key={r.name} className={cn(tile, 'flex items-center gap-3 p-3.5')}>
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white/10 font-display text-[15px] text-paper">{String.fromCharCode(65 + i)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] text-paper">{r.label}</span>
                  <span className="block truncate text-[12.5px] text-paper/45">
                    {r.encoder} · {mb(r.bytes)}
                  </span>
                </span>
                <button type="button" onClick={() => save(r)} className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-white/15 px-4 text-[14px] text-paper transition-colors hover:bg-white/10">
                  <Download aria-hidden="true" className="size-4" /> Save
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-6">
          <RingButton onClick={() => (pack ? results.forEach((r, i) => window.setTimeout(() => save(r), i * 400)) : save(first))}>
            <Download aria-hidden="true" className="size-[18px]" /> {pack ? 'Download All Three' : 'Download Patched Video'}
          </RingButton>
        </div>
      </RingCard>

      <RingCard>
        <h2 className="font-display text-[clamp(1.5rem,5vw,1.9rem)] leading-tight text-paper">{pack ? 'How to compare' : 'Publishing guide'}</h2>
        <p className={cn(sub, 'mt-2')}>Upload from a computer: the phone app compresses again before it sends.</p>
        <ol className="mt-5 space-y-3">
          {guide.map((g, i) => (
            <motion.li key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: EASE, delay: 0.15 + 0.08 * i }} className={cn(tile, 'flex items-start gap-3 p-3.5')}>
              <span className="relative grid size-10 shrink-0 place-items-center rounded-full bg-white/10 text-paper/85">
                {g.icon}
                <span className="absolute -top-1 -right-1 grid size-[18px] place-items-center rounded-full bg-paper text-[10px] font-semibold text-ink">{i + 1}</span>
              </span>
              <span className="min-w-0 flex-1 pt-2 text-[14px] leading-relaxed text-paper/75">{g.text}</span>
            </motion.li>
          ))}
        </ol>
      </RingCard>
      <Back onClick={onAgain}>Patch another video</Back>
    </motion.div>
  )
}

/**
 * method.logoless.io. One card at a time, as on the pre-launch sign-up: the upload pill, the split inspector, the processing overlay on top of it, then the
 * download (or the test pack) with the guide.
 */
export function Motion4KOptimizer() {
  const [phase, setPhase] = useState<Phase>('pick')
  const [probe, setProbe] = useState<Probe | null>(null)
  const [preview, setPreview] = useState('')
  const [warning, setWarning] = useState('')
  const [live, setLive] = useState<Live>(EMPTY_LIVE)
  const [results, setResults] = useState<Made[]>([])
  const [unsupported, setUnsupported] = useState<string | null>(null)
  const [readingName, setReadingName] = useState('')
  const [hevc, setHevc] = useState(false)
  const [choices, setChoices] = useState<Choices>({ interpolate: true, cleanup: true, codec: 'avc', pack: false, delivery: false })
  const [run, setRun] = useState<Run>({ index: 0, total: 1, label: '', codec: 'avc' })
  const abort = useRef<AbortController | null>(null)
  const plan = probe ? planFor(probe, choices.interpolate) : null

  useEffect(() => {
    setUnsupported(supportProblem())
    void canEncodeHevc().then(setHevc)
  }, [])

  // the preview and the results are object URLs: let them go when they are replaced
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview])
  useEffect(() => () => results.forEach((r) => URL.revokeObjectURL(r.url)), [results])

  // a page that is closed mid-run loses the work: ask first, and keep the screen awake while it runs
  useEffect(() => {
    if (phase !== 'patching') return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    let lock: { release: () => Promise<void> } | null = null
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }
    nav.wakeLock
      ?.request('screen')
      .then((l) => (lock = l))
      .catch(() => undefined)
    return () => {
      window.removeEventListener('beforeunload', warn)
      void lock?.release().catch(() => undefined)
    }
  }, [phase])

  const reset = useCallback(() => {
    abort.current?.abort()
    setProbe(null)
    setPreview('')
    setResults([])
    setWarning('')
    setLive(EMPTY_LIVE)
    setPhase('pick')
  }, [])

  const onFile = async (f: File) => {
    setWarning('')
    if (!looksLikeVideo(f)) return setWarning(`${f.name} is not a video this can read. Choose an MP4, MOV or WebM file.`)
    if (f.size > MAX_BYTES) return setWarning(`This file is ${mb(f.size)}. The limit is 300 MB: trim the edit or export a shorter part, then try again.`)
    setReadingName(f.name)
    setPhase('reading')
    try {
      const p = await probeFile(f)
      setProbe(p)
      setPreview(URL.createObjectURL(f))
      setPhase('inspect')
    } catch (e) {
      setPhase('pick')
      setWarning(e instanceof Error && e.message ? `We could not read that file: ${e.message}` : 'We could not read that file. Try exporting it again as MP4.')
    }
  }

  const start = async () => {
    if (!probe || !plan) return
    setWarning('')
    setLive(EMPTY_LIVE)
    setPhase('patching')
    const ctl = new AbortController()
    abort.current = ctl
    const jobs = choices.pack
      ? testPack(plan, hevc).map((v) => ({ ...v, delivery: false }))
      : [{ tag: '', label: choices.codec === 'hevc' ? 'HEVC' : 'H.264', codec: choices.codec, bitrate: undefined as number | undefined, delivery: choices.delivery }]
    const made: Made[] = []
    try {
      for (const [index, job] of jobs.entries()) {
        setRun({ index, total: jobs.length, label: job.label, codec: job.codec })
        setLive(EMPTY_LIVE)
        const r = await patch(probe, plan, { interpolate: choices.interpolate, cleanup: choices.cleanup, codec: job.codec, bitrate: job.bitrate, deliveryPatch: job.delivery }, setLive, ctl.signal, job.tag)
        made.push({ ...r, label: job.label })
        if (ctl.signal.aborted) break
      }
      if (ctl.signal.aborted) return made.forEach((r) => URL.revokeObjectURL(r.url))
      setResults(made)
      setPhase('done')
    } catch (e) {
      made.forEach((r) => URL.revokeObjectURL(r.url))
      setPhase('inspect')
      if (ctl.signal.aborted || (e instanceof DOMException && e.name === 'AbortError')) return
      setWarning(e instanceof Error && e.message ? e.message : 'Something went wrong while patching. Please try again.')
    } finally {
      if (abort.current === ctl) abort.current = null
    }
  }

  const cancel = () => {
    abort.current?.abort()
    setPhase('inspect')
  }

  const step = phase === 'done' ? 'done' : phase === 'inspect' || phase === 'patching' ? 'inspect' : 'pick'
  const wide = phase === 'inspect' || phase === 'patching'

  return (
    <MotionConfig reducedMotion="user">
      <main className="relative isolate min-h-dvh overflow-x-clip px-4 pt-[max(2.5rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
        <GradientField />
        <div className={cn('relative z-10 mx-auto flex min-h-[calc(100dvh-4.5rem)] w-full flex-col justify-center transition-[max-width] duration-500', wide ? 'max-w-[980px]' : 'max-w-[440px]')}>
          <header className="mb-8 flex flex-col items-center gap-7">
            <IntroLogo replay className="h-[clamp(34px,8vw,48px)]" />
            <div className="h-[30px]">{step !== 'pick' && <Progress at={step} />}</div>
          </header>
          <AutoHeight margin={72}>
            <AnimatePresence mode="wait" initial={false}>
              {phase === 'pick' ? (
                <Pick onFile={(f) => void onFile(f)} warning={warning} clearWarning={() => setWarning('')} unsupported={unsupported} />
              ) : phase === 'reading' ? (
                <Reading name={readingName} />
              ) : (phase === 'inspect' || phase === 'patching') && probe && plan ? (
                <Inspector probe={probe} plan={plan} preview={preview} onPatch={() => void start()} onReset={reset} warning={warning} clearWarning={() => setWarning('')} choices={choices} setChoices={setChoices} hevc={hevc} />
              ) : phase === 'done' && probe && plan && results.length ? (
                <Done probe={probe} plan={plan} results={results} onAgain={reset} />
              ) : null}
            </AnimatePresence>
          </AutoHeight>
          <footer className="mt-8 text-center text-[12px] leading-relaxed text-paper/30">
            Runs entirely in your browser: your video never leaves this device.{' '}
            <a href="https://logoless.io/legal/terms" target="_blank" rel="noopener noreferrer" className="underline decoration-white/20 underline-offset-2 hover:text-paper/60">
              Terms
            </a>{' '}
            and{' '}
            <a href="https://logoless.io/legal/privacy" target="_blank" rel="noopener noreferrer" className="underline decoration-white/20 underline-offset-2 hover:text-paper/60">
              Privacy Policy
            </a>
            .
          </footer>
        </div>
        <AnimatePresence>{phase === 'patching' && probe && plan && <Patching probe={probe} plan={plan} live={live} onCancel={cancel} choices={choices} run={run} />}</AnimatePresence>
      </main>
    </MotionConfig>
  )
}
