'use client'

import { Check, Loader2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { ROUND_DEFAULT, ROUND_MAX, ROUND_MIN, ROUND_PRESETS, parseRoundness, roundnessVars } from '@/lib/roundness'
import { cn } from '@/lib/utils'

type Save = 'idle' | 'saving' | 'saved' | 'error'

/** Put a roundness on the page being looked at right now, so every sample (and the rest of the page) follows the slider as it moves. */
function paint(value: number) {
  const root = document.documentElement.style
  root.removeProperty('--round')
  root.removeProperty('--pill')
  for (const [k, v] of Object.entries(roundnessVars(value))) root.setProperty(k, v)
}

/**
 * How round the whole site is. Dragging changes this page at once (so the samples and the sidebar show it), and the choice is
 * saved for everyone a moment after the slider stops.
 */
export function Roundness({ initial }: { initial: number }) {
  const [value, setValue] = useState(parseRoundness(initial))
  const [state, setState] = useState<Save>('idle')
  const [error, setError] = useState('')
  const saved = useRef(parseRoundness(initial))
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latest = useRef(value)
  latest.current = value

  // leaving the page while a change is still waiting to be saved saves it, so what was seen is what is kept
  useEffect(
    () => () => {
      if (!timer.current) return
      clearTimeout(timer.current)
      if (latest.current !== saved.current) {
        void fetch('/api/dev/settings', { method: 'POST', keepalive: true, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ key: 'design_roundness', value: String(latest.current) }) })
      }
    },
    [],
  )

  const save = async (v: number) => {
    setState('saving')
    setError('')
    const res = await fetch('/api/dev/settings', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ key: 'design_roundness', value: String(v) }) }).catch(() => null)
    if (!res?.ok) {
      paint(saved.current)
      setValue(saved.current)
      setState('error')
      return setError(((await res?.json().catch(() => ({}))) as { error?: string })?.error ?? 'Could not save that. The site was left as it was.')
    }
    saved.current = v
    setState('saved')
  }

  const set = (next: number, now = false) => {
    const v = parseRoundness(next)
    setValue(v)
    paint(v)
    setState('idle')
    if (timer.current) clearTimeout(timer.current)
    if (v === saved.current) return
    if (now) void save(v)
    else timer.current = setTimeout(() => void save(v), 700)
  }

  const label = ROUND_PRESETS.find((p) => p.value === value)?.label ?? (value < ROUND_DEFAULT ? 'Custom' : 'Rounder than standard')

  return (
    <section aria-label="Roundness" className="overflow-hidden rounded-[calc(2rem*var(--round,1))] border border-line-strong bg-white/[0.03]">
      <div className="grid gap-8 p-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:p-9">
        <div className="min-w-0">
          <div className="flex items-baseline justify-between gap-4">
            <p className="font-display text-2xl">{label}</p>
            <p className="font-mono text-sm text-mute tabular-nums">{value}</p>
          </div>
          <label className="mt-5 block">
            <span className="sr-only">Roundness, from {ROUND_MIN} (square corners) to {ROUND_MAX} (extra round). {ROUND_DEFAULT} is the standard look.</span>
            <input
              type="range"
              min={ROUND_MIN}
              max={ROUND_MAX}
              step={5}
              value={value}
              onChange={(e) => set(Number(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-pill bg-white/15 accent-white [&::-webkit-slider-thumb]:size-6 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-pill [&::-webkit-slider-thumb]:bg-paper [&::-moz-range-thumb]:size-6 [&::-moz-range-thumb]:rounded-pill [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-paper"
            />
          </label>
          <div className="mt-2 flex justify-between text-xs text-mute" aria-hidden="true">
            <span>Square</span>
            <span>Standard</span>
            <span>Rounder</span>
          </div>
          <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Presets">
            {ROUND_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                aria-pressed={value === p.value}
                onClick={() => set(p.value, true)}
                className={cn('inline-flex h-10 items-center rounded-pill border px-4 text-sm transition-colors', value === p.value ? 'border-paper bg-paper text-ink' : 'border-line-strong text-paper/70 hover:bg-white/[0.06] hover:text-paper')}
              >
                {p.label}
              </button>
            ))}
          </div>
          <p role="status" aria-live="polite" className="mt-5 flex min-h-6 items-center gap-2 text-sm text-mute">
            {state === 'saving' && (
              <>
                <Loader2 aria-hidden="true" className="size-4 animate-spin" /> Saving
              </>
            )}
            {state === 'saved' && (
              <>
                <Check aria-hidden="true" className="size-4 text-emerald-400" /> Saved. Everyone sees it now.
              </>
            )}
            {state === 'idle' && value !== saved.current && 'Changing…'}
            {state === 'error' && <span className="text-signal">{error}</span>}
          </p>
        </div>

        {/* what the setting changes, drawn with the site's own classes */}
        <div aria-hidden="true" className="grid content-start gap-4 rounded-[calc(1.5rem*var(--round,1))] border border-line bg-ink/60 p-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex h-11 items-center rounded-pill bg-paper px-6 text-[15px] font-medium text-ink">Start earning</span>
            <span className="inline-flex h-11 items-center rounded-pill border border-line-strong px-6 text-[15px]">See campaigns</span>
            <span className="inline-flex h-8 items-center rounded-pill border border-line-strong px-3 text-[13px] text-mute">TikTok</span>
          </div>
          <div className="flex h-12 items-center rounded-pill border border-line-strong px-5 text-[15px] text-mute">Search for a campaign</div>
          <div className="flex items-center gap-4 rounded-3xl border border-line-strong bg-white/[0.04] p-4">
            <span className="grid size-14 shrink-0 place-items-center rounded-pill bg-paper/90 font-display text-xl text-ink">L</span>
            <span className="min-w-0">
              <span className="block font-display text-xl leading-tight">Midnight Run</span>
              <span className="block text-sm text-mute">Luna Ray · $2.50 per 1K</span>
            </span>
          </div>
          <div className="flex gap-3">
            <span className="block aspect-square w-1/3 rounded-[calc(22px*var(--round,1))] bg-gradient-to-br from-white/30 to-white/5" />
            <span className="block aspect-square w-1/3 rounded-[calc(22px*var(--round,1))] bg-gradient-to-br from-white/20 to-white/5" />
            <span className="block aspect-square w-1/3 rounded-[calc(22px*var(--round,1))] bg-gradient-to-br from-white/10 to-white/[0.03]" />
          </div>
        </div>
      </div>
    </section>
  )
}
