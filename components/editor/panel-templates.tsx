'use client'

import { Check } from 'lucide-react'
import { type CSSProperties, useState } from 'react'
import { type BioPreset, PRESETS, applyPreset, grey, hexLum } from '@/lib/bio'
import { cn } from '@/lib/utils'
import type { EditorApi } from './types'
import { Group } from './ui'

type Hues = { bg: string; bg2: string; text: string; accent: string; accent2: string }

/** A small picture of a look, drawn from its own colours (nothing is loaded or animated, so a long list of them costs nothing). */
function Mock({ p, name }: { p: BioPreset; name: string }) {
  const c = p.set.colors as Hues | undefined
  const theme = (p.set.theme ?? {}) as { tone?: number; nameStyle?: string; buttons?: string; radius?: number }
  const kind = (p.set.bg as { kind?: string } | undefined)?.kind
  const tone = theme.tone ?? p.swatch[0]
  const text = c?.text ?? (tone > 55 ? '#0a0a0a' : '#f7f7f7')
  const accent = c?.accent ?? text
  const accent2 = c?.accent2 ?? text
  const on = c ? (hexLum(accent) > 0.5 ? '#0a0a0a' : '#ffffff') : tone > 55 ? '#f7f7f7' : '#0a0a0a'
  const bg: CSSProperties = c
    ? {
        background:
          kind === 'glow'
            ? `radial-gradient(110% 62% at 50% 118%, ${accent2} 0%, ${accent} 30%, transparent 64%), ${c.bg}`
            : kind === 'gradient' || kind === 'shader' || kind === 'effect'
              ? `radial-gradient(60% 45% at 20% 18%, ${accent}88, transparent 70%), radial-gradient(55% 50% at 85% 30%, ${accent2}66, transparent 70%), linear-gradient(165deg, ${c.bg}, ${c.bg2})`
              : c.bg,
      }
    : { background: grey(tone) }
  const nameStyle: CSSProperties =
    theme.nameStyle === 'gradient' && c
      ? { backgroundImage: `linear-gradient(100deg, ${accent}, ${accent2})`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }
      : (theme.nameStyle === 'glow' || theme.nameStyle === 'neon') && c
        ? { color: text, textShadow: `0 0 8px ${accent}, 0 0 20px ${accent}99` }
        : { color: text }
  const r = Math.min(14, theme.radius ?? 8)
  const bar = (i: number): CSSProperties => {
    const b = theme.buttons
    if (b === 'solid') return { background: accent, color: on }
    if (b === 'outline') return { border: `1px solid ${accent}99` }
    if (b === 'brutal') return { border: `2px solid ${accent}`, boxShadow: `3px 3px 0 ${accent}` }
    if (b === 'underline') return { borderBottom: `1px solid ${accent}66`, borderRadius: 0 }
    return { background: `${text}14`, border: `1px solid ${text}26` }
  }
  return (
    <div className="relative aspect-[4/5] w-full overflow-hidden" style={bg}>
      <div className="absolute inset-x-0 top-[16%] flex flex-col items-center px-5 text-center">
        <span className="size-9 rounded-full border" style={{ borderColor: `${text}55`, background: `${text}1a` }} />
        <p className="mt-2.5 text-[1.05rem] leading-none font-semibold tracking-tight" style={nameStyle}>
          {name}
        </p>
        <div className="mt-4 grid w-full gap-1.5">
          {[0, 1, 2].map((i) => (
            <span key={i} className="block h-[1.35rem] w-full" style={{ borderRadius: r, ...bar(i) }} />
          ))}
        </div>
      </div>
    </div>
  )
}

/** One tap sets the colours, background, effects and type. The links, the layout and the words are never touched. */
export function TemplatesPanel({ api }: { api: EditorApi }) {
  const { cfg, set, toast, profile } = api
  const [last, setLast] = useState<string | null>(null)
  const name = (profile.name || profile.handle || 'Your name').slice(0, 14)
  const use = (p: BioPreset) => {
    set((c) => applyPreset(c, p))
    setLast(p.id)
    toast(`${p.name} is on`)
  }
  const coloured = PRESETS.filter((p) => p.set.colors)
  const plain = PRESETS.filter((p) => !p.set.colors)
  const card = (p: BioPreset) => (
    <button key={p.id} type="button" onClick={() => use(p)} aria-pressed={last === p.id} className={cn('group overflow-hidden rounded-2xl border text-left transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-10px_rgb(0_0_0/0.7)]', last === p.id ? 'border-white/60' : 'border-[var(--ed-line)] hover:border-white/30')}>
      <Mock p={p} name={name} />
      <span className="flex items-center justify-between gap-2 border-t border-[var(--ed-line)] bg-[var(--ed-panel)] px-3 py-2.5">
        <span className="min-w-0">
          <span className="block truncate text-[0.8rem]">{p.name}</span>
          <span className="block truncate text-[0.66rem] text-[var(--ed-dim)]">{p.note}</span>
        </span>
        {last === p.id && <Check className="size-3.5 shrink-0" />}
      </span>
    </button>
  )
  return (
    <div>
      <Group title="Coloured" hint={cfg.colors.on ? 'One tap sets the colours, the background, the effects and the type. Your links and layout stay as they are.' : 'One tap switches on colours and sets the background, the effects and the type. Your links and layout stay as they are.'}>
        <div className="grid grid-cols-2 gap-3">{coloured.map(card)}</div>
      </Group>
      <Group title="Black, white and grey">
        <div className="grid grid-cols-2 gap-3">{plain.map(card)}</div>
      </Group>
    </div>
  )
}
