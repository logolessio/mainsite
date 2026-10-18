'use client'

import { Check } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { CoverSlide, COVER_IMG } from '@/components/browse/cover-slide'
import { DesignProvider, useDesign } from '@/components/shell/design-provider'
import { COVER_TEXT, LAYOUTS, type ChoiceKey, type CoverText, type LayoutId } from '@/lib/design-choices'
import { FONTS } from '@/lib/fonts'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'

async function save(key: ChoiceKey, value: string) {
  const res = await fetch('/api/dev/settings', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ key, value }) }).catch(() => null)
  if (!res?.ok) throw new Error(((await res?.json().catch(() => ({}))) as { error?: string })?.error ?? 'Could not save that.')
}

const SAMPLES = [
  { cover: '/covers/01.jpg', title: 'Red Room', creator: 'KXNG VALE', rate: 3 },
  { cover: '/covers/04.jpg', title: 'Static Bloom', creator: 'Mira Lane', rate: 2.5 },
  { cover: '/covers/07.jpg', title: 'Night Drive', creator: 'Okoro', rate: 4 },
]

/** Three sample covers wearing the chosen text. They always show the text, so the choice of when it shows is described in words instead. */
function Preview({ cover }: { cover: CoverText }) {
  const base = useDesign()
  return (
    <DesignProvider value={{ ...base, cover: { ...cover, show: 'always' } }}>
      <ul className="grid grid-cols-3 gap-3 md:gap-5" aria-label="Preview of the cover text">
        {SAMPLES.map((s) => (
          <li key={s.title} className="group/tile relative aspect-square w-full overflow-hidden rounded-[calc(22px*var(--round,1))] bg-surface shadow-[0_14px_30px_-18px_rgb(0_0_0/0.9)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.cover} alt="" className={`absolute inset-0 h-full w-full scale-[1.07] object-cover ${COVER_IMG}`} />
            <CoverSlide title={s.title} creator={s.creator} rate={s.rate} />
          </li>
        ))}
      </ul>
    </DesignProvider>
  )
}

function Segmented({ label, hint, value, options, onPick, busy }: { label: string; hint: string; value: string; options: { value: string; label: string }[]; onPick: (v: string) => void; busy: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-4">
      <div className="max-w-md">
        <p className="text-sm">{label}</p>
        <p className="text-xs text-mute">{hint}</p>
      </div>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1 rounded-pill border border-line p-1">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            disabled={busy}
            onClick={() => onPick(o.value)}
            className={cn('h-9 rounded-pill px-4 text-sm transition-colors disabled:opacity-60', value === o.value ? 'bg-paper text-ink' : 'text-mute hover:text-paper')}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

const KEY_OF: Record<keyof CoverText, ChoiceKey> = {
  font: 'design_cover_font',
  size: 'design_cover_size',
  case: 'design_cover_case',
  align: 'design_cover_align',
  panel: 'design_cover_panel',
  show: 'design_cover_show',
  meta: 'design_cover_meta',
}

const FIELD_OF = Object.fromEntries(Object.entries(KEY_OF).map(([f, k]) => [k, f])) as Record<ChoiceKey, keyof CoverText>

/** The text on a campaign cover: typeface, size, letters, alignment, panel, when it shows, and the line under the name. Saves as soon as one is picked. */
export function CoverTextDesigner({ initial }: { initial: CoverText }) {
  const router = useRouter()
  const [v, setV] = useState(initial)
  const [busy, setBusy] = useState(false)

  const set = async (field: keyof CoverText, value: string) => {
    if (v[field] === value) return
    const before = v
    setV({ ...v, [field]: value })
    setBusy(true)
    try {
      await save(KEY_OF[field], value)
      router.refresh()
    } catch (e) {
      setV(before)
      toast.error(e instanceof Error ? e.message : 'Could not save that.')
    }
    setBusy(false)
  }

  return (
    <div className="grid gap-6">
      <Preview cover={v} />
      <div className="divide-y divide-line">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 pb-4">
          <div className="max-w-md">
            <label htmlFor="cover-font" className="text-sm">
              Typeface of the name
            </label>
            <p className="text-xs text-mute">Any typeface of the site, or the same headline face as the rest of the site.</p>
          </div>
          <select
            id="cover-font"
            value={v.font}
            disabled={busy}
            onChange={(e) => set('font', e.target.value)}
            className="h-10 min-w-56 rounded-pill border border-line-strong bg-ink px-4 text-sm text-paper focus:outline-none disabled:opacity-60"
          >
            <option value="site">Same as the site headlines</option>
            {(['serif', 'sans', 'mono'] as const).map((k) => (
              <optgroup key={k} label={k === 'serif' ? 'Serif' : k === 'sans' ? 'Sans' : 'Mono'}>
                {FONTS.filter((f) => f.kind === k).map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        {COVER_TEXT.map((c) => (
          <Segmented key={c.key} label={c.label} hint={c.hint} options={c.options} busy={busy} value={v[FIELD_OF[c.key]]} onPick={(val) => set(FIELD_OF[c.key], val)} />
        ))}
      </div>
    </div>
  )
}

/** A tiny drawing of how a layout arranges the covers. */
function Sketch({ id }: { id: LayoutId }) {
  const sq = 'rounded-[3px] bg-paper/35'
  if (id === 'list')
    return (
      <div className="mx-auto grid w-28 gap-1.5" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-1.5 rounded-[4px] border border-paper/15 p-1">
            <span className={cn(sq, 'size-4 shrink-0')} />
            <span className="h-1.5 flex-1 rounded-full bg-paper/25" />
            <span className="h-1.5 w-4 rounded-full bg-paper/25" />
          </div>
        ))}
      </div>
    )
  const cols = id === 'large' ? 3 : id === 'compact' ? 6 : 4
  const count = id === 'large' ? 6 : id === 'compact' ? 18 : id === 'mosaic' ? 9 : 8
  return (
    <div className="mx-auto grid w-28 gap-1.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gridAutoFlow: id === 'mosaic' ? 'dense' : 'row' }} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className={cn(sq, 'aspect-square', id === 'mosaic' && i === 0 && 'col-span-2 row-span-2')} />
      ))}
    </div>
  )
}

/** How the campaigns are laid out on the browse page. */
export function LayoutPicker({ initial }: { initial: LayoutId }) {
  const router = useRouter()
  const [v, setV] = useState<LayoutId>(initial)
  const [busy, setBusy] = useState(false)

  const pick = async (id: LayoutId) => {
    if (id === v) return
    const before = v
    setV(id)
    setBusy(true)
    try {
      await save('design_layout', id)
      router.refresh()
    } catch (e) {
      setV(before)
      toast.error(e instanceof Error ? e.message : 'Could not save that.')
    }
    setBusy(false)
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Layout of the campaigns">
      {LAYOUTS.map((l) => {
        const on = v === l.value
        return (
          <li key={l.value}>
            <button
              type="button"
              aria-pressed={on}
              disabled={busy}
              onClick={() => pick(l.value as LayoutId)}
              className={cn('relative flex h-full w-full flex-col gap-4 rounded-[calc(1.4rem*var(--round,1))] border p-4 text-left transition-colors disabled:opacity-70', on ? 'border-paper bg-white/[0.05]' : 'border-line hover:border-line-strong hover:bg-white/[0.02]')}
            >
              <span className="flex h-28 items-center justify-center overflow-hidden rounded-[calc(0.9rem*var(--round,1))] bg-black/30 p-3">
                <Sketch id={l.value as LayoutId} />
              </span>
              <span>
                <span className="flex items-center gap-2 text-[17px]">
                  {l.label}
                  {on && (
                    <span className="inline-flex h-6 items-center gap-1 rounded-pill bg-paper px-2.5 text-[11px] text-ink">
                      <Check className="size-3" aria-hidden="true" /> In use
                    </span>
                  )}
                </span>
                <span className="mt-1 block text-[13px] text-paper/50">{l.hint}</span>
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
