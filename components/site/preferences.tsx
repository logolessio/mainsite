'use client'

import { Check, Trash2 } from 'lucide-react'
import { type CSSProperties, useEffect, useState, useSyncExternalStore } from 'react'
import { type CalmChoice, clearCalmChoice, getCalmChoice, setCalm, subscribeCalm } from '@/lib/calm'
import { cn } from '@/lib/utils'
import { clearStored, getPrefs, listStored, serverPrefs, setPrefs, type StoredItem, subscribePrefs } from '@/lib/visitor-prefs'

function Toggle({ on, set, label, hint }: { on: boolean; set: (v: boolean) => void; label: string; hint: string }) {
  return (
    <div className="flex items-start justify-between gap-6 border-t border-white/10 py-5">
      <div>
        <p className="text-[0.92rem]">{label}</p>
        <p className="mt-1 text-[0.8rem] leading-snug text-white/50">{hint}</p>
      </div>
      <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => set(!on)} className={cn('relative mt-1 h-6 w-10 shrink-0 border transition-colors', on ? 'border-white bg-white' : 'border-white/30')}>
        <span className={cn('absolute top-[3px] size-4 transition-all duration-300', on ? 'left-[19px] bg-black' : 'left-[3px] bg-white/60')} />
      </button>
    </div>
  )
}

const size = (b: number) => (b >= 1024 ? `${(b / 1024).toFixed(1)} KB` : `${b} B`)

export function PreferencesView() {
  const prefs = useSyncExternalStore(subscribePrefs, getPrefs, serverPrefs)
  const [calm, setCalmState] = useState<CalmChoice>('auto')
  const [stored, setStored] = useState<StoredItem[]>([])
  const [cleared, setCleared] = useState(false)
  const [saved, setSaved] = useState(false)
  useEffect(() => {
    const read = () => setCalmState(getCalmChoice())
    read()
    return subscribeCalm(read)
  }, [])
  useEffect(() => {
    void listStored().then(setStored)
  }, [prefs, calm, cleared])
  const flash = () => {
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1200)
  }
  const patch = (p: Parameters<typeof setPrefs>[0]) => (setPrefs(p), flash())

  return (
    <>
      <p aria-live="polite" className={cn('cap fixed right-5 bottom-5 z-50 inline-flex items-center gap-2 bg-white px-3 py-2 text-black transition-opacity', saved ? 'opacity-100' : 'opacity-0')}>
        <Check className="size-3.5" /> saved on this device
      </p>

      <section className="mt-14">
        <h2 className="cap text-white/40">motion</h2>
        <div className="mt-4">
          <p className="text-[0.92rem]">less motion</p>
          <p className="mt-1 text-[0.8rem] text-white/50">turns off floating, particles, shaders that move, parallax and looping animation on every page.</p>
          <div role="radiogroup" aria-label="less motion" className="mt-4 grid grid-cols-3 border border-white/20 p-0.5">
            {(
              [
                ['auto', 'follow my device'],
                ['on', 'on'],
                ['off', 'off'],
              ] as const
            ).map(([id, name]) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={calm === id}
                onClick={() => {
                  if (id === 'auto') clearCalmChoice()
                  else setCalm(id === 'on')
                  setCalmState(id)
                  flash()
                }}
                className={cn('h-10 text-[0.8rem] transition-colors', calm === id ? 'bg-white text-black' : 'text-white/60 hover:text-white')}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-6">
          <Toggle on={prefs.noVisualisers} set={(v) => patch({ noVisualisers: v })} label="hide music visualisers" hint="the bars, waves and circles some pages draw to their music." />
          <Toggle on={prefs.plainCursor} set={(v) => patch({ plainCursor: v })} label="use my normal pointer" hint="ignore the custom cursors and cursor trails pages choose." />
        </div>
      </section>

      <section className="mt-14">
        <h2 className="cap text-white/40">music</h2>
        <div className="mt-4">
          <Toggle on={prefs.autoplay} set={(v) => patch({ autoplay: v })} label="let music start by itself" hint="off: a page's song waits until you press its play button." />
          <div className="border-t border-white/10 py-5">
            <div className="flex items-baseline justify-between">
              <p className="text-[0.92rem]">loudest music can be</p>
              <span className="text-[0.8rem] tabular-nums text-white/50">{prefs.volume}%</span>
            </div>
            <p className="mt-1 text-[0.8rem] text-white/50">of what each page asks for. 0 mutes every page.</p>
            <div className="ed mt-4">
              <input type="range" min={0} max={100} value={prefs.volume} aria-label="Loudest music can be" onChange={(e) => setPrefs({ volume: Number(e.target.value) })} onPointerUp={flash} style={{ '--p': `${prefs.volume}%` } as CSSProperties} />
            </div>
          </div>
        </div>
        <p className="mt-2 text-[0.78rem] text-white/40">on any page with music, M mutes it.</p>
      </section>

      <section className="mt-14">
        <h2 className="cap text-white/40">data on this device</h2>
        <p className="mt-4 text-[0.86rem] leading-relaxed text-white/60">
          logoless keeps a few small things in this browser so pages behave the way you set them. none of it is sent to us. clearing it puts every choice above back to the start; it doesn&apos;t log you out (do that from the editor).
        </p>
        <ul className="mt-6 border-b border-white/10 text-[0.84rem]">
          {stored.length === 0 && <li className="border-t border-white/10 py-4 text-white/45">nothing stored.</li>}
          {stored.map((s) => (
            <li key={`${s.where}:${s.key}`} className="flex items-center justify-between gap-4 border-t border-white/10 py-3">
              <span>
                <span className="block">{s.label}</span>
                <code className="text-[0.72rem] text-white/35">{s.key}</code>
              </span>
              <span className="shrink-0 text-[0.74rem] text-white/40">{s.where === 'session' ? 'until you close the tab' : s.where === 'cache' ? 'saved files' : size(s.bytes)}</span>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => {
            void clearStored().then(() => {
              setCalmState('auto')
              setCleared((v) => !v)
              flash()
            })
          }}
          disabled={!stored.length}
          className="btn mt-6 disabled:opacity-30"
        >
          <Trash2 className="size-4" /> clear data on this device
        </button>
        <p className="mt-4 text-[0.78rem] text-white/40">
          more in the <a href="/legal/cookies" className="underline underline-offset-4">cookie &amp; storage policy</a>.
        </p>
      </section>
    </>
  )
}
