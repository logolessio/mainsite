'use client'

import { Ban, Binary, Bug, Check, CircleDot, CloudRain, Droplets, Film, Flame, Flower2, Leaf, PartyPopper, Rocket, Snowflake, Sparkles, Star, Sun, Tv, Waves, Wind, Zap, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export const EFFECT_ICONS: Record<string, LucideIcon> = { none: Ban, snow: Snowflake, rain: CloudRain, embers: Flame, sparkle: Sparkles, stars: Star, aurora: Waves, fireflies: Bug, petals: Flower2, bubbles: CircleDot, lightning: Zap, smoke: Wind, leaves: Leaf, confetti: PartyPopper, fireworks: Rocket, rays: Sun, caustics: Droplets, code: Binary, film: Film, vhs: Tv }

/** The effects, grouped by what they feel like, so twenty choices read as five. */
const GROUPS: { title: string; ids: string[] }[] = [
  { title: 'Weather and water', ids: ['snow', 'rain', 'lightning', 'smoke', 'caustics', 'bubbles'] },
  { title: 'Sky and light', ids: ['stars', 'aurora', 'rays', 'sparkle', 'fireflies', 'embers'] },
  { title: 'Seasons and party', ids: ['petals', 'leaves', 'confetti', 'fireworks'] },
  { title: 'Retro screen', ids: ['code', 'film', 'vhs'] },
]

// ---------- the little scenes ----------
// Each effect is drawn as a small still made of plain CSS gradients (no canvas and no script, so twenty of them cost nothing). The pattern is one tile that
// repeats, and when the tile is hovered or chosen it drifts by exactly one tile, so the loop has no seam.
const dot = (x: number, y: number, r: number, c: string) => `radial-gradient(circle at ${x}% ${y}%,${c} 0,${c} ${r}px,transparent ${r + 1.4}px)`
const glow = (x: number, y: number, r: number, c: string, halo: string) => `radial-gradient(circle at ${x}% ${y}%,${c} 0,${c} ${r}px,${halo} ${r + 1}px,transparent ${r + 9}px)`
const ring = (x: number, y: number, r: number, c: string) => `radial-gradient(circle at ${x}% ${y}%,transparent 0,transparent ${r - 1}px,${c} ${r}px,${c} ${r + 0.8}px,transparent ${r + 1.6}px)`
const blob = (x: number, y: number, w: number, h: number, c: string) => `radial-gradient(ellipse ${w}px ${h}px at ${x}% ${y}%,${c},transparent)`
const piece = (x: number, y: number, c: string) => `radial-gradient(ellipse 4.5px 2.6px at ${x}% ${y}%,${c} 94%,transparent 100%)`

type Scene = { bg: string; pattern: string[]; size: [number, number]; drift: [number, number] }
const SCENES: Record<string, Scene> = {
  snow: { bg: 'linear-gradient(180deg,#22344d,#0c1422)', pattern: [dot(20, 22, 1.6, '#fff'), dot(68, 48, 1.2, 'rgb(255 255 255/.85)'), dot(42, 80, 1.9, '#fff'), dot(88, 12, 1, 'rgb(255 255 255/.7)')], size: [56, 56], drift: [0, 1] },
  rain: { bg: 'linear-gradient(180deg,#1a2535,#0a0f18)', pattern: ['linear-gradient(100deg,transparent 40%,rgb(160 200 255/.55) 44%,transparent 48%)'], size: [30, 34], drift: [0, 1] },
  lightning: { bg: 'linear-gradient(180deg,#232842,#07080f)', pattern: ['linear-gradient(112deg,transparent 47%,rgb(225 235 255/.95) 48%,rgb(160 180 255/.5) 49.5%,transparent 52%)', 'linear-gradient(112deg,transparent 20%,rgb(255 255 255/.08) 21%,transparent 24%)'], size: [64, 64], drift: [1, 0] },
  smoke: { bg: 'linear-gradient(180deg,#2a2a2e,#0d0d10)', pattern: [blob(30, 75, 34, 26, 'rgb(255 255 255/.2)'), blob(78, 40, 38, 30, 'rgb(255 255 255/.15)'), blob(52, 12, 30, 22, 'rgb(255 255 255/.12)')], size: [96, 96], drift: [0, -1] },
  stars: { bg: 'radial-gradient(120% 100% at 50% 110%,#232c6b,#06071a 70%)', pattern: [dot(14, 20, 0.9, '#fff'), dot(40, 60, 1.2, '#cfe0ff'), dot(72, 30, 0.8, '#fff'), dot(86, 78, 1.1, '#ffe9c7'), dot(58, 90, 0.7, '#fff'), dot(28, 44, 0.6, '#fff')], size: [64, 64], drift: [1, 0] },
  aurora: { bg: 'linear-gradient(180deg,#071a2b,#04080f)', pattern: ['linear-gradient(100deg,transparent 10%,rgb(70 255 170/.5) 38%,rgb(140 90 255/.45) 62%,transparent 90%)'], size: [160, 100], drift: [1, 0] },
  rays: { bg: 'linear-gradient(180deg,#1d1a0d,#080806)', pattern: ['linear-gradient(105deg,transparent 30%,rgb(255 238 170/.3) 50%,transparent 70%)'], size: [48, 48], drift: [1, 0] },
  sparkle: { bg: 'linear-gradient(135deg,#34204f,#120c1e)', pattern: [glow(24, 28, 0.9, '#fff', 'rgb(255 255 255/.4)'), glow(70, 66, 1.2, '#ffd2ff', 'rgb(255 200 255/.4)'), glow(86, 18, 0.8, '#fff', 'rgb(255 255 255/.35)'), glow(40, 88, 1, '#cfe9ff', 'rgb(200 230 255/.4)')], size: [48, 48], drift: [1, 1] },
  fireflies: { bg: 'linear-gradient(180deg,#0e2013,#050a06)', pattern: [glow(28, 40, 1.6, '#eaff7d', 'rgb(234 255 125/.45)'), glow(70, 24, 1.3, '#f6ff9a', 'rgb(246 255 154/.4)'), glow(52, 78, 1.8, '#d9ff66', 'rgb(217 255 102/.4)')], size: [72, 72], drift: [0, -1] },
  petals: { bg: 'linear-gradient(180deg,#43202f,#160b12)', pattern: [piece(26, 28, '#ffb6d4'), piece(70, 52, '#ff9cc4'), piece(46, 86, '#ffd0e4')], size: [64, 64], drift: [0, 1] },
  leaves: { bg: 'linear-gradient(180deg,#3e2511,#150c05)', pattern: [piece(24, 30, '#e8742a'), piece(68, 62, '#c44a1d'), piece(48, 90, '#f0a23a')], size: [64, 64], drift: [0, 1] },
  bubbles: { bg: 'linear-gradient(180deg,#123b4f,#06151d)', pattern: [ring(30, 62, 4, 'rgb(170 230 255/.8)'), ring(72, 34, 6, 'rgb(170 230 255/.7)'), ring(52, 86, 3, 'rgb(170 230 255/.8)')], size: [72, 72], drift: [0, -1] },
  caustics: { bg: 'linear-gradient(180deg,#0d4455,#04202a)', pattern: [blob(30, 32, 36, 12, 'rgb(170 245 255/.32)'), blob(72, 70, 32, 10, 'rgb(170 245 255/.26)'), blob(56, 10, 26, 8, 'rgb(170 245 255/.2)')], size: [96, 64], drift: [1, 0] },
  confetti: { bg: 'linear-gradient(135deg,#231a3d,#0b0914)', pattern: [dot(18, 24, 2, '#ff5c7a'), dot(62, 14, 1.8, '#ffd23f'), dot(84, 52, 2, '#4da3ff'), dot(36, 66, 1.8, '#52e0a0'), dot(70, 88, 2, '#ff8be0'), dot(10, 86, 1.6, '#ffd23f')], size: [72, 72], drift: [0, 1] },
  fireworks: { bg: 'linear-gradient(180deg,#0b1030,#04050c)', pattern: [ring(30, 36, 12, 'rgb(255 110 140/.7)'), dot(30, 36, 1.6, '#fff'), ring(74, 62, 9, 'rgb(110 200 255/.7)'), dot(74, 62, 1.4, '#fff')], size: [96, 96], drift: [0, -1] },
  embers: { bg: 'linear-gradient(0deg,#4a1606,#0f0604)', pattern: [glow(30, 70, 1.4, '#ffa13d', 'rgb(255 140 40/.4)'), glow(74, 34, 1.1, '#ffd27a', 'rgb(255 200 90/.35)'), glow(48, 10, 1.3, '#ff7a2e', 'rgb(255 120 40/.35)')], size: [56, 56], drift: [0, -1] },
  code: { bg: 'linear-gradient(180deg,#05190c,#020805)', pattern: ['linear-gradient(90deg,transparent 0,transparent 5px,rgb(70 255 130/.7) 5px,rgb(70 255 130/.7) 7px,transparent 7px)', 'linear-gradient(0deg,transparent 0,transparent 12px,rgb(2 8 5/.85) 12px,rgb(2 8 5/.85) 20px,transparent 20px)'], size: [28, 40], drift: [0, 1] },
  film: { bg: 'linear-gradient(180deg,#3a3126,#16120d)', pattern: ['linear-gradient(90deg,transparent 30%,rgb(255 245 220/.5) 31%,transparent 33%)', dot(70, 40, 1, 'rgb(255 245 220/.6)'), dot(18, 78, 0.8, 'rgb(255 245 220/.5)')], size: [60, 60], drift: [1, 0] },
  vhs: { bg: 'linear-gradient(180deg,#201347,#0a0615)', pattern: ['repeating-linear-gradient(0deg,rgb(255 255 255/.08) 0 1px,transparent 1px 4px)', 'linear-gradient(180deg,transparent 38%,rgb(255 70 130/.4) 44%,rgb(70 210 255/.35) 50%,transparent 56%)'], size: [64, 64], drift: [0, 1] },
}
const PLAIN: Scene = { bg: 'linear-gradient(180deg,#26262b,#0f0f12)', pattern: [], size: [40, 40], drift: [0, 0] }

function EffectTile({ id, label, on, onPick }: { id: string; label: string; on: boolean; onPick: (id: string) => void }) {
  const scene = SCENES[id] ?? PLAIN
  const Icon = EFFECT_ICONS[id] ?? Ban
  return (
    <button
      type="button"
      onClick={() => onPick(id)}
      aria-pressed={on}
      data-keep-theme
      className={cn(
        'fx-tile group relative aspect-[5/4] overflow-hidden rounded-panel text-left outline-none transition-[transform,box-shadow] duration-300',
        on ? 'shadow-[0_12px_28px_-12px_rgb(0_0_0/0.95)] ring-2 ring-paper' : 'ring-1 ring-white/12 hover:-translate-y-0.5 hover:ring-white/35',
        'focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d0d0f] focus-visible:ring-[var(--red,#ff1f38)]',
      )}
    >
      <span aria-hidden="true" className="absolute inset-0" style={{ background: scene.bg }} />
      <span
        aria-hidden="true"
        className="fx-pattern absolute inset-0"
        style={{
          backgroundImage: scene.pattern.join(','),
          backgroundSize: `${scene.size[0]}px ${scene.size[1]}px`,
          ['--dx' as string]: `${scene.drift[0] * scene.size[0]}px`,
          ['--dy' as string]: `${scene.drift[1] * scene.size[1]}px`,
        }}
      />
      <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
      <Icon aria-hidden="true" className="absolute top-2 left-2 size-4 text-white/85 transition-transform duration-300 group-hover:scale-110" />
      {on && (
        <span aria-hidden="true" className="absolute top-2 right-2 grid size-5 place-items-center rounded-full bg-paper text-ink shadow-[0_2px_8px_rgb(0_0_0/0.5)]">
          <Check className="size-3" strokeWidth={3.2} />
        </span>
      )}
      <span className={cn('absolute inset-x-2.5 bottom-2 text-[12px] leading-tight text-white', on && 'font-medium')}>{label}</span>
    </button>
  )
}

/**
 * The effects to choose from, for the card and for the page overlay: a row to switch them off, then the effects in groups, each as a small picture of
 * what it looks like that drifts while you point at it or have it chosen.
 */
export function EffectPicker({ value, onChange, options }: { value: string; onChange: (id: string) => void; options: readonly { id: string; label: string }[] }) {
  const label = (id: string) => options.find((o) => o.id === id)?.label ?? id
  const have = new Set(options.map((o) => o.id))
  const grouped = new Set(GROUPS.flatMap((g) => g.ids))
  const rest = options.filter((o) => o.id !== 'none' && !grouped.has(o.id)).map((o) => o.id)
  const groups = [...GROUPS, ...(rest.length ? [{ title: 'More', ids: rest }] : [])]
  return (
    <div className="grid gap-5">
      {have.has('none') && (
        <button
          type="button"
          onClick={() => onChange('none')}
          aria-pressed={value === 'none'}
          className={cn(
            'flex h-11 items-center gap-2.5 rounded-panel border px-3.5 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--red,#ff1f38)]',
            value === 'none' ? 'border-paper bg-paper/10 text-paper' : 'border-dashed border-line-strong text-mute hover:border-paper/40 hover:text-paper',
          )}
        >
          <Ban aria-hidden="true" className="size-4" /> No effect
          {value === 'none' && <Check aria-hidden="true" className="ml-auto size-4" />}
        </button>
      )}
      {groups.map((g) => {
        const ids = g.ids.filter((id) => have.has(id))
        if (!ids.length) return null
        return (
          <div key={g.title}>
            <p className="mb-2.5 text-[13px] text-mute">{g.title}</p>
            <div className={cn('grid gap-2.5', ids.length % 3 === 0 ? 'grid-cols-3' : 'grid-cols-2')}>
              {ids.map((id) => (
                <EffectTile key={id} id={id} label={label(id)} on={value === id} onPick={onChange} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
