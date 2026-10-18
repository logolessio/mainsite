'use client'

import { Check, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { FONTS, type FontDef, type FontKind } from '@/lib/fonts'
import { cn } from '@/lib/utils'

const KINDS: { id: 'all' | FontKind; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'sans', label: 'Sans' },
  { id: 'serif', label: 'Serif' },
  { id: 'mono', label: 'Mono' },
]

const family = (v: string) => `var(${v}), ui-sans-serif, system-ui, sans-serif`

/** Choose the typeface for the whole site. Press a font to preview it big, then press "Use on the whole site". */
export function FontPicker({ current }: { current: string }) {
  const router = useRouter()
  const [applied, setApplied] = useState(current)
  const [preview, setPreview] = useState(current)
  const [kind, setKind] = useState<'all' | FontKind>('all')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const shown = FONTS.filter((f) => kind === 'all' || f.kind === kind)
  const sel = FONTS.find((f) => f.id === preview) ?? FONTS[0]

  const apply = async (f: FontDef) => {
    setBusy(true)
    setError('')
    const res = await fetch('/api/dev/settings', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ key: 'design_font', value: f.id }) }).catch(() => null)
    setBusy(false)
    if (!res?.ok) return setError(((await res?.json().catch(() => ({}))) as { error?: string })?.error ?? 'Could not save that.')
    setApplied(f.id)
    router.refresh()
  }

  return (
    <div className="grid gap-6">
      {/* the big preview: what the chosen font looks like in real use */}
      <section aria-label="Preview" className="overflow-hidden rounded-[calc(2rem*var(--round,1))] border border-line-strong bg-white/[0.03]">
        <div className="p-7 md:p-10" style={{ fontFamily: family(sel.body) }}>
          <p className="text-[13px] text-paper/50">
            {sel.label} · {sel.note}
          </p>
          <p className="mt-5 text-[clamp(2.6rem,6vw,4.4rem)] leading-[1.02] tracking-[-0.03em]" style={{ fontFamily: family(sel.display), fontWeight: sel.kind === 'mono' ? 500 : 400 }}>
            Get paid for the clips you cut.
          </p>
          <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-paper/65">Join a campaign, post your clip, and earn for every 1,000 verified views. No followers needed and no fee to join.</p>
          <div className="mt-7 flex flex-wrap items-center gap-x-10 gap-y-4">
            {[
              ['$1,250.00', 'Earned'],
              ['48,200', 'Verified views'],
              ['12', 'Clips'],
            ].map(([v, k]) => (
              <div key={k}>
                <p className="text-3xl leading-none tracking-[-0.02em] tabular-nums" style={{ fontFamily: family(sel.display) }}>
                  {v}
                </p>
                <p className="mt-1.5 text-[13px] text-paper/50">{k}</p>
              </div>
            ))}
            <span className="inline-flex h-11 items-center rounded-pill bg-paper px-6 text-[15px] font-medium text-ink">Start earning</span>
          </div>
          <p className="mt-7 break-words text-sm leading-relaxed text-paper/40">ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789 &amp; ! ? @ # $ %</p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-7 py-4 md:px-10">
          <p className="text-sm text-paper/55">{applied === sel.id ? `${sel.label} is the font on the site right now.` : `The site is set in ${FONTS.find((f) => f.id === applied)?.label ?? 'Inter'}.`}</p>
          <div className="flex items-center gap-3">
            {error && <span role="alert" className="text-sm text-signal">{error}</span>}
            <button
              type="button"
              disabled={busy || applied === sel.id}
              onClick={() => apply(sel)}
              className="inline-flex h-11 items-center gap-2 rounded-pill bg-paper px-6 text-[15px] font-medium text-ink transition-colors hover:bg-paper/85 disabled:bg-white/10 disabled:text-paper/50"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : applied === sel.id ? <Check className="size-4" /> : null}
              {applied === sel.id ? 'In use' : 'Use on the whole site'}
            </button>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-pill border border-line p-1" role="tablist" aria-label="Kind of font">
          {KINDS.map((k) => (
            <button key={k.id} role="tab" type="button" aria-selected={kind === k.id} onClick={() => setKind(k.id)} className={cn('h-9 rounded-pill px-4 text-sm transition-colors', kind === k.id ? 'bg-paper text-ink' : 'text-mute hover:text-paper')}>
              {k.label}
            </button>
          ))}
        </div>
        {applied !== 'inter' && (
          <button type="button" disabled={busy} onClick={() => apply(FONTS[0])} className="text-sm text-paper/50 underline underline-offset-4 hover:text-paper disabled:opacity-40">
            Back to the standard font
          </button>
        )}
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Fonts">
        {shown.map((f) => {
          const isApplied = applied === f.id
          const isPreview = preview === f.id
          return (
            <li key={f.id}>
              <button
                type="button"
                aria-pressed={isPreview}
                onClick={() => setPreview(f.id)}
                className={cn('group relative flex h-full w-full flex-col rounded-[calc(1.6rem*var(--round,1))] border p-5 text-left transition-colors', isPreview ? 'border-paper bg-white/[0.05]' : 'border-line hover:border-line-strong hover:bg-white/[0.02]')}
              >
                <span className="text-[3.4rem] leading-none tracking-[-0.03em]" style={{ fontFamily: family(f.display), fontWeight: f.kind === 'mono' ? 500 : 400 }} aria-hidden="true">
                  Aa
                </span>
                <span className="mt-5 text-[17px] leading-tight" style={{ fontFamily: family(f.body) }}>
                  {f.label}
                </span>
                <span className="mt-1 text-[13px] text-paper/45">
                  {f.note}
                </span>
                <span className="mt-4 truncate text-[13px] text-paper/60" style={{ fontFamily: family(f.body) }}>
                  The quick brown fox jumps
                </span>
                <span className="absolute top-4 right-4 flex items-center gap-2 text-[11px] text-paper/45">
                  {f.kind}
                  {isApplied && (
                    <span className="inline-flex h-6 items-center gap-1 rounded-pill bg-paper px-2.5 text-ink">
                      <Check className="size-3" aria-hidden="true" /> In use
                    </span>
                  )}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
